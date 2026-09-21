import QRCode from "qrcode";
import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { getQrSizing, type QrErrorCorrection } from "@/lib/qr-config";

type Rect = { x: number; y: number; width: number; height: number };

const MASK_PATTERNS = [0, 1, 2, 3, 4, 5, 6, 7] as const;
const LOGO_STENCIL = [
  "xxxssxx",
  "xoooosx",
  "sooooos",
  "soooooo",
  "xooooos",
  "xsoooox",
  "xxxssxx",
] as const;

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

function isLogoCutoutModule(x: number, y: number, size: number) {
  const start = Math.floor(size / 2) - 3;
  const row = y - start;
  const column = x - start;
  if (row < 0 || row >= 7 || column < 0 || column >= 7) return false;
  return LOGO_STENCIL[row][column] !== "x";
}

function hiddenModules(matrix: Uint8Array, size: number) {
  let count = 0;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (matrix[y * size + x] && isLogoCutoutModule(x, y, size)) count += 1;
    }
  }
  return count;
}

function qrWithBestLogoMask(data: string, level: QrErrorCorrection, useLogo: boolean) {
  if (!useLogo) return QRCode.create(data, { errorCorrectionLevel: level });

  let best = QRCode.create(data, { errorCorrectionLevel: level, maskPattern: MASK_PATTERNS[0] });
  let bestHidden = hiddenModules(best.modules.data, best.modules.size);

  for (const maskPattern of MASK_PATTERNS.slice(1)) {
    const candidate = QRCode.create(data, { errorCorrectionLevel: level, maskPattern });
    const hidden = hiddenModules(candidate.modules.data, candidate.modules.size);
    if (hidden < bestHidden) {
      best = candidate;
      bestHidden = hidden;
    }
  }
  return best;
}

function mergedRects(matrix: Uint8Array, size: number, useLogo: boolean) {
  const complete: Rect[] = [];
  let active = new Map<string, Rect>();
  for (let y = 0; y < size; y += 1) {
    const runs: Array<{ x: number; width: number }> = [];
    for (let x = 0; x < size;) {
      const hidden = useLogo && isLogoCutoutModule(x, y, size);
      if (!matrix[y * size + x] || hidden) { x += 1; continue; }
      const start = x;
      while (x < size) {
        const inCutout = useLogo && isLogoCutoutModule(x, y, size);
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

async function buildQrSvg(data: string, dark: string, light: string, logoRequested: boolean, logoColor: string, moduleSize: number) {
  const sizing = getQrSizing(data);
  const useLogo = logoRequested && sizing.logoAllowed;
  const qr = qrWithBestLogoMask(data, sizing.errorCorrection, useLogo);
  const size = qr.modules.size;
  const quiet = 4;
  const totalModules = size + quiet * 2;
  const pixelSize = totalModules * moduleSize;
  const path = mergedRects(qr.modules.data, size, useLogo).map((rect) => {
    const x = (rect.x + quiet) * moduleSize;
    const y = (rect.y + quiet) * moduleSize;
    return `M${x} ${y}h${rect.width * moduleSize}v${rect.height * moduleSize}h-${rect.width * moduleSize}z`;
  }).join("");

  let logo = "";
  if (useLogo) {
    const source = await readFile(join(process.cwd(), "public", "assets", "logo-ae2v.svg"), "utf8");
    const lionBody = extractLastTopLevelGroup(source).replaceAll('class="cls-1"', `fill="${logoColor}"`);
    const logoBox = 7 * moduleSize;
    const scale = Math.min(logoBox / 350, logoBox / 272.35);
    const logoWidth = 350 * scale;
    const logoHeight = 272.35 * scale;
    const centerX = (quiet + size / 2) * moduleSize;
    const centerY = (quiet + size / 2) * moduleSize;
    const tx = centerX - logoWidth / 2;
    const ty = centerY - logoHeight / 2;
    logo = `<g transform="translate(${tx} ${ty}) scale(${scale}) translate(-650 0)">${lionBody}</g>`;
  }

  const background = light === "transparent" ? "" : `<rect width="100%" height="100%" fill="${light}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${pixelSize}" height="${pixelSize}" viewBox="0 0 ${pixelSize} ${pixelSize}">${background}<path d="${path}" fill="${dark}" shape-rendering="crispEdges"/>${logo}</svg>`;
}

export async function GET(request: NextRequest) {
  const data = request.nextUrl.searchParams.get("data") ?? "https://liens.ae2v.fr";
  const format = request.nextUrl.searchParams.get("format") === "png" ? "png" : "svg";
  const dark = request.nextUrl.searchParams.get("dark") ?? "#171717";
  const light = request.nextUrl.searchParams.get("light") ?? "#ffffff";
  const logoRequested = request.nextUrl.searchParams.get("logo") !== "0";
  const logoColor = request.nextUrl.searchParams.get("logoColor") ?? "#d60106";
  const moduleSize = Math.min(32, Math.max(6, Number(request.nextUrl.searchParams.get("module") ?? 16) || 16));
  if (data.length > 2048) return NextResponse.json({ error: "Lien trop long" }, { status: 400 });
  if (!/^#[0-9a-f]{6}$/i.test(dark) || (light !== "transparent" && !/^#[0-9a-f]{6}$/i.test(light)) || !/^#[0-9a-f]{6}$/i.test(logoColor)) {
    return NextResponse.json({ error: "Couleur invalide" }, { status: 400 });
  }

  try {
    const svg = await buildQrSvg(data, dark, light, logoRequested, logoColor, Math.round(moduleSize));
    if (format === "png") {
      const buffer = await sharp(Buffer.from(svg)).png().toBuffer();
      return new NextResponse(new Uint8Array(buffer), { headers: { "Content-Type": "image/png", "Content-Disposition": "attachment; filename=ae2v-qr.png", "Cache-Control": "public, max-age=86400" } });
    }
    return new NextResponse(svg, { headers: { "Content-Type": "image/svg+xml", "Content-Disposition": "inline; filename=ae2v-qr.svg", "Cache-Control": "public, max-age=86400" } });
  } catch {
    return NextResponse.json({ error: "QR code impossible à générer" }, { status: 400 });
  }
}
