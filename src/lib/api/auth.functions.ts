import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getSupabaseAdmin } from "../supabase.server";
import { isAllowedEmailDomain, type AuthUser } from "../auth/types";
import {
  clearSessionCookie,
  destroySession,
  getUserFromSessionId,
  loginWithCredentials,
  readSessionCookie,
  requireAdmin,
  requireCurrentUser,
  setPasswordAndInvalidateSessions,
  writeSessionCookie,
} from "../auth/session.server";

// Öffentliche Auth-Endpunkte für den Client. Login/Registrieren/Reset sind
// nur mit E-Mail-Adressen zulässig, deren Domain den Bestandteil `zinco` oder
// `holcim` enthält. Diese Prüfung erfolgt zusätzlich zur DB-CHECK-Constraint.

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Bitte eine gültige E-Mail-Adresse eingeben")
  .refine(isAllowedEmailDomain, {
    message: "Nur E-Mail-Adressen mit @zinco oder @holcim sind zugelassen.",
  });

const passwordSchema = z
  .string()
  .min(8, "Passwort muss mindestens 8 Zeichen lang sein")
  .max(128, "Passwort ist zu lang");

/** Login. Setzt den Session-Cookie und liefert den User zurück. */
export const loginFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      email: emailSchema,
      password: z.string().min(1, "Passwort erforderlich"),
    }),
  )
  .handler(async ({ data }): Promise<AuthUser> => {
    const { sessionId, user } = await loginWithCredentials(data.email, data.password);
    writeSessionCookie(sessionId);
    return user;
  });

/** Logout. Löscht Session in DB und Cookie. */
export const logoutFn = createServerFn({ method: "POST" }).handler(async (): Promise<void> => {
  const sessionId = readSessionCookie();
  if (sessionId) await destroySession(sessionId);
  clearSessionCookie();
});

/** Aktuellen User laden — Null wenn nicht angemeldet. */
export const getCurrentUserFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<AuthUser | null> => {
    const sessionId = readSessionCookie();
    if (!sessionId) return null;
    return await getUserFromSessionId(sessionId);
  },
);

/**
 * Account anlegen. Nur zulässig für Adressen mit @zinco / @holcim.
 * Es dürfen keine bestehenden Accounts überschrieben werden.
 *
 * Registrierung ist offen, damit Team-Mitglieder mit einer erlaubten
 * Domain sich selbst einen Zugang anlegen können. Standardrolle ist `user`
 * und die interne Margenansicht ist standardmäßig deaktiviert; der Admin
 * schaltet Rechte im Nutzer-Panel frei.
 */
export const registerFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      email: emailSchema,
      password: passwordSchema,
    }),
  )
  .handler(async ({ data }): Promise<AuthUser> => {
    const supabase = getSupabaseAdmin();

    const { data: existing } = await supabase
      .from("app_users")
      .select("id")
      .eq("email", data.email)
      .limit(1);
    if (existing && existing.length > 0) {
      throw new Error("Für diese E-Mail existiert bereits ein Zugang.");
    }

    const { data: hash, error: hashErr } = await supabase.rpc("bcrypt_hash", {
      p_password: data.password,
    });
    if (hashErr || !hash) throw new Error("Passwort-Hash konnte nicht erzeugt werden");

    const { data: created, error } = await supabase
      .from("app_users")
      .insert({
        email: data.email,
        password_hash: hash,
        role: "user",
        can_view_margin: false,
        is_active: true,
      })
      .select("id,email,role,can_view_margin,is_active")
      .limit(1);
    if (error || !created || created.length === 0) {
      throw new Error(error?.message ?? "Zugang konnte nicht angelegt werden.");
    }
    const row = created[0] as {
      id: string;
      email: string;
      role: "admin" | "user";
      can_view_margin: boolean;
      is_active: boolean;
    };
    return {
      id: row.id,
      email: row.email,
      role: row.role,
      canViewMargin: row.can_view_margin,
      isActive: row.is_active,
    };
  });

/**
 * Passwort zurücksetzen — für den eigenen Account oder als Admin.
 * Der Aufruf ist zulässig, wenn
 *   1. Der angemeldete Nutzer selbst das Passwort ändert (er kennt sein altes Passwort),
 *   2. Der angemeldete Nutzer Admin ist und das Passwort eines anderen Accounts
 *      zurücksetzt (kein altes Passwort nötig).
 * Nach dem Passwortwechsel werden alle anderen aktiven Sessions abgemeldet.
 */
