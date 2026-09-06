import { Icon, Style, Text, Fill, Stroke } from "ol/style";
import { markerDefinitionById } from "./markerLibrary";
import { renderNatoSymbol } from "./lib/symbols";
import type { TacticalMarker } from "./types";

export type MarkerLod = "overview" | "normal" | "detail";

const affiliationColors = {
  friendly: "#55a7ff",
  hostile: "#ff5c5c",
  neutral: "#65d98c",
  unknown: "#ffd45c"
};

const lodSize: Record<MarkerLod, number> = {
  // Screen pixels, not map metres. Symbols therefore never become giant
  // when zooming out. LOD only makes small discrete readability changes.
  overview: 24,
  normal: 29,
  detail: 34
};

const objectiveCache = new Map<string, string>();

function objectiveSvg(marker: TacticalMarker, size: number) {
  const definition = markerDefinitionById.get(marker.definitionId);
  const text = definition?.abbreviation || "OBJ";
  const color = affiliationColors[marker.affiliation];
  const key = `${text}|${color}|${size}`;
  const cached = objectiveCache.get(key);
  if (cached) return cached;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="58" height="58" viewBox="0 0 58 58">
      <path d="M29 3 L51 15 L51 43 L29 55 L7 43 L7 15 Z" fill="#0f1512" stroke="${color}" stroke-width="3"/>
      <text x="29" y="34" fill="${color}" font-size="12" font-family="Arial" font-weight="700" text-anchor="middle">${text}</text>
    </svg>`;
  const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  objectiveCache.set(key, dataUrl);
  return dataUrl;
}

export function markerStyle(
  marker: TacticalMarker,
  selected = false,
  lod: MarkerLod = "normal",
  showLabel = true
) {
  const definition = markerDefinitionById.get(marker.definitionId);
  const targetSize = lodSize[lod] + (selected ? 4 : 0);
  const nato = definition?.symbolMode === "nato" ? renderNatoSymbol(marker, targetSize) : null;

  let icon: Icon;

  if (nato) {
    icon = new Icon({
      src: nato.dataUrl,
      anchor: nato.anchor,
      anchorXUnits: "pixels",
      anchorYUnits: "pixels"
    });
  } else {
    icon = new Icon({
      src: objectiveSvg(marker, targetSize),
      scale: targetSize / 58
    });
  }

  const label = showLabel || selected ? (marker.callsign || marker.label) : "";
  const labelOffset = lod === "overview" ? 26 : lod === "normal" ? 32 : 37;
  const fontSize = lod === "overview" ? 9 : lod === "normal" ? 10 : 11;

  return new Style({
    image: icon,
    text: new Text({
      text: label,
      offsetY: labelOffset,
      font: `${selected ? 700 : 600} ${fontSize}px Inter, Arial`,
      fill: new Fill({ color: "#ecf4ee" }),
      stroke: new Stroke({ color: "#0a0d0b", width: 4 }),
      overflow: false
    }),
    zIndex: selected ? 1000 : 100
  });
}
