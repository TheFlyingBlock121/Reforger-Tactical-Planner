import type { MapCalibration, MapImage, TileMapManifest } from "../types";

export function makeMapSource(pack: TileMapManifest): MapImage {
  return {
    name: pack.name,
    width: pack.widthPixels,
    height: pack.heightPixels,
    sourceType: "tiles",
    tilePackId: pack.id,
    tileRows: pack.rows,
    tileColumns: pack.columns,
    tileWidth: pack.tileWidth,
    tileHeight: pack.tileHeight,
    tileCount: pack.tileCount,
    lodLevels: pack.lodLevels || 0
  };
}

export function makeCalibration(pack: TileMapManifest): MapCalibration {
  const presetId = pack.id === "everon" || pack.id === "serhiivka" ? pack.id : "custom";
  return {
    presetId,
    name: pack.name,
    widthMeters: pack.widthMeters,
    heightMeters: pack.heightMeters,
    gridMeters: pack.gridMeters || 1000
  };
}

export function chooseStartupMap(packs: TileMapManifest[], preferredId?: string | null) {
  const ready = packs.filter((pack) => pack.ready);
  if (!ready.length) return null;
  if (preferredId) {
    const preferred = ready.find((pack) => pack.id === preferredId);
    if (preferred) return preferred;
  }
  return ready.find((pack) => pack.id === "everon") || ready.find((pack) => pack.id === "serhiivka") || ready[0];
}
