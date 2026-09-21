import QRCode from "qrcode";
import { NextRequest } from "next/server";

export function GET(request: NextRequest) {
  const data = request.nextUrl.searchParams.get("data") ?? "";
  if (!data || data.length > 2048) return Response.json({ error: "Lien invalide" }, { status: 400 });
  const modules = QRCode.create(data, { errorCorrectionLevel: "H" }).modules.size;
  return Response.json({ modules, compact: modules <= 33 }, { headers: { "Cache-Control": "public, max-age=3600" } });
}