export const resetPasswordFn = createServerFn({ method: "POST" })
  .inputValidator(
    z
      .object({
        email: emailSchema,
        newPassword: passwordSchema,
        oldPassword: z.string().optional(),
      })
      .strict(),
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const supabase = getSupabaseAdmin();
    const sessionId = readSessionCookie();
    const current = sessionId ? await getUserFromSessionId(sessionId) : null;

    const { data: userRows } = await supabase
      .from("app_users")
      .select("id,email,role")
      .eq("email", data.email)
      .limit(1);
    const target = userRows?.[0] as { id: string; email: string; role: "admin" | "user" } | undefined;
    if (!target) throw new Error("Für diese E-Mail existiert kein Zugang.");

    const isSelf = current && current.email === target.email;
    const isAdmin = current && current.role === "admin";
    if (!isSelf && !isAdmin) {
      throw new Error(
        "Passwort-Zurücksetzung ist nur für den eigenen Account oder durch einen Administrator möglich.",
      );
    }
    if (isSelf && !isAdmin) {
      // Selbst-Reset erfordert das alte Passwort zur Bestätigung.
      if (!data.oldPassword) {
        throw new Error("Bitte aktuelles Passwort angeben.");
      }
      const { data: verify, error } = await supabase.rpc("verify_password", {
        p_email: data.email,
        p_password: data.oldPassword,
      });
      if (error) throw new Error("Passwortprüfung fehlgeschlagen");
      const row = Array.isArray(verify) ? verify[0] : verify;
      if (!row) throw new Error("Aktuelles Passwort ist falsch.");
    }
    await setPasswordAndInvalidateSessions(target.id, data.newPassword);
    // Wenn Nutzer sich selbst zurücksetzt: aktuellen Cookie sofort ungültig
    // machen, damit ein Re-Login erzwungen wird.
    if (isSelf) clearSessionCookie();
    return { ok: true };
  });

// -----------------------------------------------------------------------------
// Admin-Endpunkte: Nutzerverwaltung und Rechtevergabe
// -----------------------------------------------------------------------------

export interface AdminUserRow extends AuthUser {
  createdAt: string;
  updatedAt: string;
}

export const listUsersFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<AdminUserRow[]> => {
    await requireAdmin();
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("app_users")
      .select("id,email,role,can_view_margin,is_active,created_at,updated_at")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((row: any) => ({
      id: row.id,
      email: row.email,
      role: row.role,
      canViewMargin: row.can_view_margin,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  },
);

/**
 * Admin: Recht auf interne Margenansicht setzen (an/aus). Wirkt sofort auf
 * bestehende Sessions, da der Client bei jedem Request `getCurrentUserFn`
 * neu lesen sollte.
 */
export const setUserRightsFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      userId: z.string().uuid(),
      canViewMargin: z.boolean(),
    }),
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    await requireAdmin();
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("app_users")
      .update({ can_view_margin: data.canViewMargin, updated_at: new Date().toISOString() })
      .eq("id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Admin: Nutzer aktivieren/deaktivieren. Deaktivierung invalidiert Sessions. */
export const setUserActiveFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      userId: z.string().uuid(),
      isActive: z.boolean(),
    }),
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const admin = await requireAdmin();
    if (admin.id === data.userId && !data.isActive) {
      throw new Error("Du kannst deinen eigenen Admin-Account nicht deaktivieren.");
    }
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("app_users")
      .update({ is_active: data.isActive, updated_at: new Date().toISOString() })
      .eq("id", data.userId);
    if (error) throw new Error(error.message);
    // Bei Deaktivierung Sessions killen.
    if (!data.isActive) {
      await supabase.rpc("bump_token_version", { p_user_id: data.userId });
    }
    return { ok: true };
  });

/** Admin: Rolle setzen (admin/user). */
export const setUserRoleFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      userId: z.string().uuid(),
      role: z.enum(["admin", "user"]),
    }),
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const admin = await requireAdmin();
    if (admin.id === data.userId && data.role !== "admin") {
      throw new Error("Du kannst dir selbst nicht die Admin-Rolle entziehen.");
    }
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("app_users")
      .update({ role: data.role, updated_at: new Date().toISOString() })
      .eq("id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Admin: neuen Account anlegen (ohne dass sich der Nutzer selbst registriert).
 * Der Admin gibt E-Mail + initiales Passwort an; der Nutzer kann später ein
 * eigenes Passwort setzen.
 */
export const adminCreateUserFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      email: emailSchema,
      password: passwordSchema,
      role: z.enum(["admin", "user"]).default("user"),
      canViewMargin: z.boolean().default(false),
    }),
  )
  .handler(async ({ data }): Promise<AdminUserRow> => {
    await requireAdmin();
    const supabase = getSupabaseAdmin();

    const { data: existing } = await supabase
      .from("app_users")
      .select("id")
      .eq("email", data.email)
      .limit(1);
    if (existing && existing.length > 0) {
      throw new Error("Für diese E-Mail existiert bereits ein Zugang.");
    }
    const { data: hash, error: hashErr } = await supabase.rpc("bcrypt_hash", {
      p_password: data.password,
    });
    if (hashErr || !hash) throw new Error("Passwort-Hash konnte nicht erzeugt werden");

    const { data: created, error } = await supabase
      .from("app_users")
      .insert({
        email: data.email,
        password_hash: hash,
        role: data.role,
        can_view_margin: data.canViewMargin,
        is_active: true,
      })
      .select("id,email,role,can_view_margin,is_active,created_at,updated_at")
      .limit(1);
    if (error || !created || created.length === 0) {
      throw new Error(error?.message ?? "Zugang konnte nicht angelegt werden");
    }
    const row = created[0] as any;
    return {
      id: row.id,
      email: row.email,
      role: row.role,
      canViewMargin: row.can_view_margin,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  });

/** Admin: Zugang endgültig löschen. */
export const adminDeleteUserFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ userId: z.string().uuid() }))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const admin = await requireAdmin();
    if (admin.id === data.userId) {
      throw new Error("Du kannst deinen eigenen Account nicht löschen.");
    }
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("app_users").delete().eq("id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Convenience für andere Server-Funktionen: aktuellen User laden oder wirft.
 * Wird von serverseitigen Handlern verwendet, die Zugriff erfordern.
 */
export { requireCurrentUser, requireAdmin };
