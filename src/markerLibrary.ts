import type { MarkerDefinition } from "./types";

// Generic game-unit symbols using APP-6 / MIL-STD-2525-style visual conventions.
// The library intentionally stays at broad unit/vehicle/support categories for
// fictional gameplay planning and does not provide weapon-use guidance.
export const markerDefinitions: MarkerDefinition[] = [
  { id: "unit-team", name: "Team", category: "Infantry", abbreviation: "TM", sidc: "SFGPUCI--------", symbolMode: "nato", defaultUnitSize: "team" },
  { id: "unit-squad", name: "Squad", category: "Infantry", abbreviation: "SQD", sidc: "SFGPUCI--------", symbolMode: "nato", defaultUnitSize: "squad" },
  { id: "unit-platoon", name: "Platoon", category: "Infantry", abbreviation: "PLT", sidc: "SFGPUCI--------", symbolMode: "nato", defaultUnitSize: "platoon" },
  { id: "unit-company", name: "Company", category: "Infantry", abbreviation: "CO", sidc: "SFGPUCI--------", symbolMode: "nato", defaultUnitSize: "company" },

  { id: "support-hq", name: "Headquarters", category: "Support", abbreviation: "HQ", sidc: "SFGPUH---------", symbolMode: "nato", defaultUnitSize: "platoon" },
  { id: "support-engineer", name: "Engineer", category: "Support", abbreviation: "ENG", sidc: "SFGPUCE--------", symbolMode: "nato", defaultUnitSize: "squad" },
  { id: "support-medical", name: "Medical", category: "Support", abbreviation: "MED", sidc: "SFGPUSM--------", symbolMode: "nato", defaultUnitSize: "team" },
  { id: "support-supply", name: "Supply / Logistics", category: "Support", abbreviation: "LOG", sidc: "SFGPUSS--------", symbolMode: "nato", defaultUnitSize: "section" },
  { id: "support-transport", name: "Transportation", category: "Support", abbreviation: "TRN", sidc: "SFGPUST--------", symbolMode: "nato", defaultUnitSize: "section" },

  { id: "veh-light", name: "Light Vehicle Unit", category: "Vehicles", abbreviation: "VEH", sidc: "SFGPUCAW-------", symbolMode: "nato", defaultUnitSize: "none" },
  { id: "veh-general", name: "Vehicle Unit", category: "Vehicles", abbreviation: "VEH", sidc: "SFGPUCA--------", symbolMode: "nato", defaultUnitSize: "platoon" },
  { id: "veh-logistics", name: "Logistics Vehicle Unit", category: "Vehicles", abbreviation: "LOG", sidc: "SFGPUST--------", symbolMode: "nato", defaultUnitSize: "none" },

  { id: "air-rotary", name: "Rotary Wing", category: "Aviation", abbreviation: "RW", sidc: "SFGPUCVR-------", symbolMode: "nato", defaultUnitSize: "none" },
  { id: "air-utility", name: "Utility Rotary Wing", category: "Aviation", abbreviation: "UTIL", sidc: "SFGPUCVRU------", symbolMode: "nato", defaultUnitSize: "none" },
  { id: "air-medevac", name: "Medevac Rotary Wing", category: "Aviation", abbreviation: "MEDEVAC", sidc: "SFGPUCVRUE-----", symbolMode: "nato", defaultUnitSize: "none" },
  { id: "air-fixed", name: "Fixed Wing", category: "Aviation", abbreviation: "FW", sidc: "SFGPUCVF-------", symbolMode: "nato", defaultUnitSize: "none" },

  { id: "objective-primary", name: "Primary Objective", category: "Objectives", abbreviation: "OBJ", symbolMode: "objective", defaultUnitSize: "none" },
  { id: "objective-secondary", name: "Secondary Objective", category: "Objectives", abbreviation: "OBJ2", symbolMode: "objective", defaultUnitSize: "none" },
  { id: "objective-checkpoint", name: "Checkpoint", category: "Objectives", abbreviation: "CP", symbolMode: "objective", defaultUnitSize: "none" },
  { id: "objective-rally", name: "Rally Point", category: "Objectives", abbreviation: "RP", symbolMode: "objective", defaultUnitSize: "none" },
  { id: "objective-lz", name: "Landing Zone", category: "Objectives", abbreviation: "LZ", symbolMode: "objective", defaultUnitSize: "none" },
  { id: "objective-logistics", name: "Logistics Point", category: "Objectives", abbreviation: "LOG", symbolMode: "objective", defaultUnitSize: "none" }
];

export const markerDefinitionById = new Map(markerDefinitions.map((item) => [item.id, item]));
