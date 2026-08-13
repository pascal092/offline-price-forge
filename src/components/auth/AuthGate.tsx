import type { ReactNode } from "react";
import { Leaf } from "lucide-react";

import { useAuth } from "@/lib/auth/AuthProvider";
import { LoginScreen } from "./LoginScreen";

/** Rendert Kinder nur, wenn ein aktiver User angemeldet ist; sonst Login-Screen. */
export function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        <div className="flex items-center gap-2">
          <Leaf className="h-5 w-5 animate-pulse text-primary" />
          <span>Sitzung wird geladen …</span>
        </div>
      </div>
    );
  }
  if (!user) return <LoginScreen />;
  return <>{children}</>;
}
