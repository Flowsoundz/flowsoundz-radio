import { mkdtemp, rm, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pg from "pg";
import { put } from "@vercel/blob";
import { masterToTarget, probeDurationSec } from "./audio.js";

const DATABASE_URL = process.env.DATABASE_URL;
const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
const POLL_MS = Number(process.env.POLL_MS ?? 8000);
const RUN_ONCE = process.env.RUN_ONCE === "1";

if (!DATABASE_URL) throw new Error("DATABASE_URL is required");
if (!BLOB_TOKEN) throw new Error("BLOB_READ_WRITE_TOKEN is required");

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  max: 2,
  ssl: DATABASE_URL.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined,
});

const log = (...a) => console.log(new Date().toISOString(), ...a);

// Atomically claim the oldest queued track. FOR UPDATE SKIP LOCKED means two
// worker instances never grab the same row, so this scales horizontally.
async function claimNextJob() {
  const { rows } = await pool.query(`
    UPDATE songs SET "packagingStatus" = 'PROCESSING'
    WHERE id = (
      SELECT id FROM songs
      WHERE "packagingStatus" = 'PENDING' AND "sourceAudioUrl" IS NOT NULL
      ORDER BY "createdAt" ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    RETURNING id, title, "sourceAudioUrl", slug;
  `);
  return rows[0] ?? null;
}

async function markReady(id, publicAudioUrl, durationSec) {
  await pool.query(
    `UPDATE songs
       SET "publicAudioUrl" = $1, "durationSec" = $2,
           "packagingStatus" = 'READY', "packagingError" = NULL
     WHERE id = $3`,
    [publicAudioUrl, durationSec, id],
  );
}

async function markFailed(id, message) {
  await pool.query(
    `UPDATE songs SET "packagingStatus" = 'FAILED', "packagingError" = $1 WHERE id = $2`,
    [message.slice(0, 480), id],
  );
}

async function fetchSourceToFile(url, destPath) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`source fetch ${res.status} for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 1024) throw new Error("source audio too small / empty");
  await writeFile(destPath, buf);
}

async function processJob(job) {
  const dir = await mkdtemp(join(tmpdir(), "fsz-master-"));
  try {
    const inputPath = join(dir, "input");
    const outputPath = join(dir, "master.mp3");

    log(`[${job.id}] fetching source: ${job.sourceAudioUrl}`);
    await fetchSourceToFile(job.sourceAudioUrl, inputPath);

    log(`[${job.id}] mastering "${job.title}" → -14 LUFS`);
    await masterToTarget(inputPath, outputPath);
    const durationSec = await probeDurationSec(outputPath);

    const data = await readFile(outputPath);
    const key = `masters/${job.slug || job.id}-${Date.now()}.mp3`;
    log(`[${job.id}] uploading master (${(data.length / 1024 / 1024).toFixed(2)}MB) → ${key}`);
    const blob = await put(key, data, {
      access: "public",
      contentType: "audio/mpeg",
      token: BLOB_TOKEN,
    });

    await markReady(job.id, blob.url, durationSec);
    log(`[${job.id}] READY · ${durationSec}s · ${blob.url}`);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function tick() {
  const job = await claimNextJob();
  if (!job) return false;
  try {
    await processJob(job);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log(`[${job.id}] FAILED: ${message}`);
    await markFailed(job.id, message).catch(() => {});
  }
  return true;
}

async function main() {
  log(`FlowSoundz mastering worker up (poll ${POLL_MS}ms${RUN_ONCE ? ", run-once" : ""})`);
  if (RUN_ONCE) {
    await tick();
    await pool.end();
    return;
  }
  // Drain the queue, then idle-poll. Keep looping while jobs exist so a backlog
  // clears fast instead of one-per-interval.
  for (;;) {
    let worked = false;
    try {
      worked = await tick();
    } catch (err) {
      log("tick error:", err instanceof Error ? err.message : err);
    }
    if (!worked) await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

main().catch((err) => {
  log("fatal:", err);
  process.exit(1);
});
