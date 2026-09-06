import { useEffect } from "react";
import { TitleBar } from "./components/TitleBar";
import { Toolbar } from "./components/Toolbar";
import { MarkerSidebar } from "./components/MarkerSidebar";
import { MapBoard } from "./components/MapBoard";
import { PropertiesPanel } from "./components/PropertiesPanel";
import { plannerRealtime } from "./lib/realtime";
import { chooseStartupMap, makeCalibration, makeMapSource } from "./lib/tileMaps";
import { usePlannerStore } from "./store";
import type { PlannerTool } from "./types";

const keyTools: Record<string, PlannerTool> = {
  v: "select",
  l: "line",
  a: "arrow",
  p: "freehand",
  g: "area",
  r: "route",
  m: "measure",
  t: "text",
  e: "erase"
};

export default function App() {
  useEffect(() => {
    plannerRealtime.configure({
      onRoomState: (state) => {
        usePlannerStore.getState().setMapImage(state.mapImage || null, true);
        usePlannerStore.getState().setCalibration(state.calibration, true);
        usePlannerStore.setState({
          markers: state.markers || [],
          drawings: state.drawings || [],
          selectedMarkerId: null,
          selectedDrawingId: null
        });
      },
      onMap: (map) => usePlannerStore.getState().setMapImage(map, true),
      onCalibration: (calibration) => usePlannerStore.getState().setCalibration(calibration, true),
      onMarkerAdd: (marker) => usePlannerStore.getState().addMarker(marker, true),
      onMarkerUpdate: (marker) => usePlannerStore.getState().replaceMarker(marker, true),
      onMarkerDelete: (id) => usePlannerStore.getState().deleteMarker(id, true),
      onDrawingAdd: (drawing) => usePlannerStore.getState().addDrawing(drawing, true),
      onDrawingUpdate: (drawing) => usePlannerStore.getState().replaceDrawing(drawing, true),
      onDrawingDelete: (id) => usePlannerStore.getState().deleteDrawing(id, true),
      onPlayers: (players) => usePlannerStore.getState().setPlayers(players),
      onDisconnected: () => {
        // Keep the visible room code so the user knows which session was active.
      }
    });

    return () => plannerRealtime.leave();
  }, []);


  useEffect(() => {
    // A finished v0.7 installation contains both maps. On a fresh launch, open the
    // player's last used built-in map automatically (Everon is the fallback).
    // Re-check state after the async scan so a plan opened immediately at
    // startup is never overwritten.
    void (async () => {
      try {
        const packs = await window.desktop?.listTileMaps();
        if (!packs?.length || usePlannerStore.getState().mapImage) return;
        const preferred = localStorage.getItem("rtp-last-map");
        const pack = chooseStartupMap(packs, preferred);
        if (!pack || usePlannerStore.getState().mapImage) return;
        usePlannerStore.getState().setMapImage(makeMapSource(pack), true);
        usePlannerStore.getState().setCalibration(makeCalibration(pack), true);
        localStorage.setItem("rtp-last-map", pack.id);
        queueMicrotask(() => window.dispatchEvent(new Event("planner:fit-map")));
      } catch {
        // Development copies are allowed to start without map tiles prepared.
      }
    })();
  }, []);

  useEffect(() => {
    const onKeyDown = async (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (window.desktop) await window.desktop.savePlan(usePlannerStore.getState().buildPlan());
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "o") {
        event.preventDefault();
        if (!window.desktop) return;
        const plan = await window.desktop.loadPlan();
        if (plan) usePlannerStore.getState().loadPlan(plan as any);
        return;
      }

      if (typing) return;

      if (event.key === "Escape") {
        const state = usePlannerStore.getState();
        state.setPlacementDefinition(null);
        state.setActiveTool("select");
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        const state = usePlannerStore.getState();
        if (state.selectedMarkerId) state.deleteMarker(state.selectedMarkerId);
        else if (state.selectedDrawingId) state.deleteDrawing(state.selectedDrawingId);
        return;
      }

      const tool = keyTools[event.key.toLowerCase()];
      if (tool) {
        event.preventDefault();
        usePlannerStore.getState().setActiveTool(tool);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const calibration = usePlannerStore((s) => s.calibration);
  const markers = usePlannerStore((s) => s.markers.length);
  const drawings = usePlannerStore((s) => s.drawings.length);
  const activeTool = usePlannerStore((s) => s.activeTool);

  return (
    <div className="app">
      <TitleBar />
      <Toolbar />
      <div className="workspace">
        <MarkerSidebar />
        <MapBoard />
        <PropertiesPanel />
      </div>
      <footer className="phasebar statusbar">
        <span className="status-pill">TOOL {activeTool.toUpperCase()}</span>
        <span>{markers} markers</span>
        <span>{drawings} graphics</span>
        <span>{calibration.widthMeters > 0 ? `${calibration.name} · ${calibration.widthMeters}×${calibration.heightMeters} m` : "MAP NOT CALIBRATED"}</span>
        <span className="phase-note">v0.7 · AUTO LOD · Right-click Finish · Esc Cancel · Ctrl+Shift+S Side</span>
      </footer>
    </div>
  );
}
