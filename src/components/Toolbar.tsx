import { useEffect, useState } from "react";
import { calibrationPresets, guessCalibrationFromName } from "../lib/mapScale";
import { usePlannerStore } from "../store";
import type { PlannerTool } from "../types";
import { SessionModal } from "./SessionModal";
import { MapHelpModal } from "./MapHelpModal";
import { MapCalibrationModal } from "./MapCalibrationModal";
import { MapLibraryModal } from "./MapLibraryModal";

async function readImageSize(dataUrl: string) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error("Could not read the selected image."));
    img.src = dataUrl;
  });
}

const tools: Array<[PlannerTool, string, string]> = [
  ["select", "SELECT", "V"],
  ["line", "LINE", "L"],
  ["arrow", "ARROW", "A"],
  ["freehand", "PENCIL", "P"],
  ["area", "AREA", "G"],
  ["route", "ROUTE", "R"],
  ["measure", "MEASURE", "M"],
  ["text", "TEXT", "T"],
  ["erase", "ERASE", "E"]
];

export function Toolbar() {
  const [modal, setModal] = useState<"host" | "join" | null>(null);
  const [mapHelp, setMapHelp] = useState(false);
  const [calibrationOpen, setCalibrationOpen] = useState(false);
  const [mapLibraryOpen, setMapLibraryOpen] = useState(false);
  const [overlay, setOverlay] = useState<OverlayState>({
    alwaysOnTop: false,
    opacity: 1,
    clickThrough: false,
    sideMode: false
  });
  const [compact, setCompact] = useState(false);
  const [leftDrawer, setLeftDrawer] = useState(false);
  const [rightDrawer, setRightDrawer] = useState(false);

  const missionName = usePlannerStore((s) => s.missionName);
  const setMissionName = usePlannerStore((s) => s.setMissionName);
  const setMapImage = usePlannerStore((s) => s.setMapImage);
  const calibration = usePlannerStore((s) => s.calibration);
  const setCalibration = usePlannerStore((s) => s.setCalibration);
  const activeTool = usePlannerStore((s) => s.activeTool);
  const setActiveTool = usePlannerStore((s) => s.setActiveTool);
  const drawingColor = usePlannerStore((s) => s.drawingColor);
  const setDrawingColor = usePlannerStore((s) => s.setDrawingColor);
  const showGrid = usePlannerStore((s) => s.showGrid);
  const setShowGrid = usePlannerStore((s) => s.setShowGrid);
  const buildPlan = usePlannerStore((s) => s.buildPlan);
  const loadPlan = usePlannerStore((s) => s.loadPlan);
  const roomCode = usePlannerStore((s) => s.roomCode);

  useEffect(() => {
    window.desktop?.getOverlayState().then(setOverlay);
    return window.desktop?.onOverlayState(setOverlay);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("compact-mode", compact || overlay.sideMode);
    document.body.classList.toggle("side-mode", overlay.sideMode);
    if (overlay.sideMode) setCompact(false);
  }, [compact, overlay.sideMode]);

  useEffect(() => {
    document.body.classList.toggle("left-drawer-open", leftDrawer);
    document.body.classList.toggle("right-drawer-open", rightDrawer);
  }, [leftDrawer, rightDrawer]);

  useEffect(() => {
    if (!compact && !overlay.sideMode) {
      setLeftDrawer(false);
      setRightDrawer(false);
    }
  }, [compact, overlay.sideMode]);

  async function importMap() {
    if (!window.desktop) return;
    const result = await window.desktop.openMapImage();
    if (!result) return;
    const size = await readImageSize(result.dataUrl);
    const map = { ...result, ...size, sourceType: "image" as const };
    setMapImage(map);

    const guessed = guessCalibrationFromName(result.name);
    if (guessed.presetId !== "unknown") setCalibration(guessed);
    else setCalibration({ ...calibration, presetId: calibration.widthMeters > 0 ? calibration.presetId : "unknown" });
  }

  async function save() {
    if (!window.desktop) return;
    await window.desktop.savePlan(buildPlan());
  }

  async function load() {
    if (!window.desktop) return;
    const result = await window.desktop.loadPlan();
    if (!result) return;

    try {
      loadPlan(result as any);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not load plan.");
    }
  }

  async function toggleTop() {
    if (!window.desktop) return;
    setOverlay(await window.desktop.setAlwaysOnTop(!overlay.alwaysOnTop));
  }

  async function toggleClickThrough() {
    if (!window.desktop) return;
    setOverlay(await window.desktop.setClickThrough(!overlay.clickThrough));
  }

  async function toggleSideMode() {
    if (!window.desktop) return;
    setOverlay(await window.desktop.setSideMode(!overlay.sideMode));
  }

  async function changeOpacity(value: number) {
    if (!window.desktop) return;
    setOverlay(await window.desktop.setOpacity(value));
  }

  function quickPreset() {
    if (calibration.presetId === "everon") setCalibration({ ...calibrationPresets.serhiivka });
    else setCalibration({ ...calibrationPresets.everon });
  }

  function toggleLeftDrawer() {
    setLeftDrawer((value) => !value);
    setRightDrawer(false);
  }

  function toggleRightDrawer() {
    setRightDrawer((value) => !value);
    setLeftDrawer(false);
  }

  return (
    <>
      <div className="toolbar main-toolbar">
        <div className="toolbar-group map-actions">
          <button onClick={() => setMapLibraryOpen(true)}>MAPS</button>
          <button className="hide-in-side" onClick={importMap}>IMPORT PNG</button>
          <button
            className={`hide-in-side ${calibration.widthMeters > 0 ? "active-subtle" : "warning-active"}`}
            onClick={() => setCalibrationOpen(true)}
          >
            SCALE {calibration.widthMeters > 0 ? `${calibration.widthMeters / 1000}KM` : "?"}
          </button>
          <button
            className={`hide-in-side ${showGrid ? "active-subtle" : ""}`}
            onDoubleClick={quickPreset}
            onClick={() => setShowGrid(!showGrid)}
          >
            GRID
          </button>
          <button onClick={() => window.dispatchEvent(new Event("planner:fit-map"))}>FIT</button>
          <button className="hide-in-side" onClick={() => setMapHelp(true)}>HELP</button>
          <button onClick={save}>SAVE</button>
          <button className="hide-in-side" onClick={load}>LOAD</button>
        </div>

        <div className="toolbar-group mission-editor hide-in-side">
          <span>MISSION</span>
          <input value={missionName} onChange={(e) => setMissionName(e.target.value)} />
        </div>

        <div className="toolbar-group hide-in-side">
          <button disabled={Boolean(roomCode)} onClick={() => setModal("host")}>HOST</button>
          <button disabled={Boolean(roomCode)} onClick={() => setModal("join")}>JOIN</button>
        </div>

        <div className="toolbar-group side-only drawer-actions">
          <button className={leftDrawer ? "active" : ""} onClick={toggleLeftDrawer}>MARKERS</button>
          <button className={rightDrawer ? "active" : ""} onClick={toggleRightDrawer}>DETAILS</button>
        </div>

        <div className="toolbar-spacer" />

        <div className="toolbar-group overlay-tools">
          <button className={`hide-in-side ${overlay.alwaysOnTop ? "active" : ""}`} onClick={toggleTop}>TOP</button>
          <button className={`hide-in-side ${compact ? "active" : ""}`} onClick={() => setCompact((v) => !v)}>COMPACT</button>
          <button className={overlay.sideMode ? "active" : ""} onClick={toggleSideMode}>SIDE</button>
          <label className="opacity-control hide-in-side">
            <span>OPACITY</span>
            <input type="range" min="0.35" max="1" step="0.05" value={overlay.opacity} onChange={(e) => changeOpacity(Number(e.target.value))} />
          </label>
          <button className={`hide-in-side ${overlay.clickThrough ? "warning-active" : ""}`} onClick={toggleClickThrough}>CLICK-THROUGH</button>
        </div>
      </div>

      <div className="toolbar drawing-toolbar">
        <div className="tool-strip">
          {tools.map(([tool, label, key]) => (
            <button key={tool} className={activeTool === tool ? "active" : ""} onClick={() => setActiveTool(tool)} title={`${label} (${key})`}>
              <span>{label}</span><kbd>{key}</kbd>
            </button>
          ))}
        </div>

        <div className="drawing-colour-control">
          <span>INK</span>
          <input type="color" value={drawingColor} onChange={(e) => setDrawingColor(e.target.value)} />
          <button className="colour-preset blue" onClick={() => setDrawingColor("#55a7ff")} title="Blue planning ink" />
          <button className="colour-preset red" onClick={() => setDrawingColor("#ff6262")} title="Red planning ink" />
          <button className="colour-preset yellow" onClick={() => setDrawingColor("#f2cf66")} title="Yellow planning ink" />
          <button className="colour-preset green" onClick={() => setDrawingColor("#72d893")} title="Green planning ink" />
          <button className="colour-preset white" onClick={() => setDrawingColor("#ffffff")} title="White planning ink" />
          <button className="colour-preset orange" onClick={() => setDrawingColor("#ff9f43")} title="Orange planning ink" />
          <button className="colour-preset purple" onClick={() => setDrawingColor("#b78cff")} title="Purple planning ink" />
        </div>
      </div>

      {overlay.clickThrough && (
        <div className="clickthrough-banner">CLICK-THROUGH ENABLED · press CTRL + SHIFT + O to regain mouse control</div>
      )}

      {modal && <SessionModal mode={modal} onClose={() => setModal(null)} />}
      {mapHelp && <MapHelpModal onClose={() => setMapHelp(false)} />}
      {calibrationOpen && <MapCalibrationModal onClose={() => setCalibrationOpen(false)} />}
      {mapLibraryOpen && <MapLibraryModal onClose={() => setMapLibraryOpen(false)} />}
    </>
  );
}
