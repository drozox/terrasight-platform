#!/usr/bin/env node
// =============================================================================
// gen-favicons.mjs — Genera los favicons/íconos de SIG TERRITORIO a partir del
// logo oficial (frailejón) en public/logos/sig-territorio-logo.png.
//
// Salidas:
//   - src/app/favicon.ico            (16/32/48, ICO con entradas PNG)
//   - src/app/icon.png               (512)
//   - src/app/apple-icon.png         (180)
//   - public/favicon-16x16.png
//   - public/favicon-32x32.png
//   - public/android-chrome-192x192.png
//   - public/android-chrome-512x512.png
//
// Uso: node scripts/gen-favicons.mjs
// Requiere: sharp (ya presente en node_modules).
// =============================================================================

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import sharp from "sharp";

const SRC = resolve("public/logos/sig-territorio-logo.png");
// Fondo blanco para que el logo sea visible en cualquier barra de pestañas /
// pantalla de inicio (el PNG original tiene fondo transparente).
const BG = { r: 255, g: 255, b: 255, alpha: 1 };
const PADDING = 0.08; // 8% por lado

async function renderPng(size) {
  const trimmed = await sharp(SRC).trim({ threshold: 1 }).toBuffer();
  const inner = Math.max(1, Math.round(size * (1 - PADDING * 2)));
  const logo = await sharp(trimmed)
    .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  return sharp({
    create: { width: size, height: size, channels: 4, background: BG },
  })
    .composite([{ input: logo, gravity: "center" }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/** Construye un .ico con entradas PNG (soportado por navegadores modernos). */
function buildIco(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type = icon
  header.writeUInt16LE(entries.length, 4);

  const dir = [];
  const blobs = [];
  let offset = 6 + entries.length * 16;
  for (const { size, buf } of entries) {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0); // width
    e.writeUInt8(size >= 256 ? 0 : size, 1); // height
    e.writeUInt8(0, 2); // palette
    e.writeUInt8(0, 3); // reserved
    e.writeUInt16LE(1, 4); // color planes
    e.writeUInt16LE(32, 6); // bits per pixel
    e.writeUInt32LE(buf.length, 8);
    e.writeUInt32LE(offset, 12);
    dir.push(e);
    blobs.push(buf);
    offset += buf.length;
  }
  return Buffer.concat([header, ...dir, ...blobs]);
}

function write(path, buf) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, buf);
  console.log(`  ✓ ${path} (${buf.length} bytes)`);
}

const targets = [
  ["src/app/icon.png", 512],
  ["src/app/apple-icon.png", 180],
  ["public/favicon-16x16.png", 16],
  ["public/favicon-32x32.png", 32],
  ["public/android-chrome-192x192.png", 192],
  ["public/android-chrome-512x512.png", 512],
];

console.log("Generando favicons desde", SRC);
for (const [path, size] of targets) {
  write(path, await renderPng(size));
}

const icoSizes = [16, 32, 48];
const icoEntries = [];
for (const size of icoSizes) icoEntries.push({ size, buf: await renderPng(size) });
write("src/app/favicon.ico", buildIco(icoEntries));

console.log("Listo.");
