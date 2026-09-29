const { app, BrowserWindow, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
const http = require("http");

// 8080 tren may nay dang bi EDB Postgres chiem -> dung port rieng cho desktop app
const DEFAULT_PORT = "18080";
const CLIENT_DEV_URL = "http://localhost:3000";
const HEALTH_PATH = "/api/health";
const forceDev = process.argv.includes("--dev");
const forceStandalone = process.argv.includes("--standalone");

let SERVER_PORT = process.env.PORT || DEFAULT_PORT;
let SERVER_URL = `http://localhost:${SERVER_PORT}`;

let mainWindow = null;
let serverProc = null;
let peerProc = null;
let spawnedBackend = false;

function resourceRoot(...parts) {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, ...parts);
  }
  return path.join(__dirname, "proj_1", ...parts);
}

function httpGetJson(url, timeoutMs = 800) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      let raw = "";
      res.on("data", (chunk) => {
        raw += chunk;
      });
      res.on("end", () => {
        resolve({ status: res.statusCode || 0, body: raw });
      });
    });
    req.on("error", () => resolve(null));
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      resolve(null);
    });
  });
}

function isReachable(url, timeoutMs = 800) {
  return httpGetJson(url, timeoutMs).then((r) => Boolean(r));
}

async function isOurServer(baseUrl) {
  const result = await httpGetJson(`${baseUrl}${HEALTH_PATH}`);
  if (!result || result.status !== 200) return false;
  try {
    const data = JSON.parse(result.body);
    return data && data.ok === true && data.app === "videocalling";
  } catch {
    return false;
  }
}

async function waitForOurServer(baseUrl, retries = 80, delayMs = 250) {
  for (let i = 0; i < retries; i += 1) {
    if (await isOurServer(baseUrl)) return;
    await new Promise((r) => setTimeout(r, delayMs));
  }
  throw new Error(
    `VideoCalling server khong san sang tai ${baseUrl}${HEALTH_PATH}.\n` +
      `Co the port ${SERVER_PORT} dang bi app khac chiem (vd EDB Postgres tren 8080).`
  );
}

function spawnNodeScript(args, cwd, extraEnv = {}) {
  return spawn(process.execPath, args, {
    cwd,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      ...extraEnv,
    },
    stdio: "inherit",
  });
}

function resolveRunnable(dir, distRel, srcRel) {
  const distPath = path.join(dir, distRel);
  if (fs.existsSync(distPath)) {
    return { args: [distPath], label: distPath };
  }

  const srcPath = path.join(dir, srcRel);
  const tsxCli = path.join(dir, "node_modules", "tsx", "dist", "cli.mjs");
  if (fs.existsSync(srcPath) && fs.existsSync(tsxCli)) {
    return { args: [tsxCli, srcPath], label: srcPath };
  }

  return null;
}

function startBackend() {
  const serverDir = resourceRoot("server");
  const peerDir = resourceRoot("peerjs");
  const clientBuild = app.isPackaged
    ? path.join(process.resourcesPath, "client-build")
    : path.join(__dirname, "proj_1", "client", "build");

  const peerRun = resolveRunnable(peerDir, path.join("dist", "index.js"), path.join("src", "index.ts"));
  const serverRun = resolveRunnable(
    serverDir,
    path.join("dist", "index.js"),
    path.join("src", "index.ts")
  );

  if (!peerRun || !serverRun) {
    const missing = [
      !peerRun ? `PeerJS entry missing in ${peerDir}` : null,
      !serverRun ? `Server entry missing in ${serverDir}` : null,
    ]
      .filter(Boolean)
      .join("\n");
    throw new Error(missing);
  }

  if (!fs.existsSync(clientBuild)) {
    throw new Error(
      `Client build missing at ${clientBuild}. Chay: npm run build:client`
    );
  }

  peerProc = spawnNodeScript(peerRun.args, peerDir);
  serverProc = spawnNodeScript(serverRun.args, serverDir, {
    PORT: SERVER_PORT,
    SERVE_CLIENT: "1",
    CLIENT_BUILD_PATH: clientBuild,
    CLIENT_ORIGIN: SERVER_URL,
    EMAIL_VERIFICATION_URL: `${SERVER_URL}/verify-email`,
    DOTENV_CONFIG_PATH: path.join(serverDir, ".env"),
  });

  spawnedBackend = true;

  peerProc.on("exit", (code, signal) => {
    console.error(`PeerJS exited (code=${code}, signal=${signal})`);
  });
  serverProc.on("exit", (code, signal) => {
    console.error(`Server exited (code=${code}, signal=${signal})`);
  });
}

