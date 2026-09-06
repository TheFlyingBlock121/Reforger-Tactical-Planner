const { app, BrowserWindow, dialog, ipcMain, globalShortcut, protocol, net, shell, screen, clipboard } = require("electron");
const fs = require("node:fs/promises");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

protocol.registerSchemesAsPrivileged([
  {
    scheme: "rtpmap",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true
    }
  }
]);

let mainWindow = null;
const mapPathCache = new Map();

const overlayState = {
  alwaysOnTop: false,
  opacity: 1,
  clickThrough: false,
  sideMode: false
};

let sideRestoreBounds = null;
let sideRestoreAlwaysOnTop = false;

function sendOverlayState() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("overlay:state", overlayState);
  }
}

function applyClickThrough(value) {
  overlayState.clickThrough = Boolean(value);
  if (!mainWindow || mainWindow.isDestroyed()) return;

  mainWindow.setIgnoreMouseEvents(overlayState.clickThrough, { forward: true });
  mainWindow.setFocusable(!overlayState.clickThrough);
  sendOverlayState();
}


function applySideMode(value) {
  const enabled = Boolean(value);
  if (!mainWindow || mainWindow.isDestroyed()) {
    overlayState.sideMode = enabled;
    return;
  }

  if (enabled === overlayState.sideMode) return;

  if (enabled) {
    sideRestoreBounds = mainWindow.getBounds();
    sideRestoreAlwaysOnTop = overlayState.alwaysOnTop;
    overlayState.sideMode = true;
    overlayState.alwaysOnTop = true;

    const display = screen.getDisplayMatching(mainWindow.getBounds());
    const area = display.workArea;
    const width = Math.max(360, Math.min(470, Math.round(area.width * 0.24)));
    const margin = 8;

    mainWindow.setMinimumSize(340, 500);
    mainWindow.setAlwaysOnTop(true, "screen-saver");
    mainWindow.setBounds({
      x: area.x + area.width - width - margin,
      y: area.y + margin,
      width,
      height: Math.max(520, area.height - margin * 2)
    }, true);
  } else {
    overlayState.sideMode = false;
    overlayState.alwaysOnTop = sideRestoreAlwaysOnTop;
    mainWindow.setMinimumSize(980, 620);
    mainWindow.setAlwaysOnTop(sideRestoreAlwaysOnTop, "screen-saver");
    if (sideRestoreBounds) mainWindow.setBounds(sideRestoreBounds, true);
    sideRestoreBounds = null;
  }

  sendOverlayState();
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1500,
    height: 900,
    minWidth: 980,
    minHeight: 620,
    backgroundColor: "#0b100e",
    frame: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.once("ready-to-show", () => mainWindow.show());

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    mainWindow.loadURL(devUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function uniqueRoots(items) {
  const seen = new Set();
  return items.filter((item) => item?.path).filter((item) => {
    const normalized = path.resolve(item.path).toLowerCase();
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

function mapRoots() {
  const roots = [];

  if (app.isPackaged) {
    // Finished v0.7 installer: both maps live under resources/maps.
    roots.push({
      path: path.join(process.resourcesPath, "maps"),
      label: "Built into installed application",
      builtIn: true,
      directTiles: false
    });
  } else {
    // Development source: the user drops PNGs directly into exactly two folders.
    roots.push({
      path: path.join(__dirname, "..", "BUILT_IN_MAP_TILES"),
      label: "Built-in map source folders",
      builtIn: true,
      directTiles: true
    });
  }

  // Optional custom map packs remain supported.
  roots.push({
    path: app.isPackaged
      ? path.join(app.getPath("userData"), "maps")
      : path.join(__dirname, "..", "custom-maps"),
    label: "Custom maps",
    builtIn: false,
    directTiles: false
  });

  return uniqueRoots(roots);
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readPngSize(filePath) {
  const handle = await fs.open(filePath, "r");
  try {
    const buffer = Buffer.alloc(24);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    if (bytesRead < 24) throw new Error("PNG header is too short");
    const signature = buffer.subarray(0, 8).toString("hex");
    if (signature !== "89504e470d0a1a0a") throw new Error("Not a PNG file");
    return {
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20)
    };
  } finally {
    await handle.close();
  }
}

function inferredMapConfig(packDir) {
  const lower = packDir.toLowerCase();
  if (lower.includes("serhiivka")) {
    return { id: "serhiivka", name: "Serhiivka", widthMeters: 10240, heightMeters: 10240, gridMeters: 1000 };
  }
  if (lower.includes("everon") || lower.includes("eden")) {
    return { id: "everon", name: "Everon / Eden", widthMeters: 12800, heightMeters: 12800, gridMeters: 1000 };
  }
  return null;
}

function parsePlannerJson(raw) {
  let text = String(raw ?? "").replace(/^\uFEFF/, "").trim();
  if (!text) throw new Error("file is empty");

  const attempts = [text];
  if (text.startsWith('"') && text.endsWith('"') && text.length > 2) {
    const unwrapped = text.slice(1, -1).trim();
    attempts.push(unwrapped);
    attempts.push(unwrapped.replace(/""/g, '"'));
  }

  let lastError = null;
  for (const candidate of attempts) {
    try {
      let parsed = JSON.parse(candidate);
      // Recover from a JSON file that was accidentally written as a JSON string.
      if (typeof parsed === "string") {
        const nested = parsed.replace(/^\uFEFF/, "").trim();
        parsed = JSON.parse(nested);
      }
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("map.json root must be an object");
      }
      return parsed;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("could not parse JSON");
}

async function scanPack(packDir, rootInfo) {
  const inferred = inferredMapConfig(packDir);
  let config = inferred || {};
  let manifestWarning = "";
  const inferredId = String(config.id || path.basename(packDir)).toLowerCase();
  const configPath = rootInfo.directTiles && inferred
    ? path.join(__dirname, "..", "builtin-map-manifests", inferredId, "map.json")
    : path.join(packDir, "map.json");
  if (await exists(configPath)) {
    try {
      config = { ...config, ...parsePlannerJson(await fs.readFile(configPath, "utf8")) };
    } catch (error) {
      const message = `Invalid map.json: ${error instanceof Error ? error.message : "parse error"}`;
      // Built-in maps have trusted dimensions inferred from their folder names, so a
      // damaged generated manifest must not make an otherwise valid map unusable.
      if (inferred) manifestWarning = `${message}. Built-in defaults are being used.`;
      else throw new Error(message);
    }
  }

  const id = String(config.id || path.basename(packDir)).toLowerCase();
  const tilesDir = rootInfo.directTiles ? packDir : path.join(packDir, "tiles");
  const lodDir = rootInfo.directTiles
    ? path.join(__dirname, "..", "generated-map-lod", id)
    : path.join(packDir, "lod");

  const base = {
    id,
    name: config.name || id,
    widthMeters: Number(config.widthMeters || 0),
    heightMeters: Number(config.heightMeters || 0),
    gridMeters: Number(config.gridMeters || 1000),
    ready: false,
    rootLabel: rootInfo.label,
    builtIn: Boolean(rootInfo.builtIn),
    tileCount: 0,
    expectedTileCount: 0,
    missingTileCount: 0,
    rows: 0,
    columns: 0,
    tileWidth: 0,
    tileHeight: 0,
    widthPixels: 0,
    heightPixels: 0,
    lodLevels: Number(config.lodLevels || 0),
    warning: manifestWarning || undefined
  };

  if (!(await exists(tilesDir))) {
    return { ...base, issue: "tiles folder is missing" };
  }

  const entries = await fs.readdir(tilesDir, { withFileTypes: true });
  const matches = [];
  const regex = /^tile_r(\d+)_c(\d+)\.png$/i;

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const match = regex.exec(entry.name);
    if (!match) continue;
    matches.push({
      name: entry.name,
      row: Number(match[1]),
      column: Number(match[2])
    });
  }

  if (!matches.length) {
    return { ...base, issue: "no tile_r###_c###.png files were found" };
  }

  const minRow = Math.min(...matches.map((item) => item.row));
  const minColumn = Math.min(...matches.map((item) => item.column));
  const maxRow = Math.max(...matches.map((item) => item.row));
  const maxColumn = Math.max(...matches.map((item) => item.column));
  const rows = maxRow + 1;
  const columns = maxColumn + 1;
  const expectedTileCount = rows * columns;
  const tileCount = matches.length;
  const tileKeys = new Set(matches.map((item) => `${item.row}:${item.column}`));
  let exactMissingTileCount = 0;
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      if (!tileKeys.has(`${row}:${column}`)) exactMissingTileCount += 1;
    }
  }

  let tileWidth = 0;
  let tileHeight = 0;
  let sizeIssue = "";

  try {
    const firstPath = path.join(tilesDir, matches[0].name);
    const size = await readPngSize(firstPath);
    tileWidth = size.width;
    tileHeight = size.height;

    // Check a few edge tiles as a cheap guard against accidentally mixed folders.
    const samples = [matches[0], matches[matches.length - 1], matches[Math.floor(matches.length / 2)]].filter(Boolean);
    for (const sample of samples) {
      const check = await readPngSize(path.join(tilesDir, sample.name));
      if (check.width !== tileWidth || check.height !== tileHeight) {
        sizeIssue = "tile dimensions are inconsistent";
        break;
      }
    }
  } catch (error) {
    sizeIssue = error instanceof Error ? error.message : "could not read tile dimensions";
  }

  const missingTileCount = exactMissingTileCount;
  let issue = sizeIssue;
  if (!issue && (minRow !== 0 || minColumn !== 0)) issue = "tile numbering must start at r000/c000";
  if (!issue && missingTileCount > 0) issue = `${missingTileCount} tile(s) are missing`;
  if (!issue && !(base.widthMeters > 0 && base.heightMeters > 0)) issue = "map.json needs widthMeters and heightMeters";

  return {
    ...base,
    ready: !issue && tileWidth > 0 && tileHeight > 0,
    tileCount,
    expectedTileCount,
    missingTileCount,
    rows,
    columns,
    tileWidth,
    tileHeight,
    widthPixels: columns * tileWidth,
    heightPixels: rows * tileHeight,
    firstTile: matches[0].name,
    lodLevels: Number(config.lodLevels || 0),
    issue: issue || undefined
  };
}

async function listMapPacks() {
  mapPathCache.clear();
  const results = [];
  const seen = new Set();

  for (const rootInfo of mapRoots()) {
    const root = rootInfo.path;
    if (!(await exists(root))) continue;
    let entries = [];
    try {
      entries = await fs.readdir(root, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const packDir = path.join(root, entry.name);
      const configPath = path.join(packDir, "map.json");
      const tilesPath = rootInfo.directTiles ? packDir : path.join(packDir, "tiles");
      const inferred = inferredMapConfig(packDir);

      // Known Everon/Serhiivka folders can be detected without a manifest.
      // Custom packs still use map.json so their real-world dimensions are explicit.
      if (rootInfo.directTiles) {
        if (!(inferred && await exists(tilesPath))) continue;
      } else if (!(await exists(configPath)) && !(inferred && await exists(tilesPath))) continue;

      try {
        const result = await scanPack(packDir, rootInfo);
        if (seen.has(result.id)) continue;
        seen.add(result.id);
        const lodDir = rootInfo.directTiles
          ? path.join(__dirname, "..", "generated-map-lod", result.id)
          : path.join(packDir, "lod");
        mapPathCache.set(result.id, { packDir, tilesDir: tilesPath, lodDir, directTiles: Boolean(rootInfo.directTiles) });
        results.push(result);
      } catch (error) {
        const fallback = inferred || { id: entry.name.toLowerCase(), name: entry.name, widthMeters: 0, heightMeters: 0, gridMeters: 1000 };
        if (seen.has(fallback.id)) continue;
        seen.add(fallback.id);
        results.push({
          ...fallback,
          ready: false,
          rootLabel: rootInfo.label,
          builtIn: Boolean(rootInfo.builtIn),
          tileCount: 0,
          expectedTileCount: 0,
          missingTileCount: 0,
          rows: 0,
          columns: 0,
          tileWidth: 0,
          tileHeight: 0,
          widthPixels: 0,
          heightPixels: 0,
          lodLevels: 0,
          issue: error instanceof Error ? error.message : "Could not read map pack"
        });
      }
    }
  }

  return results.sort((a, b) => Number(b.builtIn) - Number(a.builtIn) || a.name.localeCompare(b.name));
}

async function locatePack(id) {
  if (mapPathCache.has(id)) return mapPathCache.get(id);
  await listMapPacks();
  return mapPathCache.get(id) || null;
}

async function preferredEditableMapsRoot() {
  const root = app.isPackaged
    ? path.join(app.getPath("userData"), "maps")
    : path.join(__dirname, "..", "custom-maps");
  await fs.mkdir(root, { recursive: true });
  return root;
}

app.whenReady().then(async () => {
  protocol.handle("rtpmap", async (request) => {
    try {
      const url = new URL(request.url);
      if (url.hostname !== "maps") return new Response("Not found", { status: 404 });

      const parts = decodeURIComponent(url.pathname).split("/").filter(Boolean);
      const id = String(parts.shift() || "").toLowerCase();
      if (!id || !parts.length) return new Response("Not found", { status: 404 });

      const packLocation = await locatePack(id);
      if (!packLocation) return new Response("Map pack not installed", { status: 404 });

      let resolvedRoot = path.resolve(packLocation.packDir);
      let requestParts = [...parts];
      if (requestParts[0] === "tiles") {
        requestParts = requestParts.slice(1);
        resolvedRoot = path.resolve(packLocation.tilesDir);
      } else if (requestParts[0] === "lod") {
        requestParts = requestParts.slice(1);
        resolvedRoot = path.resolve(packLocation.lodDir || path.join(packLocation.packDir, "lod"));
      }
      const candidate = path.resolve(resolvedRoot, ...requestParts);
      if (candidate !== resolvedRoot && !candidate.startsWith(`${resolvedRoot}${path.sep}`)) {
        return new Response("Forbidden", { status: 403 });
      }

      if (!(await exists(candidate))) return new Response("Tile not found", { status: 404 });
      return net.fetch(pathToFileURL(candidate).toString());
    } catch {
      return new Response("Map request failed", { status: 500 });
    }
  });

  createWindow();

  globalShortcut.register("CommandOrControl+Shift+O", () => {
    applyClickThrough(!overlayState.clickThrough);
  });

  globalShortcut.register("CommandOrControl+Shift+S", () => {
    applySideMode(!overlayState.sideMode);
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.on("window:minimize", () => mainWindow?.minimize());
ipcMain.on("window:maximize", () => {
  if (!mainWindow) return;
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
});
ipcMain.on("window:close", () => mainWindow?.close());

ipcMain.handle("clipboard:writeText", (_event, value) => {
  clipboard.writeText(String(value || ""));
  return true;
});

ipcMain.handle("overlay:get", () => overlayState);

ipcMain.handle("overlay:alwaysOnTop", (_event, value) => {
  overlayState.alwaysOnTop = Boolean(value);
  mainWindow?.setAlwaysOnTop(overlayState.alwaysOnTop, "screen-saver");
  sendOverlayState();
  return overlayState;
});

ipcMain.handle("overlay:opacity", (_event, value) => {
  const opacity = Math.max(0.25, Math.min(1, Number(value) || 1));
  overlayState.opacity = opacity;
  mainWindow?.setOpacity(opacity);
  sendOverlayState();
  return overlayState;
});

ipcMain.handle("overlay:clickThrough", (_event, value) => {
  applyClickThrough(value);
  return overlayState;
});

ipcMain.handle("overlay:sideMode", (_event, value) => {
  applySideMode(value);
  return overlayState;
});

ipcMain.handle("maps:list", async () => listMapPacks());
ipcMain.handle("maps:openBuiltInSource", async () => {
  const root = app.isPackaged ? path.join(process.resourcesPath, "maps") : path.join(__dirname, "..", "BUILT_IN_MAP_TILES");
  await shell.openPath(root);
  return root;
});
ipcMain.handle("maps:openRoot", async () => {
  const root = await preferredEditableMapsRoot();
  await shell.openPath(root);
  return root;
});

ipcMain.handle("map:openImage", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Import tactical map image",
    properties: ["openFile"],
    filters: [
      { name: "Images", extensions: ["png", "jpg", "jpeg", "webp"] }
    ]
  });

  if (result.canceled || !result.filePaths[0]) return null;

  const filePath = result.filePaths[0];
  const bytes = await fs.readFile(filePath);
  const ext = path.extname(filePath).toLowerCase().replace(".", "");
  const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : `image/${ext}`;

  return {
    name: path.basename(filePath),
    dataUrl: `data:${mime};base64,${bytes.toString("base64")}`
  };
});

ipcMain.handle("plan:save", async (_event, payload) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: "Save tactical plan",
    defaultPath: `${payload?.missionName || "Operation"}.plan`,
    filters: [
      { name: "Reforger Tactical Plan", extensions: ["plan"] },
      { name: "JSON", extensions: ["json"] }
    ]
  });

  if (result.canceled || !result.filePath) return null;
  await fs.writeFile(result.filePath, JSON.stringify(payload, null, 2), "utf8");
  return result.filePath;
});

ipcMain.handle("plan:load", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Open tactical plan",
    properties: ["openFile"],
    filters: [
      { name: "Reforger Tactical Plan", extensions: ["plan", "json"] }
    ]
  });

  if (result.canceled || !result.filePaths[0]) return null;
  const filePath = result.filePaths[0];
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
});
