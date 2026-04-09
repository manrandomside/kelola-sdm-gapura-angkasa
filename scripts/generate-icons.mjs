// Generate favicon, PWA icons, Apple touch icon, dan sidebar logo dari
// file master public/images/gapuraangkasa.jpg.
//
// Semua icon persegi dibuat dengan background putih + logo di tengah
// dengan padding ~12% dari total size agar proporsional dan rapi.
//
// Jalankan: node scripts/generate-icons.mjs
//
// Dependency: sharp (via next.js), png-to-ico (devDependency).

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";
import pngToIco from "png-to-ico";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

const SOURCE = path.join(ROOT, "public", "images", "gapuraangkasa.jpg");
const PUBLIC_DIR = path.join(ROOT, "public");
const IMAGES_DIR = path.join(ROOT, "public", "images");

// Persentase padding (ruang kosong di sekitar logo) terhadap total sisi.
const PADDING_RATIO = 0.12;
const BG = { r: 255, g: 255, b: 255, alpha: 1 };

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

// Buat icon persegi dengan background putih + logo di tengah.
// Logo di-resize dengan fit=contain agar aspect ratio terjaga.
async function generateSquareIcon(size, outputPath) {
  const innerSize = Math.round(size * (1 - PADDING_RATIO * 2));

  const resizedLogo = await sharp(SOURCE)
    .resize(innerSize, innerSize, {
      fit: "contain",
      background: BG,
    })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: BG,
    },
  })
    .composite([{ input: resizedLogo, gravity: "center" }])
    .png()
    .toFile(outputPath);

  console.log(`  [OK] ${path.relative(ROOT, outputPath)} (${size}x${size})`);
}

// Sidebar logo: tinggi tetap 40px (retina 80px), width proporsional,
// background putih (bukan transparan karena .jpg sumber tidak punya alpha).
async function generateSidebarLogo() {
  const outputPath = path.join(IMAGES_DIR, "logo-sidebar.png");
  // Render pada 2x (80px height) agar tajam di display retina.
  await sharp(SOURCE)
    .resize({
      height: 80,
      fit: "contain",
      background: BG,
    })
    .flatten({ background: BG })
    .png()
    .toFile(outputPath);

  console.log(`  [OK] ${path.relative(ROOT, outputPath)} (height 80px @2x)`);
}

async function generateFaviconIco() {
  const tmpDir = path.join(ROOT, ".tmp-icons");
  await ensureDir(tmpDir);

  const sizes = [16, 32];
  const pngPaths = [];

  for (const size of sizes) {
    const tmpPath = path.join(tmpDir, `favicon-${size}.png`);
    await generateSquareIcon(size, tmpPath);
    pngPaths.push(tmpPath);
  }

  const icoBuffer = await pngToIco(pngPaths);
  const outputPath = path.join(PUBLIC_DIR, "favicon.ico");
  await fs.writeFile(outputPath, icoBuffer);
  console.log(`  [OK] ${path.relative(ROOT, outputPath)} (16x16 + 32x32)`);

  // Cleanup temp files.
  for (const p of pngPaths) {
    await fs.unlink(p).catch(() => undefined);
  }
  await fs.rmdir(tmpDir).catch(() => undefined);
}

async function main() {
  // Verify source exists.
  try {
    await fs.access(SOURCE);
  } catch {
    console.error(`Source image not found: ${SOURCE}`);
    process.exit(1);
  }

  console.log("Generating icons from", path.relative(ROOT, SOURCE));
  console.log();

  await ensureDir(PUBLIC_DIR);
  await ensureDir(IMAGES_DIR);

  // PWA icons.
  await generateSquareIcon(192, path.join(PUBLIC_DIR, "icon-192.png"));
  await generateSquareIcon(512, path.join(PUBLIC_DIR, "icon-512.png"));

  // Apple touch icon.
  await generateSquareIcon(
    180,
    path.join(PUBLIC_DIR, "apple-touch-icon.png"),
  );

  // Favicon .ico (16 + 32).
  await generateFaviconIco();

  // Sidebar logo.
  await generateSidebarLogo();

  console.log();
  console.log("Done.");
}

main().catch((err) => {
  console.error("Failed to generate icons:", err);
  process.exit(1);
});
