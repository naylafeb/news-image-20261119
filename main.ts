import { accessSync, constants, copyFileSync, existsSync, mkdirSync, readFileSync, statSync } from "node:fs";

// Round 1 entry for news-image-20261119: "THE GLOBAL HERALD — THE DAY
// THE WORLD MET IN SHENZHEN". The front page is drawn ahead of time
// (see dev/draw_frontpage.py in the workspace): 46 real, date-checked
// stories from Thursday 19 November 2026 across 7 regions. The visual
// spine is drawn, not typed: two hero scenes (the first-ever Trump-Xi-
// Putin three-way summit in Shenzhen; the GTA VI launch in neon Vice
// City), a drawn world strip with the day's nine hotspots numbered, a
// day-in-order strip of 8 beats, and a two-column region grid.
// This program only hands the finished image in, byte for byte.

const OUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
const SOURCE = new URL("./entry.png", import.meta.url);

function fail(message: string): never {
  throw new Error(`news-image-20261119 round 1: ${message}`);
}

// The entry image must sit in the repository next to this file.
if (!existsSync(SOURCE)) {
  fail("entry.png is missing from the entry directory");
}

const image = readFileSync(SOURCE);
if (image.length === 0) {
  fail("entry.png is empty");
}

// The competition caps the image at 1 MiB; a bigger file is refused by
// the gate outright, so catch it here with the actual byte count.
if (image.length > 1048576) {
  fail(`entry.png is ${image.length} bytes, over the 1 MiB cap`);
}

// Only a PNG or a JPEG may be handed in; anything else is not an image
// the gate accepts, so refuse it here instead of shipping bad bytes.
const isPng =
  image[0] === 0x89 && image[1] === 0x50 &&
  image[2] === 0x4e && image[3] === 0x47;
const isJpeg =
  image[0] === 0xff && image[1] === 0xd8 && image[2] === 0xff;
if (!isPng && !isJpeg) {
  fail("entry.png is not a PNG or JPEG file");
}

// A PNG stores its width and height as big-endian uint32 values at bytes
// 16-19 and 20-23, right after the IHDR length and type. The competition
// caps the image at 1024x1024 and this page is drawn at exactly that
// size, so a PNG of any other size is a wrong file, not a valid entry.
if (isPng) {
  const width = image.readUInt32BE(16);
  const height = image.readUInt32BE(20);
  if (width !== 1024 || height !== 1024) {
    fail(`entry.png is ${width}x${height}, expected 1024x1024`);
  }
}

const target = `${OUT_DIR}/entry.png`;

// The output directory may not exist yet when the harness points at a
// fresh temp dir, and the copy would then fail with a bare ENOENT.
// Create it (with any missing parents) and refuse to continue if it
// still cannot be written to, instead of handing in nothing.
mkdirSync(OUT_DIR, { recursive: true });
try {
  accessSync(OUT_DIR, constants.W_OK);
} catch {
  fail(`output directory ${OUT_DIR} is not writable`);
}

copyFileSync(SOURCE, target);

// Confirm the copy landed whole: the output must be the same size as
// the source, or the run did not really hand the image in.
if (statSync(target).size !== image.length) {
  fail(`copied entry.png is incomplete (${statSync(target).size} of ${image.length} bytes)`);
}
console.log(`copied entry.png (${image.length} bytes, 1024x1024) to ${target}`);
