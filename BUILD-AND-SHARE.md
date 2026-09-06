# Build and share v0.7

The v0.6 loose-folder distribution is retired. v0.7 builds a normal installer.

## One-time order

1. Put Everon PNG tiles in `BUILT_IN_MAP_TILES/Everon`.
2. Put Serhiivka PNG tiles in `BUILT_IN_MAP_TILES/Serhiivka`.
3. Push the source project to GitHub.
4. Deploy the relay with `RELAY-SETUP.md`.
5. Double-click `BUILD-INSTALLER-WINDOWS.bat`.
6. Paste the public HTTPS relay URL.
7. Upload the finished Setup.exe to a GitHub Release.

## What the build script does automatically

- verifies Node/npm
- scans every source map tile
- confirms row/column numbering starts at zero
- detects tile dimensions
- checks for holes in the grid
- refreshes both built-in map manifests
- installs npm packages on the first build
- builds compact JPEG LOD levels for zoomed-out views
- remembers/reuses LOD if the source map payload did not change
- asks for/validates an HTTPS relay URL
- type-checks the React/TypeScript app
- builds the Electron app
- embeds raw maps + LOD into the installed resources
- builds assisted NSIS Setup.exe
- checks final installer size against GitHub's release-asset limit

## Output

```text
release-installer/
Reforger-Tactical-Planner-0.7.0-x64-Setup.exe
```
