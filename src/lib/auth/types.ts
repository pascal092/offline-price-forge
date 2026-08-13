// Auth-Typen (Client- und Server-safe).

export type Role = "admin" | "user";

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  canViewMargin: boolean;
  isActive: boolean;
}

export interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Prüft, ob eine E-Mail-Adresse zur erlaubten Domain-Whitelist gehört.
 *
 * Erlaubt sind Adressen, deren Domain den Bestandteil `zinco` oder `holcim`
 * enthält — z. B. `pascal.wanner@zinco.de`, `hans@holcim.com`,
 * `sales@de.holcim-group.com`. Die Prüfung ist Case-insensitiv.
 *
 * Die Prüfung findet zusätzlich auf DB-Ebene (CHECK-Constraint) statt.
 */
export function isAllowedEmailDomain(email: string): boolean {
  const at = email.lastIndexOf("@");
  if (at < 0) return false;
  const domain = email.slice(at + 1).toLowerCase();
  if (!domain) return false;
  // Matcht 'zinco' bzw. 'holcim' als Domain-Bestandteil (durch Punkt getrennt
  // oder am Rand). Verhindert False-Matches wie 'zincoshop-fake.com', matcht
  // aber 'zinco.de', 'zinco-greenroof.com', 'de.holcim-group.com'.
  return /(^|\.)(zinco|holcim)(\.|-|$)/.test(domain);
}
