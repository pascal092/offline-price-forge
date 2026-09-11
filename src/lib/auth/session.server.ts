import process from "node:process";
import { getCookie, setCookie, deleteCookie } from "@tanstack/react-start/server";
import { getSupabaseAdmin } from "../supabase.server";
import type { AuthUser, Role } from "./types";

// Server-only: Sitzungs- und Passwortlogik gegen die Supabase-Tabellen
// `app_users` und `app_sessions`. Alle Zugriffe laufen über den service_role-Key
// (siehe supabase.server.ts) — RLS auf den Tabellen ist aktiviert und verhindert
// direkten Client-Zugriff.

export const SESSION_COOKIE_NAME = "zinco_session";
const SESSION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 Tage

interface AppUserRow {
  id: string;
  email: string;
  password_hash: string;
  role: Role;
  can_view_margin: boolean;
  is_active: boolean;
  token_version: number;
}

interface AppSessionRow {
  id: string;
  user_id: string;
  token_version: number;
  expires_at: string;
}

function toAuthUser(row: AppUserRow): AuthUser {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    canViewMargin: row.can_view_margin,
    isActive: row.is_active,
  };
}

export function writeSessionCookie(sessionId: string): void {
  setCookie(SESSION_COOKIE_NAME, sessionId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_COOKIE_MAX_AGE_SECONDS,
  });
}

export function clearSessionCookie(): void {
  deleteCookie(SESSION_COOKIE_NAME, { path: "/" });
}

export function readSessionCookie(): string | null {
  return getCookie(SESSION_COOKIE_NAME) ?? null;
}

/**
 * Login: prüft E-Mail und Passwort per bcrypt (`crypt()` in Postgres),
 * legt eine Session an und liefert Session-ID + User zurück.
 * Wirft eine Fehlermeldung ohne Auskunft, ob E-Mail oder Passwort falsch war.
 */
export async function loginWithCredentials(
  email: string,
  password: string,
): Promise<{ sessionId: string; user: AuthUser }> {
  const supabase = getSupabaseAdmin();
  const normalized = email.trim().toLowerCase();

  const { data: rows, error } = await supabase.rpc("verify_password", {
    p_email: normalized,
    p_password: password,
  });
  if (error) throw new Error("Login fehlgeschlagen");
  const row = (Array.isArray(rows) ? rows[0] : rows) as AppUserRow | undefined;
  if (!row || !row.is_active) throw new Error("E-Mail oder Passwort ist falsch");

  const { data: sessRows, error: sessErr } = await supabase
    .from("app_sessions")
    .insert({ user_id: row.id, token_version: row.token_version })
    .select("id")
    .limit(1);
  if (sessErr || !sessRows || sessRows.length === 0) {
    throw new Error("Sitzung konnte nicht erzeugt werden");
  }
  return { sessionId: sessRows[0].id as string, user: toAuthUser(row) };
}

export async function destroySession(sessionId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  await supabase.from("app_sessions").delete().eq("id", sessionId);
}

/**
 * Session validieren und aktuellen User laden. Ungültige oder abgelaufene
 * Sessions liefern `null`. Bei Passwortwechsel wird `token_version` erhöht,
 * dadurch werden alle alten Sessions ungültig.
 */
export async function getUserFromSessionId(sessionId: string): Promise<AuthUser | null> {
  const supabase = getSupabaseAdmin();

  const { data: sessRows, error: sessErr } = await supabase
    .from("app_sessions")
    .select("id,user_id,token_version,expires_at")
    .eq("id", sessionId)
    .limit(1);
  if (sessErr || !sessRows || sessRows.length === 0) return null;
  const session = sessRows[0] as AppSessionRow;
  if (new Date(session.expires_at).getTime() < Date.now()) {
    await supabase.from("app_sessions").delete().eq("id", sessionId);
    return null;
  }

  const { data: userRows, error: userErr } = await supabase
    .from("app_users")
    .select("id,email,password_hash,role,can_view_margin,is_active,token_version")
    .eq("id", session.user_id)
    .limit(1);
  if (userErr || !userRows || userRows.length === 0) return null;
  const user = userRows[0] as AppUserRow;
  if (!user.is_active) return null;
  if (user.token_version !== session.token_version) {
    // Passwort wurde geändert oder Session invalidiert.
    await supabase.from("app_sessions").delete().eq("id", sessionId);
    return null;
  }

  // last_seen aktualisieren (best effort).
  await supabase
    .from("app_sessions")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", sessionId);

  return toAuthUser(user);
}

/**
 * Aktuellen User aus Cookie laden — Convenience für Server-Funktionen.
 */
export async function requireCurrentUser(): Promise<AuthUser> {
  const sessionId = readSessionCookie();
  if (!sessionId) throw new Error("Nicht angemeldet");
  const user = await getUserFromSessionId(sessionId);
  if (!user) throw new Error("Sitzung ungültig oder abgelaufen");
  return user;
}

export async function requireAdmin(): Promise<AuthUser> {
  const user = await requireCurrentUser();
  if (user.role !== "admin") throw new Error("Kein Administrator");
  return user;
}

/**
 * Passwort setzen und dabei alle bestehenden Sessions des Users invalidieren
 * (token_version wird erhöht).
 */
export async function setPasswordAndInvalidateSessions(
  userId: string,
  newPassword: string,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc("bcrypt_hash", { p_password: newPassword });
  if (error || !data) throw new Error("Passwort-Hash konnte nicht erzeugt werden");
  const newHash = data as string;

  const { error: upErr } = await supabase
    .from("app_users")
    .update({
      password_hash: newHash,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
  if (upErr) throw new Error(upErr.message);

  const { error: bumpErr } = await supabase.rpc("bump_token_version", { p_user_id: userId });
  if (bumpErr) throw new Error(bumpErr.message);
}
