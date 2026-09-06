type Props = { onClose(): void };

export function MapHelpModal({ onClose }: Props) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal map-help-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="panel-title">MAP + BUILD HELP</div>

        <div className="help-copy">
          <h3>Two built-in tile folders</h3>
          <p>
            In the source project, put the map PNGs directly into <code>BUILT_IN_MAP_TILES/Everon</code> and
            <code> BUILT_IN_MAP_TILES/Serhiivka</code>. You do not make a manifest or stitch the images yourself.
          </p>

          <h3>Tile order</h3>
          <p>
            <b>tile_r000_c000.png</b> is top-left. Increasing the column moves right. Increasing the row moves down.
            The scanner detects how many rows/columns exist, reads the PNG resolution, and checks every expected filename.
          </p>

          <h3>Built-in scale</h3>
          <p>
            Everon / Eden uses a 12,800 × 12,800 metre profile. Serhiivka uses 10,240 × 10,240 metres. The planner converts
            that real-world size against the detected virtual tile resolution for its grid and distance tools.
          </p>

          <h3>Finished Windows build</h3>
          <p>
            v0.6 builds a normal Windows application folder rather than a giant one-file portable executable. Both maps are
            copied into the app's <code>resources/maps</code> directory. The build script then ZIPs the entire application
            folder so another player can unzip it and launch <b>Reforger Tactical Planner.exe</b>.
          </p>

          <h3>Side-screen mode</h3>
          <p>
            Press <b>SIDE</b> or <b>Ctrl+Shift+S</b>. The window becomes a narrow always-on-top map at the right side of the
            current display. Use <b>MARKERS</b> and <b>DETAILS</b> as temporary drawers without giving up map space.
          </p>

          <div className="help-note">
            The application is an independent planning companion for fictional gameplay and does not inject into Arma Reforger.
          </div>
        </div>

        <div className="modal-actions">
          <button className="primary-button" onClick={onClose}>GOT IT</button>
        </div>
      </div>
    </div>
  );
}
