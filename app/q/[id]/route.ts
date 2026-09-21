import { getQrCode, recordQrScan } from "@/lib/db";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^[A-Za-z0-9_-]{2,64}$/.test(id)) return new Response("QR code introuvable", { status: 404 });
  const qr = await getQrCode(id);
  if (!qr) return new Response("QR code introuvable", { status: 404 });
  if (qr.tracking_enabled) await recordQrScan(String(qr.id), request);
  return new Response(null, { status: 307, headers: { Location: String(qr.target_url), "Cache-Control": "no-store" } });
}
