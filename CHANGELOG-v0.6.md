# v0.6 changelog

## Build/map workflow

- exactly two source tile folders included in the download
- drop PNG tiles directly into `BUILT_IN_MAP_TILES/Everon`
- drop PNG tiles directly into `BUILT_IN_MAP_TILES/Serhiivka`
- no manual map manifest creation required
- no automatic Workbench-folder hunting required
- automatic row/column detection
- automatic PNG tile-size detection
- strict rectangular-grid/missing-tile validation
- explicit top-left / rows-down / columns-right interpretation
- automatic metadata refresh before build
- development reads directly from those folders, avoiding a duplicate map copy
- finished `win-unpacked` application contains both maps under `resources/maps`
- build script automatically creates a ZIP for sharing
- output ZIP-size warning near GitHub's 2 GiB release-asset limit

## Overlay QOL

- new SIDE mode
- global `Ctrl+Shift+S` toggle
- SIDE automatically docks to the right side of the active display
- SIDE automatically turns on always-on-top
- leaving SIDE restores the previous window bounds and previous always-on-top state
- compact/side marker library becomes a temporary MARKERS drawer
- selected-item panel becomes a temporary DETAILS drawer
- narrower toolbar styling for side-screen use
- click-through safety shortcut retained (`Ctrl+Shift+O`)

## Map library QOL

- built-in map screen explains tile orientation
- source build can open the two built-in tile folders directly
- packaged build scans the bundled resources
- last selected built-in map remains remembered

## Compatibility

- older `.plan` versions remain loadable
- v0.6 saves plan format version 6
