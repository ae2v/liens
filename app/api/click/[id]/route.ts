import { NextResponse } from "next/server";
import { recordItemClick } from "@/lib/db";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  await recordItemClick(id, request);
  return new NextResponse(null, { status: 204 });
}
