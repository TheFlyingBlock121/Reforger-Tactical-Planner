# v0.7 QA status

Checks performed on the source package before release:

- Electron main/preload JavaScript syntax: passed (`node --check`).
- Relay JavaScript syntax: passed.
- Map helper JavaScript syntax: passed.
- JSON configuration parse: passed.
- All 23 TypeScript/TSX source files were syntax-transpiled successfully with TypeScript.
- The tile-grid scanner was tested against a generated 3x4 PNG tile set and correctly detected 12 tiles, row/column counts, dimensions, and no missing cells.
- The v0.6 `FeatureLike` drawing-style typing problem is corrected in `src/drawingStyles.ts`.
- TileLayer uses only TileLayer-supported performance options; vector-only interaction options are kept on vector layers.

The final production Electron compile cannot be completed in this sandbox because npm package downloads are unavailable here. `BUILD-INSTALLER-WINDOWS.bat` performs the real `tsc -b && vite build` on your Windows PC and stops immediately on the first build error instead of packaging a broken installer.

Before sharing, run the checklist in `TESTING-NOTES.md` on the installed build.
