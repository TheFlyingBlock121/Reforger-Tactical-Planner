import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { inspectTileDirectory, formatBytes } from "./map-pack-utils.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, "..");

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : "";
}

const root = path.resolve(argValue("--root") || path.join(projectRoot, "BUILT_IN_MAP_TILES"));
const writeManifests = process.argv.includes("--write-manifests");

const profiles = [
  {
    id: "everon",
    folder: "Everon",
    name: "Everon / Eden",
    widthMeters: 12800,
    heightMeters: 12800,
    gridMeters: 1000
  },
  {
    id: "serhiivka",
    folder: "Serhiivka",
    name: "Serhiivka",
    widthMeters: 10240,
    heightMeters: 10240,
    gridMeters: 1000
  }
];

async function writeManifest(profile, scan) {
  const dir = path.join(projectRoot, "builtin-map-manifests", profile.id);
  await fs.mkdir(dir, { recursive: true });
  const manifest = {
    id: profile.id,
    name: profile.name,
    builtIn: true,
    widthMeters: profile.widthMeters,
    heightMeters: profile.heightMeters,
    gridMeters: profile.gridMeters,
    tilePattern: "tile_r###_c###.png",
    origin: "top-left",
    rowDirection: "down",
    columnDirection: "right",
    detected: {
      rows: scan.rows,
      columns: scan.columns,
      tileWidth: scan.tileWidth,
      tileHeight: scan.tileHeight,
      tileCount: scan.tileCount,
      widthPixels: scan.widthPixels,
      heightPixels: scan.heightPixels,
      sourceBytes: scan.totalBytes
    }
  };
  await fs.writeFile(path.join(dir, "map.json"), JSON.stringify(manifest, null, 2) + "\n", "utf8");
}

async function main() {
  console.log("Reforger Tactical Planner v0.7 - built-in map check");
  console.log(`Source root: ${root}`);
  console.log("Layout rule: r000/c000 is TOP LEFT; rows go DOWN; columns go RIGHT.\n");

  let totalBytes = 0;
  const failures = [];

  for (const profile of profiles) {
    const dir = path.join(root, profile.folder);
    console.log(`[${profile.name}]`);
    console.log(`Folder: ${dir}`);

    try {
      const scan = await inspectTileDirectory(dir);
      if (scan.missing.length) {
        failures.push(`${profile.name}: ${scan.missing.length} missing tile(s)`);
        console.log(`ERROR: ${scan.missing.length} missing tile(s).`);
        console.log(`First missing: ${scan.missing.slice(0, 8).join(", ")}`);
        console.log("");
        continue;
      }

      totalBytes += scan.totalBytes;
      const metersPerPixelX = profile.widthMeters / scan.widthPixels;
      const metersPerPixelY = profile.heightMeters / scan.heightPixels;

      console.log(`READY: ${scan.rows} rows x ${scan.columns} columns = ${scan.tileCount} tiles`);
      console.log(`Tile size: ${scan.tileWidth} x ${scan.tileHeight} px`);
      console.log(`Virtual map: ${scan.widthPixels.toLocaleString()} x ${scan.heightPixels.toLocaleString()} px`);
      console.log(`Map scale: ${metersPerPixelX.toFixed(5)} m/px X, ${metersPerPixelY.toFixed(5)} m/px Y`);
      console.log(`Tile data: ${formatBytes(scan.totalBytes)}`);

      if (writeManifests) {
        await writeManifest(profile, scan);
        console.log("Manifest refreshed automatically.");
      }
      console.log("");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${profile.name}: ${message}`);
      console.log(`ERROR: ${message}\n`);
    }
  }

  if (failures.length) {
    console.error("Map check FAILED. The app will not be packaged until both folders are complete.");
    for (const failure of failures) console.error(` - ${failure}`);
    process.exitCode = 2;
    return;
  }

  console.log(`Both built-in maps are ready. Total tile payload: ${formatBytes(totalBytes)}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exitCode = 1;
});
