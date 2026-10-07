/**
 * Generates the PWA icon set (192/512 + maskable) from the SafeRoute brand
 * shapes already used in saferoute-logo.svg. Pure Node (zlib) — no canvas
 * dependency. Run once: `node scripts/generate-icons.mjs`.
 */

import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let crc = -1;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ -1) >>> 0;
}

function pngChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuffer = Buffer.from(type, 'ascii');
  const crcInput = Buffer.concat([typeBuffer, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

/**
 * Render the SafeRoute shield: rounded navy square, orange location pin with
 * a road mark — the same shapes as saferoute-logo.svg, drawn per-pixel.
 */
function renderShield(size) {
  const image = Buffer.alloc(size * size * 4);
  const cx = size / 2;
  const scale = size / 96; // logo viewBox is 96x96
  const put = (x, y, r, g, b, a = 255) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const index = (y * size + x) * 4;
    image[index] = r;
    image[index + 1] = g;
    image[index + 2] = b;
    image[index + 3] = a;
  };
  const blend = (x, y, r, g, b, alpha) => {
    if (x < 0 || y < 0 || x >= size || y >= size || alpha <= 0) return;
    const index = (y * size + x) * 4;
    const inv = 1 - alpha;
    image[index] = Math.round(r * alpha + image[index] * inv);
    image[index + 1] = Math.round(g * alpha + image[index + 1] * inv);
    image[index + 2] = Math.round(b * alpha + image[index + 2] * inv);
    image[index + 3] = Math.max(image[index + 3], Math.round(255 * alpha));
  };

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      // Rounded rectangle background (radius 28 in logo units).
      const radius = 28 * scale;
      const dx = Math.max(radius - x, 0, x - (size - 1 - radius));
      const dy = Math.max(radius - y, 0, y - (size - 1 - radius));
      const cornerDistance = Math.sqrt(dx * dx + dy * dy);
      if (cornerDistance > radius + 0.5) continue;

      // Vertical navy gradient (#1F3864 -> #0E1B33).
      const t = y / (size - 1);
      put(x, y, Math.round(0x1f + (0x0e - 0x1f) * t), Math.round(0x38 + (0x1b - 0x38) * t), Math.round(0x64 + (0x33 - 0x64) * t));

      // Orange location pin, centred slightly above middle.
      const px = x - cx;
      const py = y - 48 * scale;
      const pinTop = 20 * scale;
      const pinBottom = 76 * scale;
      const pinRadius = 19 * scale;
      if (py < 0) {
        // Round head of the pin.
        const head = Math.sqrt(px * px + py * py);
        const edge = pinRadius - head;
        if (edge > -0.5) {
          const alpha = Math.min(1, edge + 0.5);
          blend(x, y, 0xf5, 0xa6, 0x23, alpha);
        }
      } else if (py <= pinBottom - pinTop) {
        // Converging tail.
        const progress = py / (pinBottom - pinTop);
        const halfWidth = pinRadius * (1 - progress * (1 - 0.02));
        if (Math.abs(px) <= halfWidth + 0.5) {
          const alpha = Math.min(1, halfWidth + 0.5 - Math.abs(px));
          blend(x, y, 0xf5, 0xa6, 0x23, alpha);
        }
      }

      // Navy inner circle + orange road mark (same as the logo).
      const inner = Math.sqrt(px * px + (py + 0 * scale) * (py + 0 * scale));
      const innerRadius = 9 * scale;
      const innerDy = py + 38 * scale; // circle centre sits at (48, 38) in logo units
      const innerDistance = Math.sqrt(px * px + innerDy * innerDy);
      if (innerDistance <= innerRadius + 0.5) {
        const alpha = Math.min(1, innerRadius + 0.5 - innerDistance);
        blend(x, y, 0x1f, 0x38, 0x64, alpha);
        // Orange cross/road mark inside the circle.
        if (Math.abs(px) <= 1.6 * scale || Math.abs(innerDy + 6 * scale) <= 1.6 * scale) {
          blend(x, y, 0xf5, 0xa6, 0x23, 0.9);
        }
      }
    }
  }
  return image;
}

function pngForSize(size) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  const pixels = renderShield(size);
  for (let y = 0; y < size; y += 1) {
    raw[y * (size * 4 + 1)] = 0; // no filter
    pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync('public/icons', { recursive: true });
for (const size of [192, 512]) {
  writeFileSync(`public/icons/icon-${size}.png`, pngForSize(size));
  writeFileSync(`public/icons/icon-${size}-maskable.png`, pngForSize(size));
  console.log(`wrote public/icons/icon-${size}.png (+maskable)`);
}
