import { useEffect, useRef, useState } from "react";
import OLMap from "ol/Map";
import View from "ol/View";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import LineString from "ol/geom/LineString";
import Polygon from "ol/geom/Polygon";
import Projection from "ol/proj/Projection";
import ImageLayer from "ol/layer/Image";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import ImageStatic from "ol/source/ImageStatic";
import TileImage from "ol/source/TileImage";
import TileGrid from "ol/tilegrid/TileGrid";
import VectorSource from "ol/source/Vector";
import Translate from "ol/interaction/Translate";
import Draw from "ol/interaction/Draw";
import { defaults as defaultControls } from "ol/control/defaults";
import { Fill, Stroke, Style } from "ol/style";
import { markerStyle, type MarkerLod } from "../mapStyles";
import { geometryForDrawing, previewStyle, styleDrawingFeature, type DrawingLod } from "../drawingStyles";
import {
  calibrationIsValid,
  formatArea,
  formatDistance,
  lineDistanceMeters,
  mapPointToMeters,
  niceScaleDistance,
  polygonAreaSquareMeters
} from "../lib/mapScale";
import { usePlannerStore } from "../store";
import type { DrawingKind, MapDrawing, MapPoint, TacticalMarker } from "../types";

const drawableTools = new Set<DrawingKind>(["line", "arrow", "freehand", "area", "route", "measure"]);

type TextDraft = {
  point: MapPoint;
  pixel: [number, number];
  value: string;
  color: string;
  size: number;
  background: boolean;
};

