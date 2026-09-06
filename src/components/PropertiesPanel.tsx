import { markerDefinitionById } from "../markerLibrary";
import { sidcForMarker } from "../lib/symbols";
import { usePlannerStore } from "../store";
import type { TacticalMarker, UnitSize } from "../types";
import { DrawingProperties } from "./DrawingProperties";

const fields: Array<[keyof TacticalMarker, string]> = [
  ["callsign", "Callsign / designator"],
  ["strength", "Strength / crew"],
  ["aircraftType", "Vehicle / aircraft type"],
  ["altitude", "Altitude"],
  ["speed", "Speed"],
  ["task", "Task"],
  ["radio", "Radio frequency"]
];

const unitSizes: Array<[UnitSize, string]> = [
  ["none", "No echelon"],
  ["team", "Team / Crew"],
  ["squad", "Squad"],
  ["section", "Section"],
  ["platoon", "Platoon / Detachment"],
  ["company", "Company"],
  ["battalion", "Battalion"],
  ["regiment", "Regiment / Group"],
  ["brigade", "Brigade"]
];

export function PropertiesPanel() {
  const selectedId = usePlannerStore((s) => s.selectedMarkerId);
  const selectedDrawingId = usePlannerStore((s) => s.selectedDrawingId);
  const marker = usePlannerStore((s) => s.markers.find((item) => item.id === selectedId));
  const updateMarker = usePlannerStore((s) => s.updateMarker);
  const deleteMarker = usePlannerStore((s) => s.deleteMarker);

  if (!marker && selectedDrawingId) {
    return (
      <aside className="sidebar right-sidebar">
        <div className="panel-title">SELECTED GRAPHIC</div>
        <DrawingProperties />
      </aside>
    );
  }

  if (!marker) {
    return (
      <aside className="sidebar right-sidebar">
        <div className="panel-title">SELECTED</div>
        <div className="empty-state">
          Select a unit marker or planning graphic to edit it. Use the top drawing tools for lines, arrows, areas, routes, labels and distance measurement.
        </div>
        <div className="shortcut-card">
          <strong>QUICK TOOLS</strong>
          <span>V Select</span>
          <span>L Line</span>
          <span>A Arrow</span>
          <span>P Pencil</span>
          <span>G Area</span>
          <span>R Route</span>
          <span>M Measure</span>
          <span>T Text</span>
          <span>Esc Cancel</span>
        </div>
      </aside>
    );
  }

  const definition = markerDefinitionById.get(marker.definitionId);
  const sidc = sidcForMarker(marker);

  return (
    <aside className="sidebar right-sidebar">
      <div className="panel-title">SELECTED MARKER</div>
      <div className="selected-heading">
        <strong>{marker.callsign || marker.label}</strong>
        <span>{definition?.name || marker.definitionId}</span>
      </div>

      <label className="field">
        <span>Affiliation</span>
        <select
          value={marker.affiliation}
          onChange={(e) => updateMarker(marker.id, { affiliation: e.target.value as TacticalMarker["affiliation"] })}
        >
          <option value="friendly">Friendly</option>
          <option value="hostile">Hostile</option>
          <option value="neutral">Neutral</option>
          <option value="unknown">Unknown</option>
        </select>
      </label>

      {definition?.symbolMode === "nato" && (
        <>
          <label className="field">
            <span>Unit size / echelon</span>
            <select
              value={marker.unitSize}
              onChange={(e) => updateMarker(marker.id, { unitSize: e.target.value as UnitSize })}
            >
              {unitSizes.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>

          <div className="sidc-readout">
            <span>APP-6 SIDC</span>
            <code>{sidc}</code>
          </div>
        </>
      )}

      {fields.map(([key, label]) => (
        <label className="field" key={String(key)}>
          <span>{label}</span>
          <input
            value={String(marker[key] ?? "")}
            onChange={(e) => updateMarker(marker.id, { [key]: e.target.value })}
          />
        </label>
      ))}

      <label className="field">
        <span>Notes</span>
        <textarea
          rows={5}
          value={marker.notes}
          onChange={(e) => updateMarker(marker.id, { notes: e.target.value })}
        />
      </label>

      <button className="delete-button" onClick={() => deleteMarker(marker.id)}>
        DELETE MARKER
      </button>
    </aside>
  );
}
