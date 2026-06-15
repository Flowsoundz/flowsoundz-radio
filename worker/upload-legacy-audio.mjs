// One-off: upload the legacy in-repo catalog audio to the public Blob store so
// it can be removed from the git build. Deterministic keys (addRandomSuffix:
// false) so /audio/x.mp3 -> {base}/audio/x.mp3 stays stable.
//
// Run from worker/: set -a; . ./.env; set +a; node upload-legacy-audio.mjs
import { put } from "@vercel/blob";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
if (!TOKEN) {
  console.error("BLOB_READ_WRITE_TOKEN missing — source worker/.env first.");
  process.exit(1);
}

const FRONTEND = path.resolve(import.meta.dirname, "../frontend/public");
const DIRS = [
  { dir: path.join(FRONTEND, "audio"), prefix: "audio" },
  { dir: path.join(FRONTEND, "archive"), prefix: "archive" },
];

const manifest = {};
let base = null;
let total = 0;
let bytes = 0;

for (const { dir, prefix } of DIRS) {
  let files;
  try {
    files = (await readdir(dir)).filter((f) => f.toLowerCase().endsWith(".mp3"));
  } catch {
    console.warn(`skip ${dir} (not found)`);
    continue;
  }
  for (const file of files) {
    const data = await readFile(path.join(dir, file));
    const key = `${prefix}/${file}`;
    const blob = await put(key, data, {
      access: "public",
      contentType: "audio/mpeg",
      token: TOKEN,
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    manifest[`/${prefix}/${file}`] = blob.url;
    if (!base) {
      const u = new URL(blob.url);
      base = `${u.protocol}//${u.host}`;
    }
    total += 1;
    bytes += data.length;
    process.stdout.write(`  ✓ ${key}\n`);
  }
}

console.log(`\nUploaded ${total} files (${(bytes / 1024 / 1024).toFixed(1)}MB).`);
console.log(`BASE = ${base}`);
// Sanity: confirm a known file maps to {base}/audio/<name>
const sample = Object.entries(manifest)[0];
if (sample) console.log(`sample: ${sample[0]} -> ${sample[1]}`);
