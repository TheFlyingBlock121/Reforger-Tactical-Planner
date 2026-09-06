# Reforger Tactical Planner v0.7

Windows-first collaborative planning-board companion for fictional Arma Reforger gameplay.

v0.7 is the installer/performance overhaul. The source project has exactly two built-in-map drop folders. You drop your existing tile PNGs into them, deploy the small relay once, and run one BAT file to build a normal Windows installer containing both maps.

## The two built-in map folders

```text
BUILT_IN_MAP_TILES/
├─ Everon/
│  ├─ tile_r000_c000.png
│  ├─ tile_r000_c001.png
│  └─ ...
└─ Serhiivka/
   ├─ tile_r000_c000.png
   ├─ tile_r000_c001.png
   └─ ...
```

Tile orientation is fixed and automatically detected:

- `r000/c000` is top-left
- row numbers increase downward
- column numbers increase to the right
- row/column count and PNG resolution are scanned automatically
- missing tiles stop the build instead of making a broken installer

Built-in calibration profiles:

- Everon / Eden: 12,800 x 12,800 m
- Serhiivka: 10,240 x 10,240 m

## Performance overhaul

v0.7 does not stitch the source tiles into a giant bitmap.

The build creates compact lower-detail JPEG tile levels automatically. At wide zoom the app requests a few low-detail tiles instead of hundreds of full-resolution PNG tiles. At close zoom it switches back to the original PNG data.

Runtime optimizations include:

- automatic raster LOD pyramid
- tile cache starts small (64 entries) and OpenLayers auto-grows only when the viewport needs more
- no tile preloading
- no tile fade transition
- vector layers do not rebuild while panning/zoom animation is active
- marker/drawing feature objects are updated in place instead of clearing/recreating every feature
- pointer-coordinate UI updates are requestAnimationFrame-throttled
- grid spacing automatically becomes coarser at wide zoom
- route/area labels and route waypoint detail reduce at overview zoom
- NATO/unit symbol raster output is cached
- multiplayer never transfers the map image files

## Marker zoom behavior

Markers are screen-space symbols, not map-space sprites. They therefore do not become giant objects when you zoom the map.

AUTO LOD has three discrete display tiers:

- Overview: smaller icons, most labels hidden
- Normal: normal icon size, labels shown when density is reasonable
- Detail: normal close-view icons and labels

The icon size changes only when crossing an LOD tier. It does not continuously grow/shrink with the map.

## Drawing controls

- `V` Select
- `L` Line
- `A` Arrow
- `P` Pencil
- `G` Area
- `R` Route
- `M` Measure
- `T` Text
- `E` Eraser
- Right-click finishes an in-progress multi-point drawing
- Escape cancels an in-progress drawing without saving it
- Escape with no drawing in progress returns to Select
- Delete removes the selected marker/graphic
- Ctrl+S saves a plan
- Ctrl+O loads a plan

Text is now edited in an on-map popover instead of a browser prompt. Text supports colour, size, multi-line labels (Shift+Enter), optional readable background, Enter-to-add and Escape/right-click-to-cancel. In Select mode, text and other graphics can be dragged to reposition them.

Planning ink presets: blue, red, yellow, green, white, orange and purple, plus the full colour picker.

## Side overlay mode

`Ctrl+Shift+S` toggles Side mode.

Side mode is intentionally narrow (roughly 360-470 px depending on the display), always-on-top, and keeps the map dominant. Marker library and properties become temporary drawers. Press the shortcut again to restore the previous normal window bounds.

`Ctrl+Shift+O` remains the click-through safety shortcut.

## Multiplayer without port forwarding

The desktop app uses a small Socket.IO relay on a normal public HTTPS web service. Both players make outgoing connections to that relay, so nobody needs to expose their home router or configure incoming ports.

Use the included `render.yaml` and follow `RELAY-SETUP.md`.

The installer build stores your public relay URL in the frontend bundle, so friends only need HOST/JOIN and the room code. The client allows extra time for a sleeping hobby relay to wake and automatically rejoins an existing room after an ordinary connection drop. The title bar also has COPY and LEAVE buttons while connected.

## Build the installer

Read `START-HERE.txt` first, then simply run:

```text
BUILD-INSTALLER-WINDOWS.bat
```

Finished file:

```text
release-installer/
Reforger-Tactical-Planner-0.7.0-x64-Setup.exe
```

The installer is an assisted NSIS setup: your friend can choose an installation location and receives normal Start-menu/desktop shortcuts.

## Sharing through GitHub

The source repo deliberately excludes the map PNGs, generated LOD data, environment files and build output.

Recommended flow:

1. Push source to GitHub.
2. Deploy the relay from the repo.
3. Build Setup.exe locally with your map tiles.
4. Create GitHub Release `v0.7.0`.
5. Attach Setup.exe to the Release.

See `GITHUB-RELEASE.md`.
