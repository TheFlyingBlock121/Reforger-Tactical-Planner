# v0.7 changelog

## Map/rendering overhaul

- Source markers are now screen-space UI symbols rather than map-space scaled sprites.
- Added three-tier automatic marker LOD: overview / normal / detail.
- Added marker label density reduction at overview zoom.
- Cached generated NATO symbol images.
- Added automatic raster map LOD generation during installer build.
- Lower LOD tiles are JPEG to keep the installer substantially smaller than duplicating lossless PNG pyramids.
- Map layer tile cache starts at 64 entries; OpenLayers can auto-grow only when required to cover the viewport.
- Tile preload disabled.
- Tile transition disabled.
- Vector rebuilds disabled during active zoom/pan animation.
- Marker and drawing feature collections are diff-updated instead of fully cleared/rebuilt.
- Pointer coordinate state updates are animation-frame throttled.
- Map grid automatically changes spacing by zoom level.
- Overview drawing LOD hides nonessential labels/route waypoint detail.

## Drawing QoL

- Right-click finishes current multi-point drawing.
- Escape cancels current in-progress drawing.
- Text no longer uses `window.prompt`.
- Added on-map text editor with Enter/Add and Escape/Cancel.
- Text size editing.
- Optional text readability background.
- Text supports Shift+Enter multi-line labels and can be dragged in Select mode.
- Lines/routes/areas can also be dragged as complete graphics in Select mode.
- Added white/orange/purple ink presets in addition to existing colours.
- Fixed OpenLayers `FeatureLike` style typing that caused the v0.6 TypeScript build error.

## Overlay QoL

- Side mode narrowed to roughly 360-470 px depending on monitor size.
- Side-mode title bar and toolbars are more compact.
- Side marker/details drawers retained.
- Previous normal window position/size restores on exit.

## Multiplayer

- Explicit Socket.IO reconnect/backoff configuration.
- 60-second HOST/JOIN acknowledgement window so a sleeping hobby relay has time to wake up.
- Automatic room rejoin after an ordinary Socket.IO reconnect when the room still exists.
- Relay message size reduced to 5 MB because map imagery is never synchronized.
- Room player cap added to keep hobby relay memory predictable.
- Added COPY room code and LEAVE session buttons in the title bar.
- Installer build requires a public HTTPS relay URL, preventing accidentally sharing a localhost-only build.

## Distribution

- Loose folder/portable distribution retired.
- Assisted NSIS installer is now the default build.
- Everon + Serhiivka raw tiles are embedded as installer resources.
- Generated map LOD is embedded too.
- Added one-click `BUILD-INSTALLER-WINDOWS.bat`.
- Added GitHub repository + Release tutorial.
- Added Render relay deployment tutorial.
