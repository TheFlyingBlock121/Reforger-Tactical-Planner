import { useState } from "react";
import { plannerRealtime } from "../lib/realtime";
import { usePlannerStore } from "../store";

export function TitleBar() {
  const [copied, setCopied] = useState(false);
  const missionName = usePlannerStore((s) => s.missionName);
  const roomCode = usePlannerStore((s) => s.roomCode);
  const players = usePlannerStore((s) => s.players);

  async function copyRoom() {
    if (!roomCode) return;
    await window.desktop?.copyText(roomCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  function leaveRoom() {
    plannerRealtime.leave();
    usePlannerStore.getState().setRoom("", []);
  }

  return (
    <header className="titlebar">
      <div className="brand">
        <span className="brand-mark">RTP</span>
        <strong>REFORGER TACTICAL PLANNER</strong>
        <span className="mission-chip">{missionName}</span>
      </div>

      <div className="titlebar-right">
        {roomCode && (
          <div className="session-actions">
            <span className="session-chip">SESSION {roomCode} · {players.length} ●</span>
            <button onClick={copyRoom}>{copied ? "COPIED" : "COPY"}</button>
            <button onClick={leaveRoom}>LEAVE</button>
          </div>
        )}
        <div className="window-buttons">
          <button onClick={() => window.desktop?.minimize()} aria-label="Minimize">—</button>
          <button onClick={() => window.desktop?.maximize()} aria-label="Maximize">□</button>
          <button className="danger" onClick={() => window.desktop?.close()} aria-label="Close">×</button>
        </div>
      </div>
    </header>
  );
}
