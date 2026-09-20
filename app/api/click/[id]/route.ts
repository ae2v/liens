import { NextResponse } from "next/server";
import { recordItemClick, sqlClient } from "@/lib/db";
import { conditionsMatch } from "@/lib/conditions";
import type { Conditions } from "@/lib/types";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse(null, { status: 404 });
  const sql = sqlClient();
  const rows = await sql`SELECT enabled, conditions FROM page_items WHERE id=${id}`;
  if (!rows[0]?.enabled || !conditionsMatch(rows[0].conditions as Conditions)) return new NextResponse(null, { status: 404 });
  await recordItemClick(id, request);
  return new NextResponse(null, { status: 204 });
}
