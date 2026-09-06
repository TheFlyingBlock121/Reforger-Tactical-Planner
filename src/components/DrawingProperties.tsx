import { formatArea, formatDistance, lineDistanceMeters, polygonAreaSquareMeters } from "../lib/mapScale";
import { usePlannerStore } from "../store";

const palette = ["#55a7ff", "#ff6262", "#f2cf66", "#72d893", "#ffffff", "#ff9f43", "#b78cff"];

export function DrawingProperties() {
  const selectedId = usePlannerStore((s) => s.selectedDrawingId);
  const drawing = usePlannerStore((s) => s.drawings.find((item) => item.id === selectedId));
  const mapImage = usePlannerStore((s) => s.mapImage);
  const calibration = usePlannerStore((s) => s.calibration);
  const updateDrawing = usePlannerStore((s) => s.updateDrawing);
  const deleteDrawing = usePlannerStore((s) => s.deleteDrawing);

  if (!drawing) return null;

  const distance = drawing.kind === "area" || drawing.kind === "text"
    ? null
    : lineDistanceMeters(drawing.points, mapImage, calibration);
  const area = drawing.kind === "area"
    ? polygonAreaSquareMeters(drawing.points, mapImage, calibration)
    : null;

  return (
    <>
      <div className="selected-heading">
        <strong>{drawing.label || drawing.kind.toUpperCase()}</strong>
        <span>{drawing.kind.toUpperCase()} PLANNING GRAPHIC</span>
      </div>

      <label className="field">
        <span>Label</span>
        <input value={drawing.label} onChange={(e) => updateDrawing(drawing.id, { label: e.target.value })} />
      </label>

      <label className="field">
        <span>Colour</span>
        <div className="color-property-row">
          <input type="color" value={drawing.color} onChange={(e) => updateDrawing(drawing.id, { color: e.target.value })} />
          <code>{drawing.color.toUpperCase()}</code>
        </div>
        <div className="property-palette">
          {palette.map((color) => (
            <button
              key={color}
              className={drawing.color.toLowerCase() === color.toLowerCase() ? "active" : ""}
              style={{ background: color }}
              title={color}
              onClick={() => updateDrawing(drawing.id, { color })}
            />
          ))}
        </div>
      </label>

      {drawing.kind === "text" && (
        <>
          <label className="field">
            <span>Text size</span>
            <input
              type="range"
              min="9"
              max="36"
              step="1"
              value={drawing.textSize || 16}
              onChange={(e) => updateDrawing(drawing.id, { textSize: Number(e.target.value) })}
            />
          </label>
          <label className="check-field">
            <input
              type="checkbox"
              checked={drawing.textBackground ?? true}
              onChange={(e) => updateDrawing(drawing.id, { textBackground: e.target.checked })}
            />
            <span>Readable dark background</span>
          </label>
        </>
      )}

      {drawing.kind !== "text" && (
        <label className="field">
          <span>Line width</span>
          <input
            type="range"
            min="1"
            max="8"
            step="1"
            value={drawing.lineWidth}
            onChange={(e) => updateDrawing(drawing.id, { lineWidth: Number(e.target.value) })}
          />
        </label>
      )}

      {drawing.kind === "area" && (
        <label className="field">
          <span>Area fill</span>
          <input
            type="range"
            min="0.05"
            max="0.45"
            step="0.05"
            value={drawing.fillOpacity}
            onChange={(e) => updateDrawing(drawing.id, { fillOpacity: Number(e.target.value) })}
          />
        </label>
      )}

      <div className="drawing-metrics">
        {distance !== null && <div><span>DISTANCE</span><strong>{formatDistance(distance)}</strong></div>}
        {area !== null && <div><span>AREA</span><strong>{formatArea(area)}</strong></div>}
        <div><span>POINTS</span><strong>{drawing.points.length}</strong></div>
      </div>

      <button className="delete-button" onClick={() => deleteDrawing(drawing.id)}>
        DELETE GRAPHIC
      </button>
    </>
  );
}
