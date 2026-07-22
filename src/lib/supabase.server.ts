import process from "node:process";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Server-only Supabase-Client. Das .server.ts-Suffix verhindert, dass Vite
// diese Datei in das Client-Bundle packt — Secrets erreichen nie den Browser.
//
// Es wird der SERVICE_ROLE_KEY verwendet, weil die Tabellen `artikel` und
// `kunden` per Row Level Security geschützt sind (kein anon/authenticated
// Zugriff). Server-Funktionen (createServerFn) laufen serverseitig, daher ist
// der Service-Role-Key hier sicher aufgehoben und wird nie an den Client
// ausgeliefert.
//
// Benötigte Umgebungsvariablen (in Vercel unter Project Settings → Environment
// Variables setzen):
//   SUPABASE_URL              z.B. https://veiciuhbpekaeabyvhpx.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY der geheime service_role-Key (NICHT der anon-Key)

let cached: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase ist nicht konfiguriert. Bitte SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY als Umgebungsvariablen setzen.",
    );
  }

  cached = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