export function MapBoard() {
  const elementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<OLMap | null>(null);
  const baseLayerRef = useRef<ImageLayer<ImageStatic> | TileLayer<TileImage> | null>(null);
  const markerSourceRef = useRef(new VectorSource());
  const drawingSourceRef = useRef(new VectorSource());
  const gridSourceRef = useRef(new VectorSource());
  const draftSourceRef = useRef(new VectorSource());
  const drawInteractionRef = useRef<Draw | null>(null);
  const translateRef = useRef<Translate | null>(null);
  const drawingActiveRef = useRef(false);
  const markerFeaturesRef = useRef(new Map<string, Feature<Point>>());
  const drawingFeaturesRef = useRef(new Map<string, Feature>());
  const pointerFrameRef = useRef<number | null>(null);
  const pendingPointerRef = useRef<MapPoint | null>(null);
  const textDraftRef = useRef<TextDraft | null>(null);

  const markerLayerRef = useRef(new VectorLayer({
    source: markerSourceRef.current,
    declutter: true,
    renderBuffer: 72,
    updateWhileAnimating: false,
    updateWhileInteracting: false
  }));
  const drawingLayerRef = useRef(new VectorLayer({
    source: drawingSourceRef.current,
    renderBuffer: 72,
    updateWhileAnimating: false,
    updateWhileInteracting: false
  }));
  const gridLayerRef = useRef(new VectorLayer({
    source: gridSourceRef.current,
    renderBuffer: 32,
    updateWhileAnimating: false,
    updateWhileInteracting: false
  }));
  const draftLayerRef = useRef(new VectorLayer({ source: draftSourceRef.current, renderBuffer: 32 }));

  const [coordinateReadout, setCoordinateReadout] = useState("");
  const [liveMetric, setLiveMetric] = useState("");
  const [scaleBar, setScaleBar] = useState<{ label: string; width: number } | null>(null);
  const [tileError, setTileError] = useState("");
  const [lodTier, setLodTier] = useState<MarkerLod>("normal");
  const [textDraft, setTextDraft] = useState<TextDraft | null>(null);

  const mapImage = usePlannerStore((s) => s.mapImage);
  const calibration = usePlannerStore((s) => s.calibration);
  const markers = usePlannerStore((s) => s.markers);
  const drawings = usePlannerStore((s) => s.drawings);
  const selectedMarkerId = usePlannerStore((s) => s.selectedMarkerId);
  const selectedDrawingId = usePlannerStore((s) => s.selectedDrawingId);
  const placement = usePlannerStore((s) => s.placementDefinitionId);
  const activeTool = usePlannerStore((s) => s.activeTool);
  const drawingColor = usePlannerStore((s) => s.drawingColor);
  const showGrid = usePlannerStore((s) => s.showGrid);

  useEffect(() => {
    textDraftRef.current = textDraft;
  }, [textDraft]);

  useEffect(() => {
    markerLayerRef.current.setZIndex(100);
    drawingLayerRef.current.setZIndex(60);
    gridLayerRef.current.setZIndex(20);
    draftLayerRef.current.setZIndex(80);

    gridLayerRef.current.setStyle(
      new Style({
        stroke: new Stroke({ color: "rgba(213,236,218,0.16)", width: 1, lineDash: [5, 7] })
      })
    );
  }, []);

  useEffect(() => {
    if (!elementRef.current || mapRef.current) return;

    const map = new OLMap({
      target: elementRef.current,
      layers: [gridLayerRef.current, drawingLayerRef.current, draftLayerRef.current, markerLayerRef.current],
      controls: defaultControls({ attribution: false, rotate: false, zoom: false }),
      view: new View({ center: [0, 0], zoom: 2, minZoom: -3, maxZoom: 10 })
    });

    const translate = new Translate({
      layers: [markerLayerRef.current, drawingLayerRef.current],
      hitTolerance: 5
    });

    translate.on("translatestart", () => {
      elementRef.current?.classList.add("dragging-marker");
    });

    translate.on("translateend", (event) => {
      elementRef.current?.classList.remove("dragging-marker");
      const feature = event.features.item(0);
      const markerId = feature?.get("markerId");
      const drawingId = feature?.get("drawingId");
      const geometry = feature?.getGeometry();
      const state = usePlannerStore.getState();

      if (typeof markerId === "string" && geometry instanceof Point) {
        const [x, y] = geometry.getCoordinates();
        state.updateMarker(markerId, { x, y });
        return;
      }

      if (typeof drawingId === "string" && geometry) {
        if (geometry instanceof Point) {
          const [x, y] = geometry.getCoordinates();
          state.updateDrawing(drawingId, { points: [[x, y]] });
        } else if (geometry instanceof Polygon) {
          state.updateDrawing(drawingId, { points: cleanRing(geometry.getCoordinates()[0] as MapPoint[]) });
        } else if (geometry instanceof LineString) {
          state.updateDrawing(drawingId, { points: geometry.getCoordinates() as MapPoint[] });
        }
      }
    });

    map.addInteraction(translate);
    translateRef.current = translate;

    map.on("singleclick", (event) => {
      const state = usePlannerStore.getState();

      if (state.placementDefinitionId) {
        state.createMarker(state.placementDefinitionId, event.coordinate[0], event.coordinate[1]);
        return;
      }

      if (state.activeTool === "text") {
        const draft: TextDraft = {
          point: [event.coordinate[0], event.coordinate[1]],
          pixel: [Math.round(event.pixel[0]), Math.round(event.pixel[1])],
          value: "",
          color: state.drawingColor,
          size: 16,
          background: true
        };
        setTextDraft(draft);
        return;
      }

      const hit = map.forEachFeatureAtPixel(event.pixel, (feature) => {
        if (feature.get("markerId") || feature.get("drawingId")) return feature;
        return undefined;
      }, { hitTolerance: 5 });

      const markerId = hit?.get("markerId");
      const drawingId = hit?.get("drawingId");

      if (state.activeTool === "erase") {
        if (typeof markerId === "string") state.deleteMarker(markerId);
        else if (typeof drawingId === "string") state.deleteDrawing(drawingId);
        return;
      }

      if (state.activeTool === "select") {
        if (typeof markerId === "string") state.selectMarker(markerId);
        else if (typeof drawingId === "string") state.selectDrawing(drawingId);
        else state.clearSelection();
      }
    });

    map.on("pointermove", (event) => {
      pendingPointerRef.current = [event.coordinate[0], event.coordinate[1]];
      if (pointerFrameRef.current === null) {
        pointerFrameRef.current = requestAnimationFrame(() => {
          pointerFrameRef.current = null;
          const point = pendingPointerRef.current;
          const state = usePlannerStore.getState();
          if (point && calibrationIsValid(state.calibration, state.mapImage)) {
            const world = mapPointToMeters(point, state.mapImage, state.calibration);
            setCoordinateReadout(`E ${Math.round(world[0]).toString().padStart(5, "0")} · N ${Math.round(world[1]).toString().padStart(5, "0")} m`);
          } else {
            setCoordinateReadout("");
          }
        });
      }

      if (!elementRef.current) return;
      const store = usePlannerStore.getState();
      if (store.activeTool !== "select" || store.placementDefinitionId) {
        elementRef.current.style.cursor = store.activeTool === "erase" ? "not-allowed" : "crosshair";
        return;
      }
      const hit = map.hasFeatureAtPixel(event.pixel, { hitTolerance: 4 });
      elementRef.current.style.cursor = hit ? "grab" : "default";
    });

    map.on("moveend", () => {
      updateScaleBar(map);
      updateLod(map);
      buildGrid(map);
    });

    const viewport = map.getViewport();
    const onContextMenu = (event: MouseEvent) => {
      event.preventDefault();
      if (textDraftRef.current) {
        setTextDraft(null);
        return;
      }
      if (drawingActiveRef.current && drawInteractionRef.current) {
        try {
          const finished = drawInteractionRef.current.finishDrawing();
          if (!finished) drawInteractionRef.current.abortDrawing();
        } catch {
          drawInteractionRef.current.abortDrawing();
        }
      }
    };
    viewport.addEventListener("contextmenu", onContextMenu);

    const onEscapeCapture = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (textDraftRef.current) {
        event.preventDefault();
        event.stopPropagation();
        setTextDraft(null);
        return;
      }
      if (drawingActiveRef.current && drawInteractionRef.current) {
        event.preventDefault();
        event.stopPropagation();
        drawInteractionRef.current.abortDrawing();
        drawingActiveRef.current = false;
        draftSourceRef.current.clear();
        setLiveMetric("");
      }
    };
    window.addEventListener("keydown", onEscapeCapture, true);

    mapRef.current = map;
    const fitListener = () => fitMap(map);
    window.addEventListener("planner:fit-map", fitListener);

    return () => {
      window.removeEventListener("planner:fit-map", fitListener);
      window.removeEventListener("keydown", onEscapeCapture, true);
      viewport.removeEventListener("contextmenu", onContextMenu);
      if (pointerFrameRef.current !== null) cancelAnimationFrame(pointerFrameRef.current);
      map.setTarget(undefined);
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    translateRef.current?.setActive(activeTool === "select" && !placement);
  }, [activeTool, placement]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (baseLayerRef.current) {
      map.removeLayer(baseLayerRef.current);
      baseLayerRef.current = null;
    }

    if (!mapImage) {
      map.setView(new View({ center: [0, 0], zoom: 2, minZoom: -3, maxZoom: 10 }));
      setScaleBar(null);
      return;
    }

    const extent: [number, number, number, number] = [0, 0, mapImage.width, mapImage.height];
    const projection = new Projection({
      code: `planner-image-${mapImage.tilePackId || "image"}-${mapImage.width}x${mapImage.height}`,
      units: "pixels",
      extent
    });

    setTileError("");

    let base: ImageLayer<ImageStatic> | TileLayer<TileImage>;

    if (mapImage.sourceType === "tiles" && mapImage.tilePackId && mapImage.tileWidth && mapImage.tileHeight) {
      const tileWidth = mapImage.tileWidth;
      const tileHeight = mapImage.tileHeight;
      const columns = mapImage.tileColumns || Math.ceil(mapImage.width / tileWidth);
      const rows = mapImage.tileRows || Math.ceil(mapImage.height / tileHeight);
      const maxLod = Math.max(0, Math.floor(mapImage.lodLevels || 0));
      const resolutions = Array.from({ length: maxLod + 1 }, (_, index) => 2 ** (maxLod - index));

      const tileGrid = new TileGrid({
        extent,
        origin: [0, mapImage.height],
        resolutions,
        tileSize: [tileWidth, tileHeight]
      });

      const tileSource = new TileImage({
        projection,
        tileGrid,
        wrapX: false,
        transition: 0,
        interpolate: true,
        tileUrlFunction: (tileCoord) => {
          if (!tileCoord) return undefined;
          const [z, column, row] = tileCoord;
          const lod = Math.max(0, maxLod - z);
          const divisor = 2 ** lod;
          const lodColumns = Math.ceil(columns / divisor);
          const lodRows = Math.ceil(rows / divisor);
          if (column < 0 || row < 0 || column >= lodColumns || row >= lodRows) return undefined;
          const r = String(row).padStart(3, "0");
          const c = String(column).padStart(3, "0");
          if (lod === 0) {
            return `rtpmap://maps/${encodeURIComponent(mapImage.tilePackId!)}/tiles/tile_r${r}_c${c}.png`;
          }
          return `rtpmap://maps/${encodeURIComponent(mapImage.tilePackId!)}/lod/lod${lod}/tile_r${r}_c${c}.jpg`;
        }
      });

      let errorCount = 0;
      tileSource.on("tileloaderror", () => {
        errorCount += 1;
        if (errorCount === 1) {
          setTileError(`Could not load part of ${mapImage.name}. Use MAPS → RESCAN or rebuild the installer if LOD files are missing.`);
        }
      });

      base = new TileLayer({
        source: tileSource,
        preload: 0,
        cacheSize: 64
      });
    } else {
      if (!mapImage.dataUrl) {
        setTileError("This plan refers to a map image that is not available on this computer.");
        return;
      }
      base = new ImageLayer({
        source: new ImageStatic({ url: mapImage.dataUrl, projection, imageExtent: extent })
      });
    }

    base.setZIndex(0);
    baseLayerRef.current = base;
    map.getLayers().insertAt(0, base);

    const view = new View({
      projection,
      center: [mapImage.width / 2, mapImage.height / 2],
      zoom: 1,
      minZoom: -5,
      maxZoom: 14,
      extent: [-mapImage.width * 0.5, -mapImage.height * 0.5, mapImage.width * 1.5, mapImage.height * 1.5],
      constrainResolution: false
    });

    map.setView(view);
    queueMicrotask(() => {
      fitMap(map);
      updateScaleBar(map);
      updateLod(map);
      buildGrid(map);
    });
  }, [mapImage]);

  useEffect(() => {
    const source = markerSourceRef.current;
    const featureMap = markerFeaturesRef.current;
    const wanted = new Set(markers.map((marker) => marker.id));

    for (const [id, feature] of featureMap) {
      if (!wanted.has(id)) {
        source.removeFeature(feature);
        featureMap.delete(id);
      }
    }

    const showMostLabels = lodTier === "detail" || (lodTier === "normal" && markers.length <= 90);

    for (const marker of markers) {
      let feature = featureMap.get(marker.id);
      if (!feature) {
        feature = new Feature<Point>({ geometry: new Point([marker.x, marker.y]), markerId: marker.id });
        featureMap.set(marker.id, feature);
        source.addFeature(feature);
      } else {
        const geometry = feature.getGeometry();
        if (geometry) {
          const [x, y] = geometry.getCoordinates();
          if (x !== marker.x || y !== marker.y) geometry.setCoordinates([marker.x, marker.y]);
        }
      }
      feature.set("markerData", marker, true);
      const selected = marker.id === selectedMarkerId;
      feature.setStyle(markerStyle(marker, selected, lodTier, showMostLabels || selected));
    }
  }, [markers, selectedMarkerId, lodTier]);

  useEffect(() => {
    const source = drawingSourceRef.current;
    const featureMap = drawingFeaturesRef.current;
    const wanted = new Set(drawings.map((drawing) => drawing.id));

    for (const [id, feature] of featureMap) {
      if (!wanted.has(id)) {
        source.removeFeature(feature);
        featureMap.delete(id);
      }
    }

    for (const drawing of drawings) {
      let feature = featureMap.get(drawing.id);
      if (!feature) {
        feature = new Feature({ geometry: geometryForDrawing(drawing), drawingId: drawing.id });
        featureMap.set(drawing.id, feature);
        source.addFeature(feature);
      } else {
        feature.setGeometry(geometryForDrawing(drawing));
      }
      feature.set("drawingData", drawing, true);
      styleDrawingFeature(
        feature,
        drawing,
        mapImage,
        calibration,
        drawing.id === selectedDrawingId,
        lodTier as DrawingLod
      );
    }
  }, [drawings, selectedDrawingId, mapImage, calibration, lodTier]);

  useEffect(() => {
    const map = mapRef.current;
    if (map) {
      buildGrid(map);
      updateScaleBar(map);
    }
  }, [mapImage, calibration, showGrid]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (drawInteractionRef.current) {
      map.removeInteraction(drawInteractionRef.current);
      drawInteractionRef.current = null;
      drawingActiveRef.current = false;
      draftSourceRef.current.clear();
      setLiveMetric("");
    }

    if (!drawableTools.has(activeTool as DrawingKind)) return;

    const kind = activeTool as DrawingKind;
    const draw = new Draw({
      source: draftSourceRef.current,
      type: kind === "area" ? "Polygon" : "LineString",
      freehand: kind === "freehand",
      stopClick: true,
      style: previewStyle(kind === "measure" ? "#ffffff" : drawingColor, kind)
    });

    draw.on("drawstart", (event) => {
      drawingActiveRef.current = true;
      const geometry = event.feature.getGeometry();
      geometry?.on("change", () => {
        const state = usePlannerStore.getState();
        if (!state.mapImage) return;

        if (kind === "area" && geometry instanceof Polygon) {
          const ring = cleanRing(geometry.getCoordinates()[0] as MapPoint[]);
          setLiveMetric(`AREA ${formatArea(polygonAreaSquareMeters(ring, state.mapImage, state.calibration))}`);
        } else if (geometry instanceof LineString) {
          const points = geometry.getCoordinates() as MapPoint[];
          if (kind === "measure" || kind === "route") {
            setLiveMetric(`${kind === "route" ? "ROUTE" : "DIST"} ${formatDistance(lineDistanceMeters(points, state.mapImage, state.calibration))}`);
          }
        }
      });
    });

    draw.on("drawabort", () => {
      drawingActiveRef.current = false;
      setLiveMetric("");
      queueMicrotask(() => draftSourceRef.current.clear());
    });

    draw.on("drawend", (event) => {
      drawingActiveRef.current = false;
      const geometry = event.feature.getGeometry();
      let points: MapPoint[] = [];

      if (geometry instanceof Polygon) points = cleanRing(geometry.getCoordinates()[0] as MapPoint[]);
      if (geometry instanceof LineString) points = geometry.getCoordinates() as MapPoint[];
      if (points.length < (kind === "area" ? 3 : 2)) {
        setLiveMetric("");
        return;
      }

      const state = usePlannerStore.getState();
      const drawing: MapDrawing = {
        id: crypto.randomUUID(),
        kind,
        points,
        color: kind === "measure" ? "#ffffff" : state.drawingColor,
        label: kind === "route" ? "ROUTE" : kind === "area" ? "AREA" : "",
        lineWidth: kind === "freehand" ? 2 : 3,
        fillOpacity: 0.16,
        textSize: 16,
        textBackground: true,
        createdAt: new Date().toISOString()
      };

      state.addDrawing(drawing);
      state.selectDrawing(drawing.id);
      setLiveMetric("");
      queueMicrotask(() => draftSourceRef.current.clear());
    });

    map.addInteraction(draw);
    drawInteractionRef.current = draw;

    return () => {
      if (drawInteractionRef.current === draw) {
        map.removeInteraction(draw);
        drawInteractionRef.current = null;
      }
      drawingActiveRef.current = false;
      draftSourceRef.current.clear();
      setLiveMetric("");
    };
  }, [activeTool, drawingColor]);

  function commitText() {
    if (!textDraft?.value.trim()) {
      setTextDraft(null);
      return;
    }
    const drawing: MapDrawing = {
      id: crypto.randomUUID(),
      kind: "text",
      points: [textDraft.point],
      color: textDraft.color,
      label: textDraft.value.trim(),
      lineWidth: 2,
      fillOpacity: 0.16,
      textSize: textDraft.size,
      textBackground: textDraft.background,
      createdAt: new Date().toISOString()
    };
    usePlannerStore.getState().addDrawing(drawing);
    usePlannerStore.getState().selectDrawing(drawing.id);
    setTextDraft(null);
  }

  function cleanRing(points: MapPoint[]): MapPoint[] {
    if (points.length > 1) {
      const first = points[0];
      const last = points[points.length - 1];
      if (first[0] === last[0] && first[1] === last[1]) return points.slice(0, -1);
    }
    return points;
  }

  function buildGrid(map: OLMap) {
    const source = gridSourceRef.current;
    source.clear(true);
    const state = usePlannerStore.getState();
    if (!state.showGrid || !calibrationIsValid(state.calibration, state.mapImage)) return;

    const resolution = map.getView().getResolution() || 1;
    const metersPerMapUnit = state.calibration.widthMeters / state.mapImage.width;
    const targetMeters = resolution * metersPerMapUnit * 85;
    let step = Math.max(100, niceScaleDistance(targetMeters));

    let xCount = Math.floor(state.calibration.widthMeters / step) + 1;
    let yCount = Math.floor(state.calibration.heightMeters / step) + 1;
    while (xCount + yCount > 90) {
      step *= 2;
      xCount = Math.floor(state.calibration.widthMeters / step) + 1;
      yCount = Math.floor(state.calibration.heightMeters / step) + 1;
    }

    for (let meter = 0; meter <= state.calibration.widthMeters + 0.001; meter += step) {
      const x = (meter / state.calibration.widthMeters) * state.mapImage.width;
      source.addFeature(new Feature({ geometry: new LineString([[x, 0], [x, state.mapImage.height]]), grid: true }));
    }

    for (let meter = 0; meter <= state.calibration.heightMeters + 0.001; meter += step) {
      const y = (meter / state.calibration.heightMeters) * state.mapImage.height;
      source.addFeature(new Feature({ geometry: new LineString([[0, y], [state.mapImage.width, y]]), grid: true }));
    }
  }

  function updateLod(map: OLMap) {
    const resolution = map.getView().getResolution() || 1;
    const next: MarkerLod = resolution > 6 ? "overview" : resolution > 1.8 ? "normal" : "detail";
    setLodTier((current) => current === next ? current : next);
  }

  function updateScaleBar(map: OLMap) {
    const state = usePlannerStore.getState();
    if (!calibrationIsValid(state.calibration, state.mapImage)) {
      setScaleBar(null);
      return;
    }

    const resolution = map.getView().getResolution();
    if (!resolution) return;
    const metersPerMapUnit = state.calibration.widthMeters / state.mapImage.width;
    const targetMeters = resolution * 120 * metersPerMapUnit;
    const niceMeters = niceScaleDistance(targetMeters);
    const width = Math.max(45, Math.min(180, niceMeters / (resolution * metersPerMapUnit)));
    setScaleBar({ label: formatDistance(niceMeters), width });
  }

  function fitMap(map: OLMap) {
    const state = usePlannerStore.getState();
    if (!state.mapImage) return;
    const extent: [number, number, number, number] = [0, 0, state.mapImage.width, state.mapImage.height];
    map.getView().fit(extent, { padding: [45, 45, 45, 45], duration: 140 });
  }

  const toolLabel = placement
    ? "PLACE UNIT MARKER"
    : activeTool === "select"
      ? "SELECT / PAN"
      : activeTool.toUpperCase();

  return (
    <section className="map-shell">
      <div className="map-status">
        <strong>{toolLabel}</strong>
        <span>{mapImage ? `${mapImage.name}${mapImage.sourceType === "tiles" ? ` · TILED · ${mapImage.lodLevels || 0} LOD` : ""}` : "NO MAP LOADED"}</span>
        {calibration.widthMeters > 0 && <span>{calibration.name} · {calibration.widthMeters / 1000} × {calibration.heightMeters / 1000} km</span>}
        <span className="lod-indicator">LOD AUTO · {lodTier.toUpperCase()}</span>
      </div>

      <div ref={elementRef} className={`map-board tool-${activeTool} ${placement ? "placing" : ""}`} />

      {liveMetric && <div className="live-measure-badge">{liveMetric}</div>}
      {tileError && <div className="map-source-error">{tileError}</div>}

      {textDraft && (
        <div
          className="text-editor-popover"
          style={{ left: `${Math.min(textDraft.pixel[0], Math.max(8, (elementRef.current?.clientWidth || 500) - 290))}px`, top: `${Math.max(38, textDraft.pixel[1] - 18)}px` }}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <textarea
            autoFocus
            rows={2}
            value={textDraft.value}
            placeholder="Type map label…"
            onChange={(event) => setTextDraft({ ...textDraft, value: event.target.value })}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                commitText();
              }
              if (event.key === "Escape") {
                event.preventDefault();
                setTextDraft(null);
              }
            }}
          />
          <div className="text-editor-controls">
            <input type="color" value={textDraft.color} onChange={(event) => setTextDraft({ ...textDraft, color: event.target.value })} />
            <select value={textDraft.size} onChange={(event) => setTextDraft({ ...textDraft, size: Number(event.target.value) })}>
              <option value={12}>12 px</option>
              <option value={16}>16 px</option>
              <option value={20}>20 px</option>
              <option value={26}>26 px</option>
              <option value={32}>32 px</option>
            </select>
            <label className="text-bg-toggle" title="Text background">
              <input type="checkbox" checked={textDraft.background} onChange={(event) => setTextDraft({ ...textDraft, background: event.target.checked })} />
              BG
            </label>
            <button onClick={commitText}>ADD</button>
            <button onClick={() => setTextDraft(null)}>CANCEL</button>
          </div>
          <div className="text-editor-hint">Enter = add · Shift+Enter = new line · Esc/right-click = cancel</div>
        </div>
      )}

      <div className="map-bottom-hud">
        {scaleBar && (
          <div className="scale-readout">
            <div className="scale-line" style={{ width: `${scaleBar.width}px` }} />
            <span>{scaleBar.label}</span>
          </div>
        )}
        <div className="coordinate-readout">{coordinateReadout || (mapImage ? "MAP COORDINATES" : "LOAD A BUILT-IN MAP")}</div>
      </div>

      {!mapImage && (
        <div className="map-empty-overlay">
          <strong>TACTICAL MAP BOARD</strong>
          <span>Everon and Serhiivka can be included by the installer build.</span>
        </div>
      )}
    </section>
  );
}
