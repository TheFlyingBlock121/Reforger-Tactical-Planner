import Feature, { type FeatureLike } from "ol/Feature";
import type Geometry from "ol/geom/Geometry";
import LineString from "ol/geom/LineString";
import Point from "ol/geom/Point";
import Polygon from "ol/geom/Polygon";
import { Circle as CircleStyle, Fill, RegularShape, Stroke, Style, Text } from "ol/style";
import type { MapCalibration, MapDrawing, MapImage, MapPoint } from "./types";
import { formatArea, formatDistance, lineDistanceMeters, polygonAreaSquareMeters } from "./lib/mapScale";

export type DrawingLod = "overview" | "normal" | "detail";

function lineBase(color: string, width: number, dash?: number[]) {
  return new Style({ stroke: new Stroke({ color, width, lineDash: dash }) });
}

function midpoint(points: MapPoint[]): MapPoint {
  if (!points.length) return [0, 0];
  if (points.length === 1) return points[0];
  const index = Math.floor((points.length - 1) / 2);
  const a = points[index];
  const b = points[Math.min(index + 1, points.length - 1)];
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

function labelStyle(
  text: string,
  point: MapPoint,
  color = "#eef5ef",
  offsetY = -14,
  fontSize = 12,
  background = false
) {
  return new Style({
    geometry: new Point(point),
    text: new Text({
      text,
      offsetY,
      font: `700 ${fontSize}px Inter, Arial`,
      fill: new Fill({ color }),
      stroke: new Stroke({ color: "rgba(7,10,8,0.95)", width: 4 }),
      backgroundFill: background ? new Fill({ color: "rgba(7,11,9,0.72)" }) : undefined,
      backgroundStroke: background ? new Stroke({ color: "rgba(150,170,157,0.28)", width: 1 }) : undefined,
      padding: [3, 5, 3, 5]
    }),
    zIndex: 900
  });
}

function arrowHead(points: MapPoint[], color: string, width: number, lod: DrawingLod) {
  if (points.length < 2) return null;
  const end = points[points.length - 1];
  const previous = points[points.length - 2];
  const angle = Math.atan2(end[1] - previous[1], end[0] - previous[0]);
  const lodRadius = lod === "overview" ? 7 : lod === "normal" ? 9 : 11;

  return new Style({
    geometry: new Point(end),
    image: new RegularShape({
      points: 3,
      radius: lodRadius + width,
      rotation: -angle + Math.PI / 2,
      fill: new Fill({ color }),
      stroke: new Stroke({ color: "rgba(8,12,10,0.8)", width: 1 })
    }),
    zIndex: 700
  });
}

export function drawingStyles(
  drawing: MapDrawing,
  image: MapImage | null,
  calibration: MapCalibration,
  selected = false,
  lod: DrawingLod = "normal"
): Style[] {
  const width = drawing.lineWidth + (selected ? 2 : 0);
  const color = drawing.color;
  const points = drawing.points;
  const styles: Style[] = [];
  const showDetailLabels = lod !== "overview" || selected;

  if (drawing.kind === "area") {
    styles.push(
      new Style({
        fill: new Fill({ color: hexWithAlpha(color, drawing.fillOpacity) }),
        stroke: new Stroke({ color, width, lineDash: [10, 7] })
      })
    );
    if (showDetailLabels && drawing.label) styles.push(labelStyle(drawing.label, midpoint(points), color, 0));
    const area = polygonAreaSquareMeters(points, image, calibration);
    if (showDetailLabels && area !== null) styles.push(labelStyle(formatArea(area), midpoint(points), "#ffffff", 16, 11));
    return styles;
  }

  if (drawing.kind === "text") {
    const textSize = Math.max(9, Math.min(36, drawing.textSize || 16));
    const lodTextSize = lod === "overview" ? Math.max(9, textSize - 3) : lod === "normal" ? Math.max(10, textSize - 1) : textSize;
    styles.push(labelStyle(drawing.label || "TEXT", points[0] || [0, 0], color, 0, lodTextSize, drawing.textBackground ?? true));
    return styles;
  }

  if (drawing.kind === "route") {
    styles.push(lineBase(color, width, [12, 7]));
    if (lod !== "overview" || selected) {
      points.forEach((point, index) => {
        styles.push(
          new Style({
            geometry: new Point(point),
            image: new CircleStyle({
              radius: lod === "detail" ? 9 : 7,
              fill: new Fill({ color: "rgba(11,16,14,0.92)" }),
              stroke: new Stroke({ color, width: 2 })
            }),
            text: new Text({
              text: String(index + 1),
              font: "800 10px Inter, Arial",
              fill: new Fill({ color: "#ffffff" })
            })
          })
        );
      });
    }
    const distance = lineDistanceMeters(points, image, calibration);
    if (showDetailLabels) styles.push(labelStyle(`${drawing.label || "ROUTE"} · ${formatDistance(distance)}`, midpoint(points), color));
    return styles;
  }

  if (drawing.kind === "measure") {
    styles.push(lineBase(color, width, [8, 6]));
    if (showDetailLabels) styles.push(labelStyle(formatDistance(lineDistanceMeters(points, image, calibration)), midpoint(points), "#ffffff"));
    return styles;
  }

  styles.push(lineBase(color, width));

  if (drawing.kind === "arrow") {
    const head = arrowHead(points, color, width, lod);
    if (head) styles.push(head);
  }

  if (showDetailLabels && drawing.label) styles.push(labelStyle(drawing.label, midpoint(points), color));
  return styles;
}

export function styleDrawingFeature(
  feature: Feature<Geometry>,
  drawing: MapDrawing,
  image: MapImage | null,
  calibration: MapCalibration,
  selected: boolean,
  lod: DrawingLod = "normal"
) {
  feature.setStyle(drawingStyles(drawing, image, calibration, selected, lod));
}

export function previewStyle(color: string, kind: MapDrawing["kind"], lineWidth = 3) {
  return (feature: FeatureLike) => {
    const geometry = feature.getGeometry();
    const styles: Style[] = [
      new Style({
        stroke: new Stroke({ color, width: lineWidth, lineDash: kind === "measure" ? [8, 6] : undefined }),
        fill: new Fill({ color: kind === "area" ? hexWithAlpha(color, 0.15) : "transparent" })
      })
    ];

    if (kind === "arrow" && geometry instanceof LineString) {
      const points = geometry.getCoordinates() as MapPoint[];
      const head = arrowHead(points, color, lineWidth, "detail");
      if (head) styles.push(head);
    }

    return styles;
  };
}

function hexWithAlpha(hex: string, alpha: number) {
  const clean = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return `rgba(85,167,255,${alpha})`;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function geometryForDrawing(drawing: MapDrawing): Geometry {
  if (drawing.kind === "area") return new Polygon([[...drawing.points, drawing.points[0]].filter(Boolean) as MapPoint[]]);
  if (drawing.kind === "text") return new Point(drawing.points[0] || [0, 0]);
  return new LineString(drawing.points);
}
