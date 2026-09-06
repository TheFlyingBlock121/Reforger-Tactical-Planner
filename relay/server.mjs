import express from "express";
import cors from "cors";
import http from "node:http";
import { Server } from "socket.io";

const PORT = Number(process.env.PORT || 8787);

const app = express();
app.use(cors({ origin: "*" }));

app.get("/", (_req, res) => {
  res.json({
    service: "Reforger Tactical Planner Relay",
    status: "ok",
    rooms: rooms.size
  });
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", socketPath: "/socket.io/" });
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  maxHttpBufferSize: 5 * 1024 * 1024
});

const rooms = new Map();
const MAX_PLAYERS_PER_ROOM = 16;

function makeCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  do {
    code = Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
  } while (rooms.has(code));
  return code;
}

function publicPlayers(room) {
  return Array.from(room.players.entries()).map(([id, player]) => ({
    id,
    name: player.name,
    role: player.role
  }));
}

function broadcastPlayers(code) {
  const room = rooms.get(code);
  if (!room) return;
  io.to(code).emit("room:players", publicPlayers(room));
}

function leaveRoom(socket, code) {
  const room = rooms.get(code);
  if (!room) return;

  room.players.delete(socket.id);
  socket.leave(code);

  if (room.players.size === 0) {
    rooms.delete(code);
    return;
  }

  if (room.hostId === socket.id) {
    const [nextHostId] = room.players.keys();
    room.hostId = nextHostId;
    const nextHost = room.players.get(nextHostId);
    if (nextHost) nextHost.role = "host";
  }

  broadcastPlayers(code);
}

function validMember(room, socket) {
  return Boolean(room && room.players.has(socket.id));
}

io.on("connection", (socket) => {
  socket.on("room:create", ({ playerName, state }, ack) => {
    try {
      const code = makeCode();
      const room = {
        hostId: socket.id,
        players: new Map([[socket.id, { name: playerName || "Host", role: "host" }]]),
        state: {
          mapImage: state?.mapImage || null,
          calibration: state?.calibration || {
            presetId: "unknown",
            name: "Uncalibrated map",
            widthMeters: 0,
            heightMeters: 0,
            gridMeters: 1000
          },
          markers: Array.isArray(state?.markers) ? state.markers : [],
          drawings: Array.isArray(state?.drawings) ? state.drawings : []
        }
      };

      rooms.set(code, room);
      socket.join(code);
      socket.data.roomCode = code;

      ack?.({ ok: true, code, players: publicPlayers(room) });
      broadcastPlayers(code);
    } catch (error) {
      ack?.({ ok: false, error: error instanceof Error ? error.message : "Could not create room." });
    }
  });

  socket.on("room:join", ({ code, playerName }, ack) => {
    code = String(code || "").toUpperCase();
    const room = rooms.get(code);

    if (!room) {
      ack?.({ ok: false, error: "Room not found. Check the 6-character code." });
      return;
    }

    if (room.players.size >= MAX_PLAYERS_PER_ROOM) {
      ack?.({ ok: false, error: "This room is full." });
      return;
    }

    room.players.set(socket.id, { name: playerName || "Player", role: "planner" });
    socket.join(code);
    socket.data.roomCode = code;

    ack?.({
      ok: true,
      code,
      state: room.state,
      players: publicPlayers(room)
    });

    broadcastPlayers(code);
  });

  socket.on("room:leave", ({ code }) => {
    leaveRoom(socket, String(code || socket.data.roomCode || "").toUpperCase());
    socket.data.roomCode = "";
  });

  socket.on("plan:map", ({ code, map }) => {
    code = String(code || "").toUpperCase();
    const room = rooms.get(code);
    if (!validMember(room, socket)) return;
    room.state.mapImage = map || null;
    socket.to(code).emit("plan:map", room.state.mapImage);
  });

  socket.on("plan:calibration", ({ code, calibration }) => {
    code = String(code || "").toUpperCase();
    const room = rooms.get(code);
    if (!validMember(room, socket) || !calibration) return;
    room.state.calibration = calibration;
    socket.to(code).emit("plan:calibration", calibration);
  });

  socket.on("marker:add", ({ code, marker }) => {
    code = String(code || "").toUpperCase();
    const room = rooms.get(code);
    if (!validMember(room, socket) || !marker?.id) return;
    room.state.markers = [...room.state.markers.filter((m) => m.id !== marker.id), marker];
    socket.to(code).emit("marker:add", marker);
  });

  socket.on("marker:update", ({ code, marker }) => {
    code = String(code || "").toUpperCase();
    const room = rooms.get(code);
    if (!validMember(room, socket) || !marker?.id) return;

    const exists = room.state.markers.some((m) => m.id === marker.id);
    room.state.markers = exists
      ? room.state.markers.map((m) => (m.id === marker.id ? marker : m))
      : [...room.state.markers, marker];

    socket.to(code).emit("marker:update", marker);
  });

  socket.on("marker:delete", ({ code, id }) => {
    code = String(code || "").toUpperCase();
    const room = rooms.get(code);
    if (!validMember(room, socket) || !id) return;
    room.state.markers = room.state.markers.filter((m) => m.id !== id);
    socket.to(code).emit("marker:delete", id);
  });

  socket.on("drawing:add", ({ code, drawing }) => {
    code = String(code || "").toUpperCase();
    const room = rooms.get(code);
    if (!validMember(room, socket) || !drawing?.id) return;
    room.state.drawings = [...room.state.drawings.filter((d) => d.id !== drawing.id), drawing];
    socket.to(code).emit("drawing:add", drawing);
  });

  socket.on("drawing:update", ({ code, drawing }) => {
    code = String(code || "").toUpperCase();
    const room = rooms.get(code);
    if (!validMember(room, socket) || !drawing?.id) return;
    const exists = room.state.drawings.some((d) => d.id === drawing.id);
    room.state.drawings = exists
      ? room.state.drawings.map((d) => (d.id === drawing.id ? drawing : d))
      : [...room.state.drawings, drawing];
    socket.to(code).emit("drawing:update", drawing);
  });

  socket.on("drawing:delete", ({ code, id }) => {
    code = String(code || "").toUpperCase();
    const room = rooms.get(code);
    if (!validMember(room, socket) || !id) return;
    room.state.drawings = room.state.drawings.filter((d) => d.id !== id);
    socket.to(code).emit("drawing:delete", id);
  });

  socket.on("disconnect", () => {
    const code = String(socket.data.roomCode || "").toUpperCase();
    if (code) leaveRoom(socket, code);
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Reforger Tactical Planner relay listening on port ${PORT}`);
});
