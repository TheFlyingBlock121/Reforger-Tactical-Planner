import { useEffect, useState } from "react";
import { makeCalibration, makeMapSource } from "../lib/tileMaps";
import { usePlannerStore } from "../store";
import type { TileMapManifest } from "../types";

type Props = {
  onClose(): void;
};

export function MapLibraryModal({ onClose }: Props) {
  const [maps, setMaps] = useState<TileMapManifest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const setMapImage = usePlannerStore((s) => s.setMapImage);
  const setCalibration = usePlannerStore((s) => s.setCalibration);

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const result = await window.desktop?.listTileMaps();
      setMaps(result || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not scan map packs.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  function load(pack: TileMapManifest) {
    if (!pack.ready) return;
    setMapImage(makeMapSource(pack));
    setCalibration(makeCalibration(pack));
    localStorage.setItem("rtp-last-map", pack.id);
    onClose();
    queueMicrotask(() => window.dispatchEvent(new Event("planner:fit-map")));
  }

  const builtInMaps = maps.filter((pack) => pack.builtIn);
  const customMaps = maps.filter((pack) => !pack.builtIn);

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal map-library-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="panel-title">MAP LIBRARY</div>

        <div className="map-library-intro">
          Everon and Serhiivka are built into the finished v0.7 installation. The renderer keeps them tiled and automatically builds lower-detail zoom levels for fast zooming and automatically reads the tile grid and PNG dimensions.
        </div>

        <div className="map-library-help orientation-help">
          <strong>Tile orientation</strong>
          <span><code>tile_r000_c000.png</code> is the top-left tile. Rows increase downward; columns increase to the right.</span>
        </div>

        {loading && <div className="map-library-empty">Scanning map resources…</div>}
        {error && <div className="error-box">{error}</div>}

        {!loading && builtInMaps.length > 0 && (
          <>
            <div className="map-library-section-title">BUILT-IN MAPS</div>
            <div className="map-pack-list">
              {builtInMaps.map((pack) => (
                <MapCard key={`${pack.rootLabel}-${pack.id}`} pack={pack} onLoad={load} />
              ))}
            </div>
          </>
        )}

        {!loading && customMaps.length > 0 && (
          <>
            <div className="map-library-section-title">CUSTOM MAPS</div>
            <div className="map-pack-list">
              {customMaps.map((pack) => (
                <MapCard key={`${pack.rootLabel}-${pack.id}`} pack={pack} onLoad={load} />
              ))}
            </div>
          </>
        )}

        {!loading && !maps.length && (
          <div className="map-library-empty">
            No built-in tiles found in this source copy yet. Put the PNG tiles into BUILT_IN_MAP_TILES/Everon and BUILT_IN_MAP_TILES/Serhiivka.
          </div>
        )}

        <div className="map-library-help">
          <strong>Automatic checks</strong>
          <span>The app discovers row/column count, tile resolution, virtual map resolution, missing tiles and real-world scale automatically.</span>
        </div>

        <div className="modal-actions split-actions">
          <div>
            <button className="ghost-button" onClick={() => window.desktop?.openBuiltInTilesFolder()}>BUILT-IN TILE FOLDERS</button>
            <button className="ghost-button" onClick={refresh}>RESCAN</button>
          </div>
          <button className="primary-button" onClick={onClose}>DONE</button>
        </div>
      </div>
    </div>
  );
}

function MapCard({ pack, onLoad }: { pack: TileMapManifest; onLoad(pack: TileMapManifest): void }) {
  return (
    <button
      className={`map-pack-card ${pack.ready ? "ready" : "not-ready"}`}
      onClick={() => onLoad(pack)}
      disabled={!pack.ready}
    >
      <div className="map-pack-card-top">
        <div>
          <div className="map-title-row">
            <strong>{pack.name}</strong>
            {pack.builtIn && <span className="builtin-badge">BUILT-IN</span>}
          </div>
          <span>{(pack.widthMeters / 1000).toFixed(2)} × {(pack.heightMeters / 1000).toFixed(2)} km</span>
        </div>
        <span className={`map-pack-status ${pack.ready ? "ok" : "bad"}`}>
          {pack.ready ? "READY" : "MAP DATA MISSING"}
        </span>
      </div>

      {pack.tileCount > 0 ? (
        <div className="map-pack-metrics">
          <span>{pack.rows} rows × {pack.columns} columns</span>
          <span>{pack.tileCount.toLocaleString()} tiles</span>
          <span>{pack.tileWidth} × {pack.tileHeight} px/tile</span>
          <span>{pack.widthPixels.toLocaleString()} × {pack.heightPixels.toLocaleString()} px virtual map</span>
          <span>{pack.lodLevels || 0} automatic LOD levels</span>
        </div>
      ) : (
        <div className="map-pack-metrics"><span>No matching tile PNGs found yet.</span></div>
      )}

      {pack.issue && <div className="map-pack-issue">{pack.issue}</div>}
    </button>
  );
}
