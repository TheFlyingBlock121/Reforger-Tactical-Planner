# Reforger Tactical Planner v0.4

## Tiled map engine

- Added direct support for `tile_r###_c###.png` capture folders.
- Added automatic row/column detection.
- Added automatic tile-size detection from PNG headers.
- Added missing-tile validation.
- Added viewport tile loading so huge maps are not flattened into one image.
- Added a custom Electron `rtpmap://` protocol for safe local tile streaming.
- Added a MAPS library window.
- Added built-in map profiles for Everon / Eden and Serhiivka.
- Tile map descriptors are tiny and sync through multiplayer without sending gigabytes of image data.
- Saved plans reference the tile-pack ID rather than embedding the tile files.

## QOL / reliability

- Added OPEN MAPS FOLDER.
- Added RESCAN without restarting the app.
- Added a clear missing-map/tile error banner.
- Kept normal PNG/JPG import as a fallback.
- Kept scale, grid, measure, route, area, text, line, arrow and pencil tools.
- Kept overlay, save/load and multiplayer synchronization.
- v0.1-v0.3 plan files are migrated automatically.

## Windows helper scripts

- `scripts/link-map-tiles.ps1` links existing huge capture folders into the dev project without copying them.
- `scripts/check-map-packs.mjs` validates both maps.
- `scripts/package-with-maps.ps1` creates an easy-to-share EXE + maps folder package.

## Why maps are sidecar files

A single map archive can be multiple gigabytes. Keeping maps next to the EXE is more maintainable and avoids making the Electron executable itself several gigabytes. From the player's point of view the maps are still included: open the folder and double-click the EXE.
