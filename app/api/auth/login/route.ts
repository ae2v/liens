import * as oidc from "openid-client";
import { configuration, env, session } from "@/lib/sso";
export const runtime = "nodejs";
export async function GET() {
  const current = await session();
  current.transaction = { verifier: oidc.randomPKCECodeVerifier(), state: oidc.randomState(), nonce: oidc.randomNonce(), expires: Date.now() + 300_000 };
  const url = oidc.buildAuthorizationUrl(await configuration(), { redirect_uri: new URL("/api/auth/callback", env("APP_URL")).href, scope: "openid profile email", code_challenge: await oidc.calculatePKCECodeChallenge(current.transaction.verifier), code_challenge_method: "S256", state: current.transaction.state, nonce: current.transaction.nonce });
  await current.save();
  return new Response(null, { status: 302, headers: { Location: url.href, "Cache-Control": "no-store" } });
}
