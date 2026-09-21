import QRCode from "qrcode";
import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

type Rect = { x: number; y: number; width: number; height: number };
type CutoutCircle = { cx: number; cy: number; radius: number };

const MASK_PATTERNS = [0, 1, 2, 3, 4, 5, 6, 7] as const;

function extractLastTopLevelGroup(source: string) {
  const groups: string[] = [];
  const tag = /<\/?g(?:\s[^>]*)?>/g;
  let depth = 0;
  let start = -1;
  for (const match of source.matchAll(tag)) {
    const closing = match[0].startsWith("</");
    if (!closing) {
      if (depth === 0) start = match.index;
      depth += 1;
    } else {
      depth -= 1;
      if (depth === 0 && start >= 0 && match.index !== undefined) groups.push(source.slice(start, match.index + match[0].length));
    }
  }
  return groups.at(-1) ?? "";
}

function cutoutFor(size: number): CutoutCircle {
  return { cx: size / 2, cy: size / 2, radius: Math.min(4.5, Math.max(3, (size - 17) / 2)) };
}

function moduleTouchesCircle(x: number, y: number, circle: CutoutCircle) {
  const nearestX = Math.max(x, Math.min(circle.cx, x + 1));
  const nearestY = Math.max(y, Math.min(circle.cy, y + 1));
  const dx = nearestX - circle.cx;
  const dy = nearestY - circle.cy;
  return dx * dx + dy * dy <= circle.radius * circle.radius;
}

function hiddenModules(matrix: Uint8Array, size: number, circle: CutoutCircle) {
  let count = 0;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (matrix[y * size + x] && moduleTouchesCircle(x, y, circle)) count += 1;
    }
  }
  return count;
}

function qrWithBestLogoMask(data: string) {
  let best = QRCode.create(data, { errorCorrectionLevel: "H", maskPattern: MASK_PATTERNS[0] });
  let bestHidden = hiddenModules(best.modules.data, best.modules.size, cutoutFor(best.modules.size));

  for (const maskPattern of MASK_PATTERNS.slice(1)) {
    const candidate = QRCode.create(data, { errorCorrectionLevel: "H", maskPattern });
    const hidden = hiddenModules(candidate.modules.data, candidate.modules.size, cutoutFor(candidate.modules.size));
    if (hidden < bestHidden) {
      best = candidate;
      bestHidden = hidden;
    }
  }
  return best;
}

function mergedRects(matrix: Uint8Array, size: number, circle: CutoutCircle) {
  const complete: Rect[] = [];
  let active = new Map<string, Rect>();
  for (let y = 0; y < size; y += 1) {
    const runs: Array<{ x: number; width: number }> = [];
    for (let x = 0; x < size;) {
      if (!matrix[y * size + x] || moduleTouchesCircle(x, y, circle)) { x += 1; continue; }
      const start = x;
      while (x < size && matrix[y * size + x] && !moduleTouchesCircle(x, y, circle)) x += 1;
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
  const qr = qrWithBestLogoMask(data);
  const size = qr.modules.size;
  const quiet = 4;
  const circle = cutoutFor(size);
  const totalModules = size + quiet * 2;
  const pixelSize = totalModules * moduleSize;
  const path = mergedRects(qr.modules.data, size, circle).map((rect) => {
    const x = (rect.x + quiet) * moduleSize;
    const y = (rect.y + quiet) * moduleSize;
    return `M${x} ${y}h${rect.width * moduleSize}v${rect.height * moduleSize}h-${rect.width * moduleSize}z`;
  }).join("");

  const source = await readFile(join(process.cwd(), "public", "assets", "logo-ae2v.svg"), "utf8");
  const lionBody = extractLastTopLevelGroup(source).replaceAll('class="cls-1"', 'fill="#d60106"');
  const circleDiameter = circle.radius * 2 * moduleSize;
  const logoBox = circleDiameter * 0.78;
  const scale = Math.min(logoBox / 350, logoBox / 272.35);
  const logoWidth = 350 * scale;
  const logoHeight = 272.35 * scale;
  const centerX = (quiet + circle.cx) * moduleSize;
  const centerY = (quiet + circle.cy) * moduleSize;
  const tx = centerX - logoWidth / 2;
  const ty = centerY - logoHeight / 2;
  const background = light === "transparent" ? "" : `<rect width="100%" height="100%" fill="${light}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${pixelSize}" height="${pixelSize}" viewBox="0 0 ${pixelSize} ${pixelSize}">${background}<path d="${path}" fill="${dark}" shape-rendering="crispEdges"/><g transform="translate(${tx} ${ty}) scale(${scale}) translate(-650 0)">${lionBody}</g></svg>`;
}

export async function GET(request: NextRequest) {
  const data = request.nextUrl.searchParams.get("data") ?? "https://liens.ae2v.fr";
  const format = request.nextUrl.searchParams.get("format") === "png" ? "png" : "svg";
  const dark = request.nextUrl.searchParams.get("dark") ?? "#171717";
  const light = request.nextUrl.searchParams.get("light") ?? "#ffffff";
  const moduleSize = Math.min(32, Math.max(6, Number(request.nextUrl.searchParams.get("module") ?? 16) || 16));
  if (data.length > 2048) return NextResponse.json({ error: "Lien trop long" }, { status: 400 });
  if (!/^#[0-9a-f]{6}$/i.test(dark) || (light !== "transparent" && !/^#[0-9a-f]{6}$/i.test(light))) return NextResponse.json({ error: "Couleur invalide" }, { status: 400 });
  const svg = await buildQrSvg(data, dark, light, Math.round(moduleSize));
  if (format === "png") {
    const buffer = await sharp(Buffer.from(svg)).png().toBuffer();
    return new NextResponse(new Uint8Array(buffer), { headers: { "Content-Type": "image/png", "Content-Disposition": "attachment; filename=ae2v-qr.png", "Cache-Control": "public, max-age=86400" } });
  }
  return new NextResponse(svg, { headers: { "Content-Type": "image/svg+xml", "Content-Disposition": "inline; filename=ae2v-qr.svg", "Cache-Control": "public, max-age=86400" } });
}
