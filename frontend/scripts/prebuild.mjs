import { spawnSync } from "node:child_process";

function windowsCommand(command, args) {
  return [command, ...args].join(" ");
}

function run(command, args, options = {}) {
  const result =
    process.platform === "win32"
      ? spawnSync(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", windowsCommand(command, args)], {
          stdio: "inherit",
          ...options,
        })
      : spawnSync(command, args, {
          stdio: "inherit",
          ...options,
        });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run("npm", ["run", "prisma:generate"]);
run("node", ["scripts/generate-narration-manifest.mjs"]);
run("node", ["scripts/generate-bed-manifest.mjs"]);

if (process.env.VERCEL === "1") {
  run("npx", ["prisma", "db", "push", "--accept-data-loss"]);
}
