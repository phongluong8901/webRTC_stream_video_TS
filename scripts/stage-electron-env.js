/**
 * Copy proj_1/server/.env into electron-extra/ so electron-builder
 * can pack it (gitignored files are unreliable as direct extraResources).
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const src = path.join(root, "proj_1", "server", ".env");
const destDir = path.join(root, "electron-extra", "server");
const dest = path.join(destDir, ".env");

fs.mkdirSync(destDir, { recursive: true });

if (fs.existsSync(src)) {
  fs.copyFileSync(src, dest);
  console.log("Staged server .env -> electron-extra/server/.env");
} else {
  if (fs.existsSync(dest)) {
    fs.unlinkSync(dest);
  }
  // Keep the directory so extraResources "from" still exists.
  fs.writeFileSync(path.join(destDir, ".gitkeep"), "");
  console.warn(
    "WARNING: proj_1/server/.env not found. Packaged app will miss DB/auth config."
  );
}
