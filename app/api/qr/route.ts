import QRCode from "qrcode";
import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

function reserveLogoArea(svg: string, radiusInPixels = 112) {
  const viewBox = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  if (!viewBox) throw new Error("Matrice QR invalide");
  const size = Number(viewBox[1]);
  const radius = (radiusInPixels / 1024) * size;
  const mask = `<defs><mask id="ae2v-logo-cutout"><rect width="${size}" height="${size}" fill="#fff"/><circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="#000"/></mask></defs>`;
  return svg
    .replace(/(<svg[^>]*>)/, `$1${mask}`)
    .replace('<path stroke=', '<path mask="url(#ae2v-logo-cutout)" stroke=');
}

export async function GET(request: NextRequest) {
  const data = request.nextUrl.searchParams.get("data") ?? "https://liens.ae2v.fr";
  const format = request.nextUrl.searchParams.get("format") === "png" ? "png" : "svg";
  const dark = request.nextUrl.searchParams.get("dark") ?? "#171717";
  const light = request.nextUrl.searchParams.get("light") ?? "#ffffff";
  if (data.length > 2048) return NextResponse.json({ error: "Lien trop long" }, { status: 400 });
  if (!/^#[0-9a-f]{6}$/i.test(dark) || !/^#[0-9a-f]{6}$/i.test(light)) return NextResponse.json({ error: "Couleur invalide" }, { status: 400 });
  const options = { errorCorrectionLevel: "H" as const, margin: 4, width: 1024, color: { dark, light } };
  const qr = reserveLogoArea(await QRCode.toString(data, { ...options, type: "svg" }));
  const logo = await readFile(join(process.cwd(), "public", "assets", "logo-ae2v.svg"));
  const qrData = Buffer.from(qr).toString("base64");
  const logoData = logo.toString("base64");
  const composed = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><image width="1024" height="1024" href="data:image/svg+xml;base64,${qrData}"/><svg x="418" y="438" width="188" height="148" viewBox="650 0 350 272.35"><image width="1000" height="272.35" href="data:image/svg+xml;base64,${logoData}"/></svg></svg>`;
  if (format === "png") {
    const buffer = await sharp(Buffer.from(composed)).png().toBuffer();
    return new NextResponse(new Uint8Array(buffer), { headers: { "Content-Type": "image/png", "Content-Disposition": "attachment; filename=ae2v-qr.png" } });
  }
  return new NextResponse(composed, { headers: { "Content-Type": "image/svg+xml", "Content-Disposition": "inline; filename=ae2v-qr.svg" } });
}
