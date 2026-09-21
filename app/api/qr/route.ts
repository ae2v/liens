import QRCode from "qrcode";
import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

type Rect = { x: number; y: number; width: number; height: number };

function mergedRects(matrix: Uint8Array, size: number, cutout: { x: number; y: number; width: number; height: number }) {
  const complete: Rect[] = [];
  let active = new Map<string, Rect>();
  for (let y = 0; y < size; y += 1) {
    const runs: Array<{ x: number; width: number }> = [];
    for (let x = 0; x < size;) {
      const hidden = x >= cutout.x && x < cutout.x + cutout.width && y >= cutout.y && y < cutout.y + cutout.height;
      if (!matrix[y * size + x] || hidden) { x += 1; continue; }
      const start = x;
      while (x < size) {
        const inCutout = x >= cutout.x && x < cutout.x + cutout.width && y >= cutout.y && y < cutout.y + cutout.height;
        if (!matrix[y * size + x] || inCutout) break;
        x += 1;
      }
      runs.push({ x: start, width: x - start });
    }
    const next = new Map<string, Rect>();
    for (const run of runs) {
      const key = `${run.x}:${run.width}`;
      const previous = active.get(key);
      next.set(key, previous ? { ...previous, height: previous.height + 1 } : { ...run, y, height: 1 });
    }
    for (const [key, rect] of active) if (!next.has(key)) complete.push(rect);
    active = next;
  }
  complete.push(...active.values());
  return complete;
}

async function buildQrSvg(data: string, dark: string, light: string, moduleSize: number) {
  const qr = QRCode.create(data, { errorCorrectionLevel: "H" });
  const size = qr.modules.size;
  const quiet = 4;
  const cutoutWidth = Math.min(9, size - 16);
  const cutoutHeight = Math.min(7, size - 18);
  const cutout = { x: Math.floor((size - cutoutWidth) / 2), y: Math.floor((size - cutoutHeight) / 2), width: cutoutWidth, height: cutoutHeight };
  const totalModules = size + quiet * 2;
  const pixelSize = totalModules * moduleSize;
  const path = mergedRects(qr.modules.data, size, cutout).map((rect) => {
    const x = (rect.x + quiet) * moduleSize;
    const y = (rect.y + quiet) * moduleSize;
    return `M${x} ${y}h${rect.width * moduleSize}v${rect.height * moduleSize}h-${rect.width * moduleSize}z`;
  }).join("");

  const source = await readFile(join(process.cwd(), "public", "assets", "logo-ae2v.svg"), "utf8");
  const logoBody = source.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
  const logoWidth = cutout.width * moduleSize;
  const logoHeight = cutout.height * moduleSize;
  const logoX = (quiet + cutout.x) * moduleSize;
  const logoY = (quiet + cutout.y) * moduleSize;
  const scale = Math.min(logoWidth / 350, logoHeight / 272.35) * 0.9;
  const tx = logoX + (logoWidth - 350 * scale) / 2;
  const ty = logoY + (logoHeight - 272.35 * scale) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${pixelSize}" height="${pixelSize}" viewBox="0 0 ${pixelSize} ${pixelSize}"><rect width="100%" height="100%" fill="${light}"/><path d="${path}" fill="${dark}" shape-rendering="crispEdges"/><g transform="translate(${tx} ${ty}) scale(${scale}) translate(-650 0)">${logoBody}</g></svg>`;
}

export async function GET(request: NextRequest) {
  const data = request.nextUrl.searchParams.get("data") ?? "https://liens.ae2v.fr";
  const format = request.nextUrl.searchParams.get("format") === "png" ? "png" : "svg";
  const dark = request.nextUrl.searchParams.get("dark") ?? "#171717";
  const light = request.nextUrl.searchParams.get("light") ?? "#ffffff";
  const moduleSize = Math.min(32, Math.max(6, Number(request.nextUrl.searchParams.get("module") ?? 16) || 16));
  if (data.length > 2048) return NextResponse.json({ error: "Lien trop long" }, { status: 400 });
  if (!/^#[0-9a-f]{6}$/i.test(dark) || !/^#[0-9a-f]{6}$/i.test(light)) return NextResponse.json({ error: "Couleur invalide" }, { status: 400 });
  const svg = await buildQrSvg(data, dark, light, Math.round(moduleSize));
  if (format === "png") {
    const buffer = await sharp(Buffer.from(svg)).png().toBuffer();
    return new NextResponse(new Uint8Array(buffer), { headers: { "Content-Type": "image/png", "Content-Disposition": "attachment; filename=ae2v-qr.png", "Cache-Control": "public, max-age=86400" } });
  }
  return new NextResponse(svg, { headers: { "Content-Type": "image/svg+xml", "Content-Disposition": "inline; filename=ae2v-qr.svg", "Cache-Control": "public, max-age=86400" } });
}
