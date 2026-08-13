import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Shield, ShieldCheck, ShieldX, UserPlus, Trash2, KeyRound, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  adminCreateUserFn,
  adminDeleteUserFn,
  listUsersFn,
  resetPasswordFn,
  setUserActiveFn,
  setUserRightsFn,
  setUserRoleFn,
  type AdminUserRow,
} from "@/lib/api/auth.functions";
import { isAllowedEmailDomain } from "@/lib/auth/types";

interface AdminPanelProps {
  open: boolean;
  onClose: () => void;
}

export function AdminPanel({ open, onClose }: AdminPanelProps) {
  const { user: current } = useAuth();
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listUsersFn();
      setUsers(rows);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nutzerliste konnte nicht geladen werden");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void refresh();
  }, [open, refresh]);

  if (!open) return null;

  async function onToggleMargin(user: AdminUserRow, next: boolean) {
    try {
      await setUserRightsFn({ data: { userId: user.id, canViewMargin: next } });
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, canViewMargin: next } : u)),
      );
      toast.success(
        next
          ? `Interne Margenansicht für ${user.email} aktiviert`
          : `Interne Margenansicht für ${user.email} deaktiviert`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Änderung fehlgeschlagen");
    }
  }

  async function onToggleActive(user: AdminUserRow, next: boolean) {
    try {
      await setUserActiveFn({ data: { userId: user.id, isActive: next } });
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, isActive: next } : u)));
      toast.success(next ? "Zugang aktiviert" : "Zugang deaktiviert");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Änderung fehlgeschlagen");
    }
  }

  async function onToggleRole(user: AdminUserRow) {
    const nextRole = user.role === "admin" ? "user" : "admin";
    try {
      await setUserRoleFn({ data: { userId: user.id, role: nextRole } });
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, role: nextRole } : u)));
      toast.success(`Rolle geändert auf ${nextRole}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Änderung fehlgeschlagen");
    }
  }

  async function onDelete(user: AdminUserRow) {
    if (!confirm(`Zugang ${user.email} wirklich löschen?`)) return;
    try {
      await adminDeleteUserFn({ data: { userId: user.id } });
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      toast.success("Zugang gelöscht");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Löschen fehlgeschlagen");
    }
  }

  async function onResetPassword(user: AdminUserRow) {
    const pw = prompt(`Neues Passwort für ${user.email} (min. 8 Zeichen):`);
    if (!pw) return;
    if (pw.length < 8) {
      toast.error("Passwort muss mindestens 8 Zeichen lang sein");
      return;
    }
    try {
      await resetPasswordFn({ data: { email: user.email, newPassword: pw } });
      toast.success("Passwort zurückgesetzt; andere Sitzungen abgemeldet.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Zurücksetzen fehlgeschlagen");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/80 backdrop-blur-sm">
      <div className="my-8 w-full max-w-5xl px-4">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Nutzerverwaltung
              </CardTitle>
              <CardDescription>
                Zugänge freischalten, sperren, löschen, Passwort zurücksetzen und Rechte vergeben.
                Nur Adressen mit @zinco oder @holcim sind zulässig.
              </CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            <NewUserForm onCreated={(u) => setUsers((prev) => [...prev, u])} />

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>E-Mail</TableHead>
                    <TableHead>Rolle</TableHead>
                    <TableHead>Aktiv</TableHead>
                    <TableHead>
                      <div className="flex flex-col">
                        <span>Interne Margenansicht</span>
                        <span className="text-xs font-normal text-muted-foreground">
                          Recht auf HVK / DB / Aufschlagsfaktor
                        </span>
                      </div>
                    </TableHead>
                    <TableHead className="text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        Lade …
                      </TableCell>
                    </TableRow>
                  )}
                  {!loading && users.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        Keine Nutzer.
                      </TableCell>
                    </TableRow>
                  )}
                  {users.map((u) => {
                    const isSelf = current?.id === u.id;
                    return (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">
                          {u.email}
                          {isSelf && (
                            <Badge variant="outline" className="ml-2">
                              du
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <button
                            type="button"
                            onClick={() => onToggleRole(u)}
                            disabled={isSelf}
                            className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
                            title={
                              isSelf
                                ? "Eigene Admin-Rolle nicht änderbar"
                                : "Rolle umschalten"
                            }
                          >
                            {u.role === "admin" ? (
                              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                            ) : (
                              <Shield className="h-3.5 w-3.5" />
                            )}
                            {u.role}
                          </button>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={u.isActive}
                            disabled={isSelf}
                            onCheckedChange={(v) => onToggleActive(u, v)}
                            aria-label="Aktiv"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={u.canViewMargin}
                              onCheckedChange={(v) => onToggleMargin(u, v)}
                              aria-label="Interne Margenansicht"
                            />
                            <span className="text-xs text-muted-foreground">
                              {u.canViewMargin ? "erlaubt" : "verborgen"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onResetPassword(u)}
                              title="Passwort zurücksetzen"
                            >
                              <KeyRound className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onDelete(u)}
                              disabled={isSelf}
                              title="Zugang löschen"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function NewUserForm({ onCreated }: { onCreated: (u: AdminUserRow) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "user">("user");
  const [canViewMargin, setCanViewMargin] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isAllowedEmailDomain(email)) {
      toast.error("Nur E-Mail-Adressen mit @zinco oder @holcim sind zulässig.");
      return;
    }
    if (password.length < 8) {
      toast.error("Passwort muss mindestens 8 Zeichen lang sein.");
      return;
    }
    setBusy(true);
    try {
      const created = await adminCreateUserFn({
        data: { email: email.trim().toLowerCase(), password, role, canViewMargin },
      });
      onCreated(created);
      toast.success(`${created.email} angelegt`);
      setEmail("");
      setPassword("");
      setRole("user");
      setCanViewMargin(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Anlegen fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="grid gap-3 rounded-md border bg-muted/30 p-4 md:grid-cols-5" onSubmit={onSubmit}>
      <div className="md:col-span-2 space-y-1.5">
        <Label htmlFor="new-email">Neue E-Mail</Label>
        <Input
          id="new-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@zinco.de"
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="new-pw">Initialpasswort</Label>
        <Input
          id="new-pw"
          type="text"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="min. 8 Zeichen"
          required
          minLength={8}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Rolle</Label>
        <div className="flex items-center gap-2">
          <Switch
            checked={role === "admin"}
            onCheckedChange={(v) => setRole(v ? "admin" : "user")}
            aria-label="Admin"
          />
          <span className="text-sm">{role === "admin" ? "Admin" : "Nutzer"}</span>
        </div>
      </div>
      <div className="flex items-end justify-between gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Marge</Label>
          <Switch
            checked={canViewMargin}
            onCheckedChange={setCanViewMargin}
            aria-label="Marge sehen"
          />
        </div>
        <Button type="submit" disabled={busy}>
          <UserPlus className="mr-1 h-4 w-4" />
          {busy ? "…" : "Anlegen"}
        </Button>
      </div>
    </form>
  );
}
