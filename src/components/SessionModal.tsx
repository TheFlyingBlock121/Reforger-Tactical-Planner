import { useState } from "react";
import { plannerRealtime } from "../lib/realtime";
import { unknownCalibration } from "../lib/mapScale";
import { usePlannerStore } from "../store";

type Props = {
  mode: "host" | "join";
  onClose(): void;
};

export function SessionModal({ mode, onClose }: Props) {
  const [name, setName] = useState(usePlannerStore.getState().playerName);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [relayTest, setRelayTest] = useState("");
  const [testingRelay, setTestingRelay] = useState(false);

  async function testRelay() {
    setRelayTest("");
    setTestingRelay(true);
    const result = await plannerRealtime.testRelay();
    setRelayTest(result.ok ? `OK: ${result.message}` : `FAILED: ${result.message}`);
    setTestingRelay(false);
  }

  async function submit() {
    setError("");
    setBusy(true);

    try {
      const store = usePlannerStore.getState();
      store.setPlayerName(name.trim() || "Player");

      if (mode === "host") {
        const result = await plannerRealtime.host(name.trim() || "Player", {
          mapImage: store.mapImage,
          calibration: store.calibration,
          markers: store.markers,
          drawings: store.drawings
        });
        store.setRoom(result.code, result.players);
      } else {
        const result = await plannerRealtime.join(code.trim().toUpperCase(), name.trim() || "Player");
        store.setRoom(result.code, result.players);
        store.setMapImage(result.state.mapImage, true);
        store.setCalibration(result.state.calibration || { ...unknownCalibration }, true);

        usePlannerStore.setState({
          markers: result.state.markers || [],
          drawings: result.state.drawings || [],
          selectedMarkerId: null,
          selectedDrawingId: null,
          placementDefinitionId: null,
          activeTool: "select"
        });
      }

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="panel-title">{mode === "host" ? "HOST SESSION" : "JOIN SESSION"}</div>

        <label className="field">
          <span>Your name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </label>

        {mode === "join" && (
          <label className="field">
            <span>Room code</span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={6}
              placeholder="ABC123"
            />
          </label>
        )}

        {error && <div className="error-box">{error}</div>}

        <div className="modal-actions">
          <button className="ghost-button" onClick={onClose}>Cancel</button>
          <button className="primary-button" disabled={busy || !name.trim() || (mode === "join" && code.trim().length < 4)} onClick={submit}>
            {busy ? "CONNECTING…" : mode === "host" ? "CREATE ROOM" : "JOIN ROOM"}
          </button>
        </div>

        <div className="small-note">
          Uses the cloud relay built into this release. Friends only need the room code; no router port forwarding is required.
          <div style={{ marginTop: 8, wordBreak: "break-all" }}>Relay: {plannerRealtime.relayUrl}</div>
          <button className="ghost-button" style={{ marginTop: 8 }} disabled={testingRelay || busy} onClick={testRelay}>
            {testingRelay ? "TESTING RELAY…" : "TEST RELAY"}
          </button>
          {relayTest && <div style={{ marginTop: 6 }}>{relayTest}</div>}
        </div>
      </div>
    </div>
  );
}
