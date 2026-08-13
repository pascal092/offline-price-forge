import { useState } from "react";
import { toast } from "sonner";
import { LogOut, Shield, User as UserIcon, Eye, EyeOff, KeyRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth/AuthProvider";
import { resetPasswordFn } from "@/lib/api/auth.functions";
import { AdminPanel } from "./AdminPanel";

export function UserMenu() {
  const { user, logout } = useAuth();
  const [adminOpen, setAdminOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [busy, setBusy] = useState(false);

  if (!user) return null;

  async function onLogout() {
    await logout();
    toast.success("Abgemeldet");
  }

  async function onChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (newPw.length < 8) {
      toast.error("Neues Passwort muss mindestens 8 Zeichen lang sein");
      return;
    }
    setBusy(true);
    try {
      await resetPasswordFn({
        data: { email: user.email, newPassword: newPw, oldPassword: oldPw },
      });
      toast.success("Passwort geändert. Bitte neu anmelden.");
      setPwOpen(false);
      setOldPw("");
      setNewPw("");
      // Sitzung ist server-seitig invalidiert; Reload zeigt Login.
      window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            {user.role === "admin" ? (
              <Shield className="h-4 w-4 text-primary" />
            ) : (
              <UserIcon className="h-4 w-4" />
            )}
            <span className="hidden max-w-[180px] truncate sm:inline">{user.email}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuLabel className="space-y-1">
            <div className="truncate text-sm font-medium">{user.email}</div>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                {user.role === "admin" ? "Administrator" : "Nutzer"}
              </Badge>
              <Badge variant="outline" className="gap-1">
                {user.canViewMargin ? (
                  <>
                    <Eye className="h-3 w-3" /> Marge sichtbar
                  </>
                ) : (
                  <>
                    <EyeOff className="h-3 w-3" /> Marge verborgen
                  </>
                )}
              </Badge>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {user.role === "admin" && (
            <DropdownMenuItem onSelect={() => setAdminOpen(true)}>
              <Shield className="mr-2 h-4 w-4" />
              Nutzerverwaltung
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={() => setPwOpen(true)}>
            <KeyRound className="mr-2 h-4 w-4" />
            Passwort ändern
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={onLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Abmelden
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AdminPanel open={adminOpen} onClose={() => setAdminOpen(false)} />

      <Dialog open={pwOpen} onOpenChange={setPwOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Passwort ändern</DialogTitle>
          </DialogHeader>
          <form className="space-y-3" onSubmit={onChangePassword}>
            <div className="space-y-1.5">
              <Label htmlFor="oldPw">Aktuelles Passwort</Label>
              <Input
                id="oldPw"
                type="password"
                value={oldPw}
                onChange={(e) => setOldPw(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="newPw">Neues Passwort (mind. 8 Zeichen)</Label>
              <Input
                id="newPw"
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Ein Passwortwechsel meldet automatisch alle anderen Sitzungen ab.
            </p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setPwOpen(false)}>
                Abbrechen
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? "…" : "Speichern"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
