# v0.7 testing checklist

Before sending a release to a friend:

- `npm run build:web` passes without TypeScript errors.
- `npm run maps:check` reports both maps ready.
- Setup.exe installs to a clean folder.
- Everon opens on a fresh launch.
- Serhiivka switches from MAPS.
- Fit shows the whole map without loading hundreds of raw PNGs at once.
- Zooming between overview/detail switches the LOD indicator.
- Markers stay usable screen-size instead of growing/shrinking with the world.
- Right-click finishes a route/area/line after enough points exist.
- Escape aborts an unfinished drawing and saves nothing.
- Text click opens the inline editor; Enter adds, Shift+Enter makes a new line, and Escape/right-click cancels.
- Select mode can drag a text label/line/route/area and the saved geometry follows it.
- Connected title bar COPY copies the room code and LEAVE exits the room.
- Side mode toggles with Ctrl+Shift+S and restores normal bounds.
- Click-through toggles with Ctrl+Shift+O.
- HOST on one internet connection and JOIN on another works with only the room code.
