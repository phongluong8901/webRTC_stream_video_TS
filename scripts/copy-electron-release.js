/**
 * Copy installer from TEMP build dir into ./release
 * (building into the repo folder often fails on Windows with EBUSY/EPERM locks).
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const srcDir =
  process.env.ELECTRON_BUILD_OUT ||
  path.join(process.env.LOCALAPPDATA || "", "Temp", "videocall_electron_build");
const releaseDir = path.join(root, "release");

fs.mkdirSync(releaseDir, { recursive: true });

const setupName = "VideoCallingApp Setup 1.0.0.exe";
const setupSrc = path.join(srcDir, setupName);
const appSrc = path.join(srcDir, "win-unpacked", "VideoCallingApp.exe");

if (!fs.existsSync(setupSrc)) {
  console.error("Installer not found:", setupSrc);
  process.exit(1);
}

fs.copyFileSync(setupSrc, path.join(releaseDir, setupName));
console.log("Copied:", path.join(releaseDir, setupName));

if (fs.existsSync(appSrc)) {
  fs.copyFileSync(appSrc, path.join(releaseDir, "VideoCallingApp.exe"));
  console.log("Copied:", path.join(releaseDir, "VideoCallingApp.exe"));
  console.log(
    "Note: VideoCallingApp.exe in release/ needs the full win-unpacked folder to run. Prefer the Setup installer."
  );
}

console.log("Done. Install from release\\VideoCallingApp Setup 1.0.0.exe");
