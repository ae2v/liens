import { isAdmin } from "@/lib/auth";
import { fetchSocialMetadata } from "@/lib/metadata";

export async function POST(request: Request) {
  if (!(await isAdmin())) return Response.json({ error: "Non autorisé" }, { status: 401 });
  try {
    const body = await request.json();
    return Response.json({ metadata: await fetchSocialMetadata(String(body.url ?? "")) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Métadonnées indisponibles." }, { status: 400 });
  }
}
