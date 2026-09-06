import { create } from "zustand";
import { markerDefinitionById } from "./markerLibrary";
import { plannerRealtime } from "./lib/realtime";
import { unknownCalibration } from "./lib/mapScale";
import type {
  Affiliation,
  MapCalibration,
  MapDrawing,
  MapImage,
  PlanFile,
  PlannerTool,
  TacticalMarker
} from "./types";

type Player = {
  id: string;
  name: string;
  role: "host" | "planner";
};

type PlannerState = {
  missionName: string;
  mapImage: MapImage | null;
  calibration: MapCalibration;
  markers: TacticalMarker[];
  drawings: MapDrawing[];
  selectedMarkerId: string | null;
  selectedDrawingId: string | null;
  placementDefinitionId: string | null;
  placementAffiliation: Affiliation;
  activeTool: PlannerTool;
  drawingColor: string;
  showGrid: boolean;
  roomCode: string;
  players: Player[];
  playerName: string;

  setMissionName(value: string): void;
  setPlayerName(value: string): void;
  setRoom(code: string, players?: Player[]): void;
  setPlayers(players: Player[]): void;
  setPlacementDefinition(id: string | null): void;
  setPlacementAffiliation(value: Affiliation): void;
  setActiveTool(tool: PlannerTool): void;
  setDrawingColor(color: string): void;
  setShowGrid(value: boolean): void;
  selectMarker(id: string | null): void;
  selectDrawing(id: string | null): void;
  clearSelection(): void;

  setMapImage(map: MapImage | null, remote?: boolean): void;
  setCalibration(calibration: MapCalibration, remote?: boolean): void;
  addMarker(marker: TacticalMarker, remote?: boolean): void;
  createMarker(definitionId: string, x: number, y: number): TacticalMarker | null;
  updateMarker(id: string, patch: Partial<TacticalMarker>, remote?: boolean): void;
  replaceMarker(marker: TacticalMarker, remote?: boolean): void;
  deleteMarker(id: string, remote?: boolean): void;

  addDrawing(drawing: MapDrawing, remote?: boolean): void;
  updateDrawing(id: string, patch: Partial<MapDrawing>, remote?: boolean): void;
  replaceDrawing(drawing: MapDrawing, remote?: boolean): void;
  deleteDrawing(id: string, remote?: boolean): void;

  buildPlan(): PlanFile;
  loadPlan(plan: PlanFile): void;
};

