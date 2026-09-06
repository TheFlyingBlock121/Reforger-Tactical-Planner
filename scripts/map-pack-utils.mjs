import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

export const KNOWN_MAPS = {
  everon: {
    id: "everon",
    name: "Everon / Eden",
    widthMeters: 12800,
    heightMeters: 12800,
    gridMeters: 1000,
    aliases: ["everon", "eden"]
  },
  serhiivka: {
    id: "serhiivka",
    name: "Serhiivka",
    widthMeters: 10240,
    heightMeters: 10240,
    gridMeters: 1000,
    aliases: ["serhiivka"]
  }
};

export async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function readPngSize(filePath) {
  const handle = await fs.open(filePath, "r");
  try {
    const buffer = Buffer.alloc(24);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    if (bytesRead < 24) throw new Error("PNG header is too short");
    if (buffer.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") {
      throw new Error("Not a PNG file");
    }
    return {
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20)
    };
  } finally {
    await handle.close();
  }
}

export async function inspectTileDirectory(tilesDir) {
  const entries = await fs.readdir(tilesDir, { withFileTypes: true });
  const regex = /^tile_r(\d+)_c(\d+)\.png$/i;
  const tiles = [];

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const match = regex.exec(entry.name);
    if (!match) continue;
    tiles.push({
      name: entry.name,
      row: Number(match[1]),
      column: Number(match[2])
    });
  }

  if (!tiles.length) {
    throw new Error(`No tile_r###_c###.png files found in ${tilesDir}`);
  }

  tiles.sort((a, b) => a.row - b.row || a.column - b.column);
  const minRow = Math.min(...tiles.map((t) => t.row));
  const minColumn = Math.min(...tiles.map((t) => t.column));
  const maxRow = Math.max(...tiles.map((t) => t.row));
  const maxColumn = Math.max(...tiles.map((t) => t.column));

  if (minRow !== 0 || minColumn !== 0) {
    throw new Error(`Tile numbering must start at r000/c000 (found r${minRow}/c${minColumn}).`);
  }

  const rows = maxRow + 1;
  const columns = maxColumn + 1;
  const expectedTileCount = rows * columns;
  const keys = new Set(tiles.map((t) => `${t.row}:${t.column}`));
  const missing = [];

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      if (!keys.has(`${row}:${column}`)) {
        missing.push(`tile_r${String(row).padStart(3, "0")}_c${String(column).padStart(3, "0")}.png`);
      }
    }
  }

  const firstSize = await readPngSize(path.join(tilesDir, tiles[0].name));
  const samples = [
    tiles[0],
    tiles[Math.floor(tiles.length / 2)],
    tiles[tiles.length - 1]
  ].filter(Boolean);

  for (const sample of samples) {
    const size = await readPngSize(path.join(tilesDir, sample.name));
    if (size.width !== firstSize.width || size.height !== firstSize.height) {
      throw new Error(`Inconsistent tile size: ${sample.name} is ${size.width}x${size.height}, expected ${firstSize.width}x${firstSize.height}.`);
    }
  }

  let totalBytes = 0;
  for (const tile of tiles) {
    const stat = await fs.stat(path.join(tilesDir, tile.name));
    totalBytes += stat.size;
  }

  return {
    tiles,
    tileCount: tiles.length,
    expectedTileCount,
    missing,
    rows,
    columns,
    tileWidth: firstSize.width,
    tileHeight: firstSize.height,
    widthPixels: columns * firstSize.width,
    heightPixels: rows * firstSize.height,
    totalBytes
  };
}

export function classifyPath(candidatePath) {
  const lower = candidatePath.toLowerCase();
  if (lower.includes("serhiivka")) return "serhiivka";
  if (lower.includes("everon") || lower.includes("eden")) return "everon";
  return null;
}

export async function resolveTilesDir(inputPath) {
  if (!inputPath) return null;
  const resolved = path.resolve(inputPath);
  if (!(await exists(resolved))) return null;

  const direct = await fs.readdir(resolved, { withFileTypes: true }).catch(() => []);
  if (direct.some((e) => e.isFile() && /^tile_r\d+_c\d+\.png$/i.test(e.name))) {
    return resolved;
  }

  const capture = path.join(resolved, "capture_tiles");
  if (await exists(capture)) return capture;

  const tiles = path.join(resolved, "tiles");
  if (await exists(tiles)) return tiles;

  return null;
}

async function walkForCaptureTiles(root, maxDepth = 8) {
  const results = [];
  const queue = [{ dir: root, depth: 0 }];
  const skip = new Set(["node_modules", ".git", "addons", "cache", "temp", "tmp"]);

  while (queue.length) {
    const { dir, depth } = queue.shift();
    if (depth > maxDepth) continue;

    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const child = path.join(dir, entry.name);
      if (entry.name.toLowerCase() === "capture_tiles") {
        results.push(child);
        continue;
      }
      if (skip.has(entry.name.toLowerCase())) continue;
      queue.push({ dir: child, depth: depth + 1 });
    }
  }

  return results;
}

export async function discoverWorkbenchTileFolders() {
  const home = os.homedir();
  const profile = process.env.USERPROFILE || home;
  const oneDrive = process.env.OneDrive || process.env.OneDriveConsumer || "";

  const roots = [
    path.join(profile, "Documents", "My Games", "ArmaReforgerWorkbench"),
    path.join(home, "Documents", "My Games", "ArmaReforgerWorkbench"),
    oneDrive ? path.join(oneDrive, "Documents", "My Games", "ArmaReforgerWorkbench") : ""
  ].filter(Boolean);

  const uniqueRoots = [...new Set(roots.map((r) => path.resolve(r).toLowerCase()))];
  const candidates = [];

  for (const normalized of uniqueRoots) {
    const root = roots.find((r) => path.resolve(r).toLowerCase() === normalized);
    if (!root || !(await exists(root))) continue;
    candidates.push(...await walkForCaptureTiles(root));
  }

  const found = { everon: [], serhiivka: [], unknown: [] };
  for (const candidate of candidates) {
    const id = classifyPath(candidate);
    if (id) found[id].push(candidate);
    else found.unknown.push(candidate);
  }

  return found;
}

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(index >= 3 ? 2 : 1)} ${units[index]}`;
}
