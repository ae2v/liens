import { getQrCode, recordQrScan } from "@/lib/db";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("QR code introuvable", { status: 404 });
  const qr = await getQrCode(id);
  if (!qr) return new Response("QR code introuvable", { status: 404 });
  await recordQrScan(id, request);
  return new Response(null, { status: 307, headers: { Location: String(qr.target_url), "Cache-Control": "no-store" } });
}
