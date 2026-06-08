#!/usr/bin/env node
/**
 * Generates narration audio clips for all 4 radio vibes using ElevenLabs TTS.
 * Saves MP3s directly into public/audio/narration/{vibe}/ folders.
 *
 * Usage:
 *   node scripts/generate-narration-audio.mjs              # generate all
 *   node scripts/generate-narration-audio.mjs --list-voices # show available voice IDs
 *   node scripts/generate-narration-audio.mjs --vibe=hype  # one vibe only
 *   node scripts/generate-narration-audio.mjs --dry-run    # show what would be generated
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// Load .env.local
const envFile = path.join(ROOT, ".env.local");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf8").split("\n")) {
    const m = line.match(/^([^#=][^=]*)=(.*)$/);
    if (m) process.env[m[1].trim()] ??= m[2].trim().replace(/^["']|["']$/g, "");
  }
}

const API_KEY = process.env.ELEVENLABS_API_KEY?.trim();
if (!API_KEY) {
  console.error("❌  Missing ELEVENLABS_API_KEY in .env.local");
  process.exit(1);
}

const BASE_URL = "https://api.elevenlabs.io/v1";

// ─── Voice config ─────────────────────────────────────────────────────────────
// Run --list-voices to see all voices in your account with their IDs.
// Pre-made ElevenLabs voices (available on free tier):
//   Adam        → pNInz6obpgDQGcFmaJgB  (deep, narrator male)
//   Josh        → TxGEqnHWrfWFTfGW9XjX  (warm, smooth male)
//   Sam         → yoZ06aMxZJJ28mfd3POQ  (raspy, energetic male)
//   Rachel      → 21m00Tcm4TlvDq8ikWAM  (calm, clear female)
//   Elli        → MF3mGyEYCl7XYWbV9V9of (soft, emotional female)
//   Bella       → EXAVITQu4vr4xnSDxMaL  (warm, expressive female)
const VOICE_CONFIG = {
  hype: {
    voiceId: "yoZ06aMxZJJ28mfd3POQ", // Sam — raspy, punchy
    djName: "Rico Flame",
    settings: { stability: 0.35, similarity_boost: 0.75, style: 0.55, use_speaker_boost: true },
  },
  chill: {
    voiceId: "TxGEqnHWrfWFTfGW9XjX", // Josh — smooth, warm
    djName: "Nova Calm",
    settings: { stability: 0.75, similarity_boost: 0.6, style: 0.1, use_speaker_boost: false },
  },
  late_night: {
    voiceId: "21m00Tcm4TlvDq8ikWAM", // Rachel — intimate, feminine
    djName: "Velvet Rose",
    settings: { stability: 0.55, similarity_boost: 0.78, style: 0.45, use_speaker_boost: true },
  },
  emotional: {
    voiceId: "MF3mGyEYCl7XYWbV9V9of", // Elli — soft, reflective
    djName: "Luna Echo",
    settings: { stability: 0.7, similarity_boost: 0.65, style: 0.25, use_speaker_boost: false },
  },
};

// ─── Phrases ──────────────────────────────────────────────────────────────────
const PHRASES = {
  hype: [
    "FlowSoundz Radio. Keep it locked.",
    "You already know the energy. Let's go.",
    "Big motion. Next one coming in hot.",
    "That's what we do on FlowSoundz. Non-stop.",
    "Turn it up. This one hits different.",
    "You're in the right place. Let's ride.",
    "FlowSoundz Radio. Feel that energy.",
    "We keep the heat alive. All night.",
    "No breaks. No filler. Just fire.",
    "You locked in? Good. Stay there.",
    "FlowSoundz bringing the heat, back to back.",
    "This is the one. Turn it all the way up.",
    "No slow down. We run it back to back.",
    "Momentum. That is all we know.",
    "You already felt that. Hold on, there is more.",
    "Top tier music, top tier energy. FlowSoundz.",
    "The next one is crazy. Stay with me.",
    "FlowSoundz Radio. This is your station.",
  ],
  chill: [
    "You're locked into FlowSoundz Radio.",
    "Let it breathe. Let it ride.",
    "Smooth transition, smooth night.",
    "FlowSoundz Radio. Just let it play.",
    "We're not in a rush. Stay here.",
    "No interruptions. Just the music.",
    "FlowSoundz. Curated for nights like this.",
    "Take it easy. The next one sets the mood.",
    "This is where you stay.",
    "Clean sound. Good energy. FlowSoundz.",
    "There's no better soundtrack for right now.",
    "Stay close. We've got a good one next.",
    "FlowSoundz Radio. Nothing but the good stuff.",
    "Let the music do the work.",
    "Right here. Right now. FlowSoundz.",
    "Minimal words. Maximum vibe.",
    "FlowSoundz Radio. The smoothest rotation in the room.",
    "You're in good hands. Let it play.",
  ],
  late_night: [
    "You're with me tonight on FlowSoundz Radio.",
    "Stay close. I've got the next one for you.",
    "Late nights sound better like this.",
    "FlowSoundz after dark. Stay with me.",
    "This one was made for nights exactly like this.",
    "Don't go anywhere. The best part is coming.",
    "Let this one sink in.",
    "FlowSoundz Radio. Just you and the music.",
    "I'll keep it coming. You just listen.",
    "Something about late nights and good music.",
    "Turn the lights down. This one deserves it.",
    "You feel that? That's what I'm here for.",
    "FlowSoundz. Late night rotation, all night.",
    "This is the hour when the good records play.",
    "Stay right here. I've got you all night.",
    "FlowSoundz Radio. Soft nights, real music.",
    "You chose the right station for tonight.",
    "The vibe shifts now. Stay with it.",
  ],
  emotional: [
    "Some songs say what words can't.",
    "Take a breath. Stay in the moment.",
    "This is FlowSoundz Radio, after dark.",
    "Not every song needs an introduction.",
    "Let yourself feel this one.",
    "FlowSoundz Radio. Music that stays with you.",
    "This one was written for someone.",
    "The right song at the right moment.",
    "FlowSoundz. For the ones who really listen.",
    "Stay soft. Stay present. Stay here.",
    "There's something in this one. Give it space.",
    "FlowSoundz Radio. Playing what words can't say.",
    "Not everything needs to be explained.",
    "This is the music that remembers you.",
    "One more. Just for you.",
    "Some nights need exactly this.",
    "You don't have to explain why this hits.",
    "FlowSoundz. Real music for real moments.",
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function apiFetch(endpoint, options = {}) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: { "xi-api-key": API_KEY, "Content-Type": "application/json", ...options.headers },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`ElevenLabs ${res.status}: ${text}`);
  }
  return res;
}

async function listVoices() {
  const res = await apiFetch("/voices");
  const { voices } = await res.json();
  console.log("\nAvailable voices in your account:\n");
  for (const v of voices) {
    console.log(`  ${v.voice_id}  ${v.name}  (${v.labels?.accent ?? ""} ${v.labels?.gender ?? ""})`);
  }
  console.log("\nUpdate VOICE_CONFIG in this script with the IDs you want per vibe.\n");
}

async function checkCredits() {
  try {
    const res = await apiFetch("/user/subscription");
    const sub = await res.json();
    const used = sub.character_count ?? 0;
    const limit = sub.character_limit ?? 10000;
    return { used, limit, remaining: limit - used };
  } catch {
    return null;
  }
}

async function generateClip(text, voiceId, settings) {
  const res = await apiFetch(`/text-to-speech/${voiceId}`, {
    method: "POST",
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: settings,
    }),
    headers: { Accept: "audio/mpeg" },
  });
  return Buffer.from(await res.arrayBuffer());
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const listVoicesFlag = args.includes("--list-voices");
const vibeFilter = args.find((a) => a.startsWith("--vibe="))?.split("=")[1];

if (listVoicesFlag) {
  await listVoices();
  process.exit(0);
}

const totalChars = Object.values(PHRASES).flat().reduce((s, p) => s + p.length, 0);
const credits = await checkCredits();

if (credits) {
  console.log(`\nElevenLabs credits: ${credits.used.toLocaleString()} used / ${credits.limit.toLocaleString()} limit (${credits.remaining.toLocaleString()} remaining)`);
  if (credits.remaining < totalChars) {
    console.error(`❌  Not enough credits. Need ${totalChars}, have ${credits.remaining}.`);
    process.exit(1);
  }
} else {
  console.log(`\nCredit check skipped (restricted key).`);
}
console.log(`This run will use: ~${totalChars.toLocaleString()} characters\n`);

if (isDryRun) {
  console.log("DRY RUN — no audio generated.\n");
  for (const [vibe, phrases] of Object.entries(PHRASES)) {
    if (vibeFilter && vibe !== vibeFilter) continue;
    const cfg = VOICE_CONFIG[vibe];
    const chars = phrases.reduce((s, p) => s + p.length, 0);
    console.log(`${vibe} (${cfg.djName}, voice ${cfg.voiceId}) — ${phrases.length} phrases, ${chars} chars`);
    for (const [i, p] of phrases.entries()) {
      console.log(`  ${vibe}_${i + 1}.mp3  "${p}"`);
    }
  }
  process.exit(0);
}

let generated = 0;
let failed = 0;

for (const [vibe, phrases] of Object.entries(PHRASES)) {
  if (vibeFilter && vibe !== vibeFilter) continue;

  const cfg = VOICE_CONFIG[vibe];
  const outDir = path.join(ROOT, "public", "audio", "narration", vibe);
  fs.mkdirSync(outDir, { recursive: true });

  console.log(`\n▶  ${vibe.toUpperCase()}  (${cfg.djName})`);

  for (const [i, text] of phrases.entries()) {
    const filename = `${vibe}_${i + 1}.mp3`;
    const outPath = path.join(outDir, filename);

    if (fs.existsSync(outPath)) {
      console.log(`   skip  ${filename}  (exists)`);
      continue;
    }

    process.stdout.write(`   gen   ${filename}  "${text.slice(0, 50)}"… `);
    try {
      const audio = await generateClip(text, cfg.voiceId, cfg.settings);
      fs.writeFileSync(outPath, audio);
      console.log(`✓`);
      generated++;
    } catch (err) {
      console.log(`✗  ${err.message}`);
      failed++;
    }

    // Small delay to avoid rate-limiting
    await new Promise((r) => setTimeout(r, 300));
  }
}

console.log(`\n✅  Done: ${generated} generated, ${failed} failed.\n`);

if (generated > 0) {
  console.log("Rebuilding narration manifest…");
  execSync("node scripts/generate-narration-manifest.mjs", {
    cwd: ROOT,
    stdio: "inherit",
  });
  console.log("✅  Manifest updated.\n");
}
