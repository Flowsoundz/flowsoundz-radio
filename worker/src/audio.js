import { spawn } from "node:child_process";

// Target loudness for streaming/radio consistency. -14 LUFS integrated with a
// -1 dBTP ceiling is the de-facto streaming standard (Spotify/Apple/YouTube
// all normalize near here), so tracks from mixed AI sources stop jumping in
// volume between songs.
export const TARGET_LUFS = -14;
export const TARGET_TP = -1;
export const TARGET_LRA = 11;

function run(cmd, args, { capture = "stderr" } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args);
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => (out += d.toString()));
    child.stderr.on("data", (d) => (err += d.toString()));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`${cmd} exited ${code}: ${(err || out).slice(-500)}`));
        return;
      }
      resolve(capture === "stdout" ? out : err);
    });
  });
}

// Pull the trailing JSON object printed by loudnorm's analysis pass.
function parseLoudnormJson(stderr) {
  const start = stderr.lastIndexOf("{");
  const end = stderr.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("loudnorm analysis produced no JSON");
  }
  return JSON.parse(stderr.slice(start, end + 1));
}

// Two-pass EBU R128 loudness normalization. Pass 1 measures, pass 2 applies the
// measured values linearly so the result lands precisely on target without
// dynamic pumping. Produces a 44.1kHz 192kbps MP3 master.
export async function masterToTarget(inputPath, outputPath) {
  const measureArgs = [
    "-hide_banner", "-i", inputPath,
    "-af", `loudnorm=I=${TARGET_LUFS}:TP=${TARGET_TP}:LRA=${TARGET_LRA}:print_format=json`,
    "-f", "null", "-",
  ];
  const measured = parseLoudnormJson(await run("ffmpeg", measureArgs));

  const applyFilter =
    `loudnorm=I=${TARGET_LUFS}:TP=${TARGET_TP}:LRA=${TARGET_LRA}` +
    `:measured_I=${measured.input_i}` +
    `:measured_TP=${measured.input_tp}` +
    `:measured_LRA=${measured.input_lra}` +
    `:measured_thresh=${measured.input_thresh}` +
    `:offset=${measured.target_offset}` +
    `:linear=true:print_format=summary`;

  await run("ffmpeg", [
    "-hide_banner", "-y", "-i", inputPath,
    "-af", applyFilter,
    "-ar", "44100", "-c:a", "libmp3lame", "-b:a", "192k",
    outputPath,
  ]);

  return { measured };
}

// Exact duration of the finished master — this is what the station clock
// schedules against, so we read it from the output, not the noisy source.
export async function probeDurationSec(path) {
  const out = await run(
    "ffprobe",
    ["-v", "error", "-show_entries", "format=duration", "-of", "json", path],
    { capture: "stdout" },
  );
  const dur = JSON.parse(out)?.format?.duration;
  const sec = Math.round(Number(dur));
  if (!Number.isFinite(sec) || sec <= 0) throw new Error(`ffprobe gave no duration for ${path}`);
  return sec;
}