export const usePlannerStore = create<PlannerState>((set, get) => ({
  missionName: "OPERATION NIGHTFALL",
  mapImage: null,
  calibration: { ...unknownCalibration },
  markers: [],
  drawings: [],
  selectedMarkerId: null,
  selectedDrawingId: null,
  placementDefinitionId: null,
  placementAffiliation: "friendly",
  activeTool: "select",
  drawingColor: "#f2cf66",
  showGrid: true,
  roomCode: "",
  players: [],
  playerName: localStorage.getItem("rtp-player-name") || "Player",

  setMissionName: (value) => set({ missionName: value }),
  setPlayerName: (value) => {
    localStorage.setItem("rtp-player-name", value);
    set({ playerName: value });
  },
  setRoom: (roomCode, players = []) => set({ roomCode, players }),
  setPlayers: (players) => set({ players }),
  setPlacementDefinition: (placementDefinitionId) => set({
    placementDefinitionId,
    activeTool: placementDefinitionId ? "select" : get().activeTool
  }),
  setPlacementAffiliation: (placementAffiliation) => set({ placementAffiliation }),
  setActiveTool: (activeTool) => set({
    activeTool,
    placementDefinitionId: null,
    selectedMarkerId: activeTool === "select" ? get().selectedMarkerId : null,
    selectedDrawingId: activeTool === "select" ? get().selectedDrawingId : null
  }),
  setDrawingColor: (drawingColor) => set({ drawingColor }),
  setShowGrid: (showGrid) => set({ showGrid }),
  selectMarker: (selectedMarkerId) => set({ selectedMarkerId, selectedDrawingId: null }),
  selectDrawing: (selectedDrawingId) => set({ selectedDrawingId, selectedMarkerId: null }),
  clearSelection: () => set({ selectedMarkerId: null, selectedDrawingId: null }),

  setMapImage: (mapImage, remote = false) => {
    set({ mapImage });
    if (!remote) plannerRealtime.setMap(mapImage);
  },

  setCalibration: (calibration, remote = false) => {
    set({ calibration });
    if (!remote) plannerRealtime.setCalibration(calibration);
  },

  addMarker: (marker, remote = false) => {
    set((state) => ({
      markers: [...state.markers.filter((item) => item.id !== marker.id), marker]
    }));
    if (!remote) plannerRealtime.addMarker(marker);
  },

  createMarker: (definitionId, x, y) => {
    const def = markerDefinitionById.get(definitionId);
    if (!def) return null;

    const marker: TacticalMarker = {
      id: crypto.randomUUID(),
      definitionId,
      x,
      y,
      label: def.name,
      affiliation: get().placementAffiliation,
      unitSize: def.defaultUnitSize,
      callsign: "",
      strength: "",
      aircraftType: "",
      altitude: "",
      speed: "",
      task: "",
      radio: "",
      notes: ""
    };

    get().addMarker(marker);
    set({ selectedMarkerId: marker.id, selectedDrawingId: null });
    return marker;
  },

  updateMarker: (id, patch, remote = false) => {
    let updated: TacticalMarker | undefined;
    set((state) => ({
      markers: state.markers.map((marker) => {
        if (marker.id !== id) return marker;
        updated = { ...marker, ...patch };
        return updated;
      })
    }));
    if (!remote && updated) plannerRealtime.updateMarker(updated);
  },

  replaceMarker: (marker, remote = false) => {
    const migrated = { ...marker, unitSize: marker.unitSize || "none" };
    set((state) => ({
      markers: state.markers.some((item) => item.id === migrated.id)
        ? state.markers.map((item) => (item.id === migrated.id ? migrated : item))
        : [...state.markers, migrated]
    }));
    if (!remote) plannerRealtime.updateMarker(migrated);
  },

  deleteMarker: (id, remote = false) => {
    set((state) => ({
      markers: state.markers.filter((marker) => marker.id !== id),
      selectedMarkerId: state.selectedMarkerId === id ? null : state.selectedMarkerId
    }));
    if (!remote) plannerRealtime.deleteMarker(id);
  },

  addDrawing: (drawing, remote = false) => {
    set((state) => ({
      drawings: [...state.drawings.filter((item) => item.id !== drawing.id), drawing]
    }));
    if (!remote) plannerRealtime.addDrawing(drawing);
  },

  updateDrawing: (id, patch, remote = false) => {
    let updated: MapDrawing | undefined;
    set((state) => ({
      drawings: state.drawings.map((drawing) => {
        if (drawing.id !== id) return drawing;
        updated = { ...drawing, ...patch };
        return updated;
      })
    }));
    if (!remote && updated) plannerRealtime.updateDrawing(updated);
  },

  replaceDrawing: (drawing, remote = false) => {
    set((state) => ({
      drawings: state.drawings.some((item) => item.id === drawing.id)
        ? state.drawings.map((item) => (item.id === drawing.id ? drawing : item))
        : [...state.drawings, drawing]
    }));
    if (!remote) plannerRealtime.updateDrawing(drawing);
  },

  deleteDrawing: (id, remote = false) => {
    set((state) => ({
      drawings: state.drawings.filter((drawing) => drawing.id !== id),
      selectedDrawingId: state.selectedDrawingId === id ? null : state.selectedDrawingId
    }));
    if (!remote) plannerRealtime.deleteDrawing(id);
  },

  buildPlan: () => ({
    format: "reforger-tactical-plan",
    version: 7,
    missionName: get().missionName,
    mapImage: get().mapImage,
    calibration: get().calibration,
    markers: get().markers,
    drawings: get().drawings,
    savedAt: new Date().toISOString()
  }),

  loadPlan: (plan) => {
    if (!plan || plan.format !== "reforger-tactical-plan") {
      throw new Error("This is not a Reforger Tactical Planner file.");
    }

    const migratedMarkers = (Array.isArray(plan.markers) ? plan.markers : []).map((marker) => ({
      ...marker,
      unitSize: marker.unitSize || markerDefinitionById.get(marker.definitionId)?.defaultUnitSize || "none"
    }));

    set({
      missionName: plan.missionName || "OPERATION",
      mapImage: plan.mapImage ? {
        ...plan.mapImage,
        sourceType: plan.mapImage.sourceType || (plan.mapImage.tilePackId ? "tiles" : "image")
      } : null,
      calibration: plan.calibration || { ...unknownCalibration },
      markers: migratedMarkers,
      drawings: Array.isArray(plan.drawings) ? plan.drawings.map((drawing) => ({
        ...drawing,
        textSize: drawing.textSize || 16,
        textBackground: drawing.textBackground ?? true
      })) : [],
      selectedMarkerId: null,
      selectedDrawingId: null,
      placementDefinitionId: null,
      activeTool: "select"
    });
  }
}));
