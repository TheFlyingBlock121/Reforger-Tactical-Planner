import type { MapCalibration, MapImage, MapPoint } from "../types";

export const calibrationPresets: Record<"everon" | "serhiivka", MapCalibration> = {
  everon: {
    presetId: "everon",
    name: "Everon / Eden",
    widthMeters: 12800,
    heightMeters: 12800,
    gridMeters: 1000
  },
  serhiivka: {
    presetId: "serhiivka",
    name: "Serhiivka",
    widthMeters: 10240,
    heightMeters: 10240,
    gridMeters: 1000
  }
};

export const unknownCalibration: MapCalibration = {
  presetId: "unknown",
  name: "Uncalibrated map",
  widthMeters: 0,
  heightMeters: 0,
  gridMeters: 1000
};

export function calibrationIsValid(calibration: MapCalibration, image: MapImage | null): image is MapImage {
  return Boolean(image && calibration.widthMeters > 0 && calibration.heightMeters > 0);
}

export function guessCalibrationFromName(name: string): MapCalibration {
  const lower = name.toLowerCase();
  if (lower.includes("everon") || lower.includes("eden")) return { ...calibrationPresets.everon };
  if (lower.includes("serhiivka") || lower.includes("sergeevka")) return { ...calibrationPresets.serhiivka };
  return { ...unknownCalibration };
}

export function mapPointToMeters(point: MapPoint, image: MapImage, calibration: MapCalibration): MapPoint {
  return [
    (point[0] / image.width) * calibration.widthMeters,
    (point[1] / image.height) * calibration.heightMeters
  ];
}

export function metersToMapPoint(point: MapPoint, image: MapImage, calibration: MapCalibration): MapPoint {
  return [
    (point[0] / calibration.widthMeters) * image.width,
    (point[1] / calibration.heightMeters) * image.height
  ];
}

export function lineDistanceMeters(points: MapPoint[], image: MapImage | null, calibration: MapCalibration): number | null {
  if (!calibrationIsValid(calibration, image) || points.length < 2) return null;

  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    const a = mapPointToMeters(points[i - 1], image, calibration);
    const b = mapPointToMeters(points[i], image, calibration);
    total += Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  return total;
}

export function polygonAreaSquareMeters(points: MapPoint[], image: MapImage | null, calibration: MapCalibration): number | null {
  if (!calibrationIsValid(calibration, image) || points.length < 3) return null;
  const world = points.map((point) => mapPointToMeters(point, image, calibration));
  let area = 0;
  for (let i = 0; i < world.length; i += 1) {
    const [x1, y1] = world[i];
    const [x2, y2] = world[(i + 1) % world.length];
    area += x1 * y2 - x2 * y1;
  }
  return Math.abs(area) / 2;
}

export function formatDistance(meters: number | null): string {
  if (meters === null || !Number.isFinite(meters)) return "UNCALIBRATED";
  if (meters >= 10000) return `${(meters / 1000).toFixed(1)} km`;
  if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`;
  if (meters >= 100) return `${Math.round(meters)} m`;
  return `${meters.toFixed(1)} m`;
}

export function formatArea(squareMeters: number | null): string {
  if (squareMeters === null || !Number.isFinite(squareMeters)) return "UNCALIBRATED";
  if (squareMeters >= 1_000_000) return `${(squareMeters / 1_000_000).toFixed(2)} km²`;
  return `${Math.round(squareMeters).toLocaleString()} m²`;
}

export function niceScaleDistance(targetMeters: number): number {
  if (!Number.isFinite(targetMeters) || targetMeters <= 0) return 100;
  const exponent = Math.floor(Math.log10(targetMeters));
  const base = 10 ** exponent;
  const normalized = targetMeters / base;
  const step = normalized >= 5 ? 5 : normalized >= 2 ? 2 : 1;
  return step * base;
}