function waitForServerProcessOrReady(baseUrl) {
  return new Promise(async (resolve, reject) => {
    let settled = false;

    const onExit = (code, signal) => {
      if (settled) return;
      settled = true;
      reject(
        new Error(
          `Backend thoat som (code=${code}, signal=${signal}).\n` +
            `Thuong do MongoDB/.env. Kiem tra mang + MONGODB_URI trong proj_1/server/.env`
        )
      );
    };

    if (serverProc) {
      serverProc.once("exit", onExit);
    }

    try {
      await waitForOurServer(baseUrl);
      if (settled) return;
      settled = true;
      if (serverProc) serverProc.off("exit", onExit);
      resolve();
    } catch (error) {
      if (settled) return;
      settled = true;
      if (serverProc) serverProc.off("exit", onExit);
      reject(error);
    }
  });
}

function stopBackend() {
  if (!spawnedBackend) return;
  if (serverProc && !serverProc.killed) {
    serverProc.kill();
    serverProc = null;
  }
  if (peerProc && !peerProc.killed) {
    peerProc.kill();
    peerProc = null;
  }
}

function showStartError(error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error("Failed to start app:", message);
  dialog.showErrorBox(
    "VideoCallingApp failed to start",
    `${message}\n\nGoi y:\n` +
      `- Port 8080 tren may ban dang la EDB Postgres, app desktop dung 18080\n` +
      `- Chay: npm run build:app  roi  npm run start:standalone\n` +
      `- Hoac cai lai tu release\\VideoCallingApp Setup 1.0.0.exe sau khi rebuild`
  );
}

async function resolveLoadUrl() {
  const useStandalone = app.isPackaged || forceStandalone;

  // Dev: neu React dang chay thi mo UI web (khong dung port backend la)
  if (forceDev || !useStandalone) {
    if (await isReachable(CLIENT_DEV_URL)) {
      console.log(`Loading existing web client at ${CLIENT_DEV_URL}`);
      return CLIENT_DEV_URL;
    }
    if (forceDev) {
      throw new Error(
        "Khong thay React o http://localhost:3000. Hay chay: cd proj_1/client && yarn start"
      );
    }
    console.log("localhost:3000 not up, starting standalone backend...");
  }

  const clientBuild = app.isPackaged
    ? path.join(process.resourcesPath, "client-build")
    : path.join(__dirname, "proj_1", "client", "build");

  if (!fs.existsSync(clientBuild)) {
    throw new Error(
      `Client build missing at ${clientBuild}. Chay: npm run build:client`
    );
  }

  // Chi reuse neu DUNG server cua minh (co /api/health)
  if (await isOurServer(SERVER_URL)) {
    console.log(`Reusing VideoCalling server at ${SERVER_URL}`);
    return SERVER_URL;
  }

  // Neu port dang bi app khac (EDB...) -> bao loi ro, khong load nham
  if (await isReachable(SERVER_URL)) {
    throw new Error(
      `Port ${SERVER_PORT} dang bi process khac chiem (khong phai VideoCalling).\n` +
        `Tren may ban, 8080 thuong la EDB Postgres.\n` +
        `App desktop mac dinh dung port ${DEFAULT_PORT}.`
    );
  }

  startBackend();
  await waitForServerProcessOrReady(SERVER_URL);
  return SERVER_URL;
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    title: "VideoCallingApp",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.webContents.session.setPermissionRequestHandler(
    (_webContents, permission, callback) => {
      callback(permission === "media");
    }
  );

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  const url = await resolveLoadUrl();
  await mainWindow.loadURL(url);
  mainWindow.setTitle("VideoCallingApp");
}

app.whenReady().then(async () => {
  try {
    await createWindow();
  } catch (error) {
    showStartError(error);
    app.quit();
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow().catch((error) => {
        showStartError(error);
      });
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  stopBackend();
});
