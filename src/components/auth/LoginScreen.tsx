import { useState } from "react";
import { toast } from "sonner";
import { Leaf, LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth/AuthProvider";
import { registerFn, resetPasswordFn } from "@/lib/api/auth.functions";
import { isAllowedEmailDomain } from "@/lib/auth/types";

type Mode = "login" | "register" | "reset";

export function LoginScreen() {
  const { login, refresh } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const domainOk = email.length === 0 || isAllowedEmailDomain(email);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!isAllowedEmailDomain(email)) {
      toast.error("Nur E-Mail-Adressen mit @zinco oder @holcim sind zugelassen.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "login") {
        await login(email.trim().toLowerCase(), password);
        toast.success("Anmeldung erfolgreich");
      } else if (mode === "register") {
        if (password.length < 8) {
          toast.error("Passwort muss mindestens 8 Zeichen lang sein.");
          return;
        }
        await registerFn({ data: { email: email.trim().toLowerCase(), password } });
        toast.success("Zugang angelegt — du kannst dich jetzt anmelden.");
        setMode("login");
        setPassword("");
      } else {
        if (password.length < 8) {
          toast.error("Neues Passwort muss mindestens 8 Zeichen lang sein.");
          return;
        }
        await resetPasswordFn({
          data: {
            email: email.trim().toLowerCase(),
            newPassword: password,
            oldPassword: oldPassword || undefined,
          },
        });
        toast.success("Passwort zurückgesetzt — bitte neu anmelden.");
        setMode("login");
        setPassword("");
        setOldPassword("");
        await refresh();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Vorgang fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  const title =
    mode === "login" ? "Anmelden" : mode === "register" ? "Zugang anlegen" : "Passwort zurücksetzen";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-muted/40 px-4 py-10">
      <div className="w-full max-w-md space-y-4">
        <div className="flex items-center justify-center gap-2 text-primary">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Leaf className="h-5 w-5" />
          </div>
          <div className="text-lg font-bold tracking-tight text-foreground">
            ZinCo Projektpreis-Rechner
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LogIn className="h-5 w-5" />
              {title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={onSubmit}>
              <div className="space-y-1.5">
                <Label htmlFor="email">E-Mail-Adresse</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vorname.nachname@zinco.de"
                />
                {!domainOk && (
                  <p className="text-xs text-destructive">
                    Nur Adressen mit @zinco oder @holcim sind zugelassen.
                  </p>
                )}
              </div>

              {mode === "reset" && (
                <div className="space-y-1.5">
                  <Label htmlFor="old">Aktuelles Passwort (nur bei eigenem Reset)</Label>
                  <Input
                    id="old"
                    type="password"
                    autoComplete="current-password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="Leer lassen, wenn ein Admin zurücksetzt"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="password">
                  {mode === "reset" ? "Neues Passwort" : "Passwort"}
                </Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  required
                  minLength={mode === "login" ? 1 : 8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === "login" ? "Passwort" : "Mindestens 8 Zeichen"}
                />
              </div>

              <Button type="submit" className="w-full" disabled={busy || !domainOk}>
                {busy
                  ? "Bitte warten…"
                  : mode === "login"
                    ? "Anmelden"
                    : mode === "register"
                      ? "Zugang anlegen"
                      : "Passwort setzen"}
              </Button>
            </form>

            <div className="mt-4 flex flex-wrap justify-center gap-3 text-xs text-muted-foreground">
              {mode !== "login" && (
                <button
                  type="button"
                  className="underline underline-offset-2"
                  onClick={() => setMode("login")}
                >
                  Zur Anmeldung
                </button>
              )}
              {mode !== "register" && (
                <button
                  type="button"
                  className="underline underline-offset-2"
                  onClick={() => setMode("register")}
                >
                  Neuen Zugang anlegen
                </button>
              )}
              {mode !== "reset" && (
                <button
                  type="button"
                  className="underline underline-offset-2"
                  onClick={() => setMode("reset")}
                >
                  Passwort zurücksetzen
                </button>
              )}
            </div>
          </CardContent>
        </Card>
        <p className="text-center text-xs text-muted-foreground">
          Zugang beschränkt auf Zinco- und Holcim-Mitarbeitende.
        </p>
      </div>
    </div>
  );
}
