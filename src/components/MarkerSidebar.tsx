import { markerDefinitions } from "../markerLibrary";
import { usePlannerStore } from "../store";
import type { Affiliation } from "../types";
import { NatoSymbol } from "./NatoSymbol";

const categories = ["Infantry", "Support", "Vehicles", "Aviation", "Objectives"] as const;
const affiliations: Array<[Affiliation, string]> = [
  ["friendly", "FRIEND"],
  ["hostile", "HOSTILE"],
  ["neutral", "NEUTRAL"],
  ["unknown", "UNKNOWN"]
];

export function MarkerSidebar() {
  const placement = usePlannerStore((s) => s.placementDefinitionId);
  const placementAffiliation = usePlannerStore((s) => s.placementAffiliation);
  const setPlacement = usePlannerStore((s) => s.setPlacementDefinition);
  const setPlacementAffiliation = usePlannerStore((s) => s.setPlacementAffiliation);

  return (
    <aside className="sidebar left-sidebar">
      <div className="panel-title">APP-6-STYLE GAME UNIT SYMBOLS</div>

      <div className="affiliation-picker">
        {affiliations.map(([value, label]) => (
          <button
            key={value}
            className={`affiliation-choice affiliation-${value} ${placementAffiliation === value ? "active" : ""}`}
            onClick={() => setPlacementAffiliation(value)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="hint">Choose an affiliation and a broad game-unit symbol, then click the map.</div>

      {categories.map((category) => (
        <section className="marker-section" key={category}>
          <h3>{category.toUpperCase()}</h3>
          <div className="marker-list">
            {markerDefinitions
              .filter((item) => item.category === category)
              .map((item) => (
                <button
                  className={`marker-option ${placement === item.id ? "active" : ""}`}
                  key={item.id}
                  onClick={() => setPlacement(placement === item.id ? null : item.id)}
                >
                  <span className="symbol-cell">
                    {item.symbolMode === "nato" ? (
                      <NatoSymbol
                        definitionId={item.id}
                        affiliation={placementAffiliation}
                        unitSize={item.defaultUnitSize}
                        size={27}
                      />
                    ) : (
                      <span className="marker-mini objective-mini">{item.abbreviation}</span>
                    )}
                  </span>
                  <span>{item.name}</span>
                </button>
              ))}
          </div>
        </section>
      ))}
    </aside>
  );
}
