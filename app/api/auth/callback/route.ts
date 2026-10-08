import * as oidc from "openid-client";
import { configuration, env, identityFromClaims, session } from "@/lib/sso";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const current = await session();
  const transaction = current.transaction;
  delete current.transaction;
  await current.save();
  try {
    if (!transaction || !(transaction.expires > Date.now())) throw new Error("Transaction expirée.");
    const callback = new URL("/api/auth/callback", env("APP_URL"));
    callback.search = new URL(request.url).search;
    const tokens = await oidc.authorizationCodeGrant(await configuration(), callback, { pkceCodeVerifier: transaction.verifier, expectedState: transaction.state, expectedNonce: transaction.nonce, idTokenExpected: true });
    current.user = identityFromClaims(tokens.claims());
    await current.save();
    return new Response(null, { status: 302, headers: { Location: new URL("/admin", env("APP_URL")).href, "Cache-Control": "no-store" } });
  } catch {
    current.destroy();
    return new Response(null, { status: 302, headers: { Location: new URL("/admin/login?error=sso", env("APP_URL")).href, "Cache-Control": "no-store" } });
  }
}
