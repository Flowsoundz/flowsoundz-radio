import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const narrationRoot = path.join(projectRoot, "public", "audio", "narration");
const outputDir = path.join(projectRoot, "lib", "generated");
const outputFile = path.join(outputDir, "narrationManifest.ts");
const vibes = ["hype", "chill", "late_night", "emotional", "all"];
const allowedExtensions = new Set([".mp3", ".wav", ".m4a", ".aac", ".ogg"]);

function readNarrationFiles(vibe) {
  const directory = path.join(narrationRoot, vibe);

  try {
    return readdirSync(directory, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((fileName) => allowedExtensions.has(path.extname(fileName).toLowerCase()))
      .sort((left, right) => left.localeCompare(right));
  } catch {
    return [];
  }
}

const manifest = Object.fromEntries(vibes.map((vibe) => [vibe, readNarrationFiles(vibe)]));

const fileContents = `export const NARRATION_FILE_MANIFEST = ${JSON.stringify(
  manifest,
  null,
  2,
)} as const;
`;

mkdirSync(outputDir, { recursive: true });
writeFileSync(outputFile, fileContents);

console.log("[generate-narration-manifest] wrote manifest", {
  outputFile,
  counts: Object.fromEntries(vibes.map((vibe) => [vibe, manifest[vibe].length])),
});
