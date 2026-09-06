import { io, type Socket } from "socket.io-client";
import type { MapCalibration, MapDrawing, MapImage, TacticalMarker } from "../types";

type RoomState = {
  mapImage: MapImage | null;
  calibration: MapCalibration;
  markers: TacticalMarker[];
  drawings: MapDrawing[];
};

type Player = {
  id: string;
  name: string;
  role: "host" | "planner";
};

type Events = {
  onRoomState?: (state: RoomState) => void;
  onMap?: (map: MapImage | null) => void;
  onCalibration?: (calibration: MapCalibration) => void;
  onMarkerAdd?: (marker: TacticalMarker) => void;
  onMarkerUpdate?: (marker: TacticalMarker) => void;
  onMarkerDelete?: (id: string) => void;
  onDrawingAdd?: (drawing: MapDrawing) => void;
  onDrawingUpdate?: (drawing: MapDrawing) => void;
  onDrawingDelete?: (id: string) => void;
  onPlayers?: (players: Player[]) => void;
  onDisconnected?: () => void;
};

class PlannerRealtime {
  private socket: Socket | null = null;
  private roomCode = "";
  private currentPlayerName = "Player";
  private events: Events = {};

  get activeRoom() {
    return this.roomCode;
  }

  get relayUrl() {
    return import.meta.env.VITE_RELAY_URL || "http://127.0.0.1:8787";
  }

  configure(events: Events) {
    this.events = events;
  }

  private ensureSocket() {
    if (this.socket) return this.socket;

    this.socket = io(this.relayUrl, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5000,
      timeout: 30000
    });

    this.socket.on("connect", () => {
      // Socket.IO reconnects the transport automatically, but room membership is
      // server-side and must be re-established after a dropped connection.
      if (!this.roomCode) return;
      this.socket?.timeout(30000).emit(
        "room:join",
        { code: this.roomCode, playerName: this.currentPlayerName },
        (error: Error | null, result: any) => {
          if (error || !result?.ok) return;
          const state = result.state as RoomState | undefined;
          if (state) {
            if (this.events.onRoomState) this.events.onRoomState(state);
            else {
              this.events.onMap?.(state.mapImage || null);
              this.events.onCalibration?.(state.calibration);
              for (const marker of state.markers || []) this.events.onMarkerUpdate?.(marker);
              for (const drawing of state.drawings || []) this.events.onDrawingUpdate?.(drawing);
            }
          }
          this.events.onPlayers?.(result.players || []);
        }
      );
    });

    this.socket.on("plan:map", (map: MapImage | null) => this.events.onMap?.(map));
    this.socket.on("plan:calibration", (calibration: MapCalibration) => this.events.onCalibration?.(calibration));
    this.socket.on("marker:add", (marker: TacticalMarker) => this.events.onMarkerAdd?.(marker));
    this.socket.on("marker:update", (marker: TacticalMarker) => this.events.onMarkerUpdate?.(marker));
    this.socket.on("marker:delete", (id: string) => this.events.onMarkerDelete?.(id));
    this.socket.on("drawing:add", (drawing: MapDrawing) => this.events.onDrawingAdd?.(drawing));
    this.socket.on("drawing:update", (drawing: MapDrawing) => this.events.onDrawingUpdate?.(drawing));
    this.socket.on("drawing:delete", (id: string) => this.events.onDrawingDelete?.(id));
    this.socket.on("room:players", (players: Player[]) => this.events.onPlayers?.(players));
    this.socket.on("disconnect", () => this.events.onDisconnected?.());

    return this.socket;
  }

  private async emitWithAck<T>(event: string, payload: unknown): Promise<T> {
    const socket = this.ensureSocket();
    return new Promise<T>((resolve, reject) => {
      socket.timeout(60000).emit(event, payload, (error: Error | null, result: any) => {
        if (error) return reject(new Error(`Relay did not answer in time (${this.relayUrl}). It may still be waking up.`));
        if (!result?.ok) return reject(new Error(result?.error || "Relay request failed."));
        resolve(result as T);
      });
    });
  }

  async host(playerName: string, state: RoomState) {
    this.currentPlayerName = playerName || "Player";
    const result = await this.emitWithAck<{ ok: true; code: string; players: Player[] }>("room:create", { playerName, state });
    this.roomCode = result.code;
    return { code: result.code, players: result.players };
  }

  async join(code: string, playerName: string) {
    this.currentPlayerName = playerName || "Player";
    const result = await this.emitWithAck<{ ok: true; code: string; state: RoomState; players: Player[] }>("room:join", {
      code,
      playerName
    });
    this.roomCode = result.code;
    return { code: result.code, state: result.state, players: result.players };
  }

  setMap(map: MapImage | null) {
    if (!this.roomCode) return;
    this.ensureSocket().emit("plan:map", { code: this.roomCode, map });
  }

  setCalibration(calibration: MapCalibration) {
    if (!this.roomCode) return;
    this.ensureSocket().emit("plan:calibration", { code: this.roomCode, calibration });
  }

  addMarker(marker: TacticalMarker) {
    if (!this.roomCode) return;
    this.ensureSocket().emit("marker:add", { code: this.roomCode, marker });
  }

  updateMarker(marker: TacticalMarker) {
    if (!this.roomCode) return;
    this.ensureSocket().emit("marker:update", { code: this.roomCode, marker });
  }

  deleteMarker(id: string) {
    if (!this.roomCode) return;
    this.ensureSocket().emit("marker:delete", { code: this.roomCode, id });
  }

  addDrawing(drawing: MapDrawing) {
    if (!this.roomCode) return;
    this.ensureSocket().emit("drawing:add", { code: this.roomCode, drawing });
  }

  updateDrawing(drawing: MapDrawing) {
    if (!this.roomCode) return;
    this.ensureSocket().emit("drawing:update", { code: this.roomCode, drawing });
  }

  deleteDrawing(id: string) {
    if (!this.roomCode) return;
    this.ensureSocket().emit("drawing:delete", { code: this.roomCode, id });
  }

  leave() {
    if (this.socket && this.roomCode) this.socket.emit("room:leave", { code: this.roomCode });
    this.roomCode = "";
  }
}

export const plannerRealtime = new PlannerRealtime();
