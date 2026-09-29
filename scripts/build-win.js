/**
 * Build Windows installer to TEMP (avoids IDE file locks in the repo),
 * then copy artifacts into ./release.
 */
const { spawnSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const root = path.join(__dirname, "..");
const outDir = path.join(
  process.env.LOCALAPPDATA || path.join(process.env.TEMP || "C:\\Temp"),
  "Temp",
  "videocall_electron_build"
);

fs.mkdirSync(outDir, { recursive: true });

const result = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["electron-builder", "--win", `--config.directories.output=${outDir}`],
  { cwd: root, stdio: "inherit", shell: true, env: process.env }
);

if (result.status !== 0) {
  process.exit(result.status || 1);
}

process.env.ELECTRON_BUILD_OUT = outDir;
require("./copy-electron-release.js");
