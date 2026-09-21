import { NextRequest } from "next/server";
import { getQrSizing } from "@/lib/qr-config";

export function GET(request: NextRequest) {
  const data = request.nextUrl.searchParams.get("data") ?? "";
  if (!data || data.length > 2048) return Response.json({ error: "Lien invalide" }, { status: 400 });

  try {
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://liens.ae2v.fr").replace(/\/$/, "");
    const direct = getQrSizing(data);
    const compact = getQrSizing(`${siteUrl}/q/xxxx`);
    return Response.json({
      direct,
      compact,
      compactHelps: compact.version < direct.version,
    }, { headers: { "Cache-Control": "public, max-age=3600" } });
  } catch {
    return Response.json({ error: "Lien trop long" }, { status: 400 });
  }
}
