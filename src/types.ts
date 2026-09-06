export type Affiliation = "friendly" | "hostile" | "neutral" | "unknown";

export type UnitSize =
  | "none"
  | "team"
  | "squad"
  | "section"
  | "platoon"
  | "company"
  | "battalion"
  | "regiment"
  | "brigade";

export type MarkerDefinition = {
  id: string;
  name: string;
  category: "Infantry" | "Support" | "Vehicles" | "Aviation" | "Objectives";
  abbreviation: string;
  sidc?: string;
  symbolMode: "nato" | "objective";
  defaultUnitSize: UnitSize;
};

export type TacticalMarker = {
  id: string;
  definitionId: string;
  x: number;
  y: number;
  label: string;
  affiliation: Affiliation;
  unitSize: UnitSize;
  callsign: string;
  strength: string;
  aircraftType: string;
  altitude: string;
  speed: string;
  task: string;
  radio: string;
  notes: string;
};

export type MapSourceType = "image" | "tiles";

/**
 * The planner keeps all geometry in map-pixel coordinates, regardless of the
 * backing source. A tiled map therefore behaves exactly like one giant image
 * without ever loading that giant image into memory.
 */
export type MapImage = {
  name: string;
  width: number;
  height: number;
  sourceType?: MapSourceType;

  // Static PNG/JPG import (legacy v0.1-v0.3 plans use this).
  dataUrl?: string;

  // Tile-pack fields. The filenames follow tile_r000_c000.png.
  tilePackId?: string;
  tileRows?: number;
  tileColumns?: number;
  tileWidth?: number;
  tileHeight?: number;
  tileCount?: number;
  lodLevels?: number;
};

export type TileMapManifest = {
  id: string;
  name: string;
  widthMeters: number;
  heightMeters: number;
  gridMeters: number;
  ready: boolean;
  rootLabel: string;
  builtIn?: boolean;
  tileCount: number;
  expectedTileCount: number;
  missingTileCount: number;
  rows: number;
  columns: number;
  tileWidth: number;
  tileHeight: number;
  widthPixels: number;
  heightPixels: number;
  firstTile?: string;
  lodLevels?: number;
  issue?: string;
  warning?: string;
};

export type CalibrationPresetId = "unknown" | "everon" | "serhiivka" | "custom";

export type MapCalibration = {
  presetId: CalibrationPresetId;
  name: string;
  widthMeters: number;
  heightMeters: number;
  gridMeters: number;
};

export type PlannerTool =
  | "select"
  | "line"
  | "arrow"
  | "freehand"
  | "area"
  | "route"
  | "measure"
  | "text"
  | "erase";

export type DrawingKind = Exclude<PlannerTool, "select" | "erase">;
export type MapPoint = [number, number];

export type MapDrawing = {
  id: string;
  kind: DrawingKind;
  points: MapPoint[];
  color: string;
  label: string;
  lineWidth: number;
  fillOpacity: number;
  textSize?: number;
  textBackground?: boolean;
  createdAt: string;
};

export type PlanFile = {
  format: "reforger-tactical-plan";
  version: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  missionName: string;
  mapImage: MapImage | null;
  calibration?: MapCalibration;
  markers: TacticalMarker[];
  drawings?: MapDrawing[];
  savedAt: string;
};
