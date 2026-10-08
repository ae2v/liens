import * as oidc from "openid-client";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";

export function env(name: string) { const value = process.env[name]; if (!value) throw new Error(`Variable serveur manquante : ${name}`); return value; }
export interface AdminIdentity { id: string; email: string; role: "admin"; expires: number; issuer: string; clientId: string }
export interface SessionData { transaction?: { verifier: string; state: string; nonce: string; expires: number }; user?: AdminIdentity }
export async function session() {
  return getIronSession<SessionData>(await cookies(), { password: env("SESSION_SECRET"), cookieName: "liens_sso_admin", ttl: 300, cookieOptions: { httpOnly: true, secure: new URL(env("APP_URL")).protocol === "https:", sameSite: "lax", path: "/" } });
}
let discovery: Promise<oidc.Configuration> | undefined;
export function configuration() {
  return discovery ??= oidc.discovery(new URL(env("SSO_ISSUER")), env("SSO_CLIENT_ID"), { client_secret: env("SSO_CLIENT_SECRET"), token_endpoint_auth_method: "client_secret_basic" }, oidc.ClientSecretBasic(env("SSO_CLIENT_SECRET")), { execute: [oidc.enableNonRepudiationChecks] });
}
export function identityFromClaims(claims: oidc.IDToken | undefined): AdminIdentity {
  if (!claims || claims[env("ROLE_CLAIM_NAMESPACE")] !== "admin" || typeof claims.email !== "string" || claims.email_verified !== true || claims.exp <= Date.now()/1000) throw new Error("Accès administrateur refusé.");
  return { id: claims.sub, email: claims.email, role: "admin", expires: Math.min(claims.exp, Date.now()/1000 + 300), issuer: env("SSO_ISSUER"), clientId: env("SSO_CLIENT_ID") };
}
export function validAdmin(user?: AdminIdentity) {
  return !!user && user.role === "admin" && typeof user.id === "string" && typeof user.email === "string" && user.expires > Date.now()/1000 && user.issuer === env("SSO_ISSUER") && user.clientId === env("SSO_CLIENT_ID");
}
export function adminOriginAllowed(request: Request) { return request.headers.get("origin") === new URL(env("APP_URL")).origin; }
