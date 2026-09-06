import { useMemo, useState } from "react";
import { calibrationPresets } from "../lib/mapScale";
import { usePlannerStore } from "../store";
import type { CalibrationPresetId, MapCalibration } from "../types";

type Props = {
  onClose(): void;
};

export function MapCalibrationModal({ onClose }: Props) {
  const current = usePlannerStore((s) => s.calibration);
  const image = usePlannerStore((s) => s.mapImage);
  const setCalibration = usePlannerStore((s) => s.setCalibration);

  const [preset, setPreset] = useState<CalibrationPresetId>(current.presetId);
  const [name, setName] = useState(current.name);
  const [width, setWidth] = useState(String(current.widthMeters || ""));
  const [height, setHeight] = useState(String(current.heightMeters || ""));
  const [grid, setGrid] = useState(String(current.gridMeters || 1000));

  const pixelScale = useMemo(() => {
    const w = Number(width);
    const h = Number(height);
    if (!image || !w || !h) return null;
    return {
      x: w / image.width,
      y: h / image.height
    };
  }, [image, width, height]);

  function choosePreset(value: CalibrationPresetId) {
    setPreset(value);
    if (value === "everon" || value === "serhiivka") {
      const item = calibrationPresets[value];
      setName(item.name);
      setWidth(String(item.widthMeters));
      setHeight(String(item.heightMeters));
      setGrid(String(item.gridMeters));
    }
    if (value === "custom") {
      setName(current.presetId === "custom" ? current.name : "Custom map");
    }
  }

  function save() {
    const widthMeters = Number(width);
    const heightMeters = Number(height);
    const gridMeters = Number(grid);

    if (!(widthMeters > 0) || !(heightMeters > 0)) {
      alert("Enter the full map width and height in meters.");
      return;
    }

    const calibration: MapCalibration = {
      presetId: preset === "unknown" ? "custom" : preset,
      name: name.trim() || "Calibrated map",
      widthMeters,
      heightMeters,
      gridMeters: gridMeters > 0 ? gridMeters : 1000
    };

    setCalibration(calibration);
    onClose();
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal calibration-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="panel-title">MAP SCALE / CALIBRATION</div>

        <div className="preset-grid">
          <button className={preset === "everon" ? "active" : ""} onClick={() => choosePreset("everon")}>EVERON / EDEN</button>
          <button className={preset === "serhiivka" ? "active" : ""} onClick={() => choosePreset("serhiivka")}>SERHIIVKA</button>
          <button className={preset === "custom" ? "active" : ""} onClick={() => choosePreset("custom")}>CUSTOM</button>
        </div>

        <div className="calibration-note">
          <strong>Everon / Eden:</strong> 12,800 × 12,800 m. <strong>Serhiivka:</strong> 10,240 × 10,240 m using your supplied map size.
          Calibration makes the ruler, routes, grid and coordinate readout use real in-game meters.
        </div>

        <label className="field">
          <span>Map profile name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>

        <div className="two-column-fields">
          <label className="field">
            <span>Full width (m)</span>
            <input inputMode="numeric" value={width} onChange={(e) => setWidth(e.target.value)} />
          </label>
          <label className="field">
            <span>Full height (m)</span>
            <input inputMode="numeric" value={height} onChange={(e) => setHeight(e.target.value)} />
          </label>
        </div>

        <label className="field">
          <span>Planning grid spacing (m)</span>
          <input inputMode="numeric" value={grid} onChange={(e) => setGrid(e.target.value)} />
        </label>

        {image && (
          <div className="map-metrics-card">
            <div><span>IMAGE</span><strong>{image.width.toLocaleString()} × {image.height.toLocaleString()} px</strong></div>
            {pixelScale && (
              <>
                <div><span>HORIZONTAL</span><strong>1 px = {pixelScale.x.toFixed(3)} m</strong></div>
                <div><span>VERTICAL</span><strong>1 px = {pixelScale.y.toFixed(3)} m</strong></div>
              </>
            )}
          </div>
        )}

        <div className="modal-actions">
          <button className="ghost-button" onClick={onClose}>Cancel</button>
          <button className="primary-button" onClick={save}>APPLY SCALE</button>
        </div>
      </div>
    </div>
  );
}
