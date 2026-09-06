import ms from "milsymbol";
import { markerDefinitionById } from "../markerLibrary";
import type { Affiliation, TacticalMarker, UnitSize } from "../types";

ms.setStandard("APP6");

const affiliationCode: Record<Affiliation, string> = {
  friendly: "F",
  hostile: "H",
  neutral: "N",
  unknown: "U"
};

const echelonCode: Record<UnitSize, string> = {
  none: "-",
  team: "A",
  squad: "B",
  section: "C",
  platoon: "D",
  company: "E",
  battalion: "F",
  regiment: "G",
  brigade: "H"
};

type RenderedSymbol = {
  sidc: string;
  dataUrl: string;
  anchor: [number, number];
  width: number;
  height: number;
};

const symbolCache = new Map<string, RenderedSymbol>();
const MAX_SYMBOL_CACHE = 192;

function rememberSymbol(key: string, value: RenderedSymbol) {
  // Tiny FIFO/LRU-ish cap: enough for many symbol+LOD combinations without
  // letting a long editing session grow the cache forever.
  if (symbolCache.has(key)) symbolCache.delete(key);
  symbolCache.set(key, value);
  while (symbolCache.size > MAX_SYMBOL_CACHE) {
    const oldest = symbolCache.keys().next().value as string | undefined;
    if (!oldest) break;
    symbolCache.delete(oldest);
  }
}

function normalizeSidc(value: string) {
  return (value || "SFGPU----------").padEnd(15, "-").slice(0, 15);
}

export function sidcForMarker(marker: Pick<TacticalMarker, "definitionId" | "affiliation" | "unitSize">) {
  const definition = markerDefinitionById.get(marker.definitionId);
  if (!definition?.sidc) return null;

  const chars = normalizeSidc(definition.sidc).split("");
  chars[1] = affiliationCode[marker.affiliation];
  chars[3] = "P";
  chars[11] = echelonCode[marker.unitSize];
  return chars.join("");
}

export function renderNatoSymbol(marker: Pick<TacticalMarker, "definitionId" | "affiliation" | "unitSize">, size = 40) {
  const sidc = sidcForMarker(marker);
  if (!sidc) return null;

  const cacheKey = `${sidc}|${Math.round(size)}`;
  const cached = symbolCache.get(cacheKey);
  if (cached) return cached;

  const symbol = new ms.Symbol(sidc, {
    size,
    frame: true,
    fill: true,
    infoFields: false,
    outlineWidth: 2,
    outlineColor: "#0b100e"
  });

  const anchor = symbol.getAnchor();
  const renderedSize = symbol.getSize();
  const rendered: RenderedSymbol = {
    sidc,
    dataUrl: symbol.toDataURL(),
    anchor: [anchor.x, anchor.y],
    width: renderedSize.width,
    height: renderedSize.height
  };
  rememberSymbol(cacheKey, rendered);
  return rendered;
}
