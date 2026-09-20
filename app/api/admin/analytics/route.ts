import { isAdmin } from "@/lib/auth";
import { getAnalytics } from "@/lib/db";

export async function GET(request: Request) {
  if (!(await isAdmin())) return Response.json({ error: "Non autorisé" }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const id = params.get('id') ?? '';
  const kind = params.get('kind');
  const days = Number(params.get('days') ?? 30);
  if (!/^[0-9a-f-]{36}$/i.test(id) || !['item', 'short'].includes(kind ?? '') || ![7, 30, 90].includes(days)) return Response.json({ error: 'Paramètres invalides' }, { status: 400 });
  try { return Response.json(await getAnalytics(kind as 'item' | 'short', id, days), { headers: { 'Cache-Control': 'no-store' } }); }
  catch { return Response.json({ error: 'Statistiques indisponibles. Réessaie.' }, { status: 503 }); }
}
