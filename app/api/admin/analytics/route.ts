import { isAdmin } from "@/lib/auth";
import { getAnalytics } from "@/lib/db";

export async function GET(request: Request) {
  if (!(await isAdmin())) return Response.json({ error: "Non autorisé" }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const id = params.get('id') ?? '';
  const kind = params.get('kind');
  const end = params.get('end') ?? new Date().toISOString().slice(0, 10);
  const startDate = new Date(`${end}T12:00:00Z`); startDate.setUTCDate(startDate.getUTCDate() - 29);
  const start = params.get('start') ?? startDate.toISOString().slice(0, 10);
  const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T12:00:00Z`).getTime());
  const span = (new Date(`${end}T12:00:00Z`).getTime() - new Date(`${start}T12:00:00Z`).getTime()) / 86400000;
  if (!/^[0-9a-f-]{36}$/i.test(id) || !['item', 'short', 'qr'].includes(kind ?? '') || !validDate(start) || !validDate(end) || span < 0 || span > 365) return Response.json({ error: 'Paramètres invalides' }, { status: 400 });
  try { return Response.json(await getAnalytics(kind as 'item' | 'short' | 'qr', id, start, end), { headers: { 'Cache-Control': 'no-store' } }); }
  catch { return Response.json({ error: 'Statistiques indisponibles. Réessaie.' }, { status: 503 }); }
}
