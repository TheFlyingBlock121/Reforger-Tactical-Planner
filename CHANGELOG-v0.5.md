# v0.5 changes

- Changed default distribution model from sidecar maps to **built-in map resources**.
- Added electron-builder `extraResources` packaging for `builtin-maps`.
- Portable build now produces one EXE containing both prepared map packs.
- Added automatic Workbench `capture_tiles` discovery.
- Added explicit Everon/Serhiivka source overrides.
- Added robust exact-grid validation rather than tile-count-only validation.
- Added automatic PNG tile-size detection and payload-size reporting.
- Added automatic manifest generation.
- Built-in resources are preferred over legacy sidecar packs.
- Added custom user map folder separately for future expansion.
- Added BUILT-IN labels in the map library.
- App remembers last map and automatically opens it on startup.
- Everon is the first-launch default when both built-ins are available.
- Preserved v0.4 sidecar compatibility so older setups still open.
- Updated plan format version to 5.
