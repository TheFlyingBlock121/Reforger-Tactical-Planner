# Put the multiplayer relay online (Render)

You only need this when friends are connecting from different homes/networks.
For local testing, keep using `npm run relay`.

Render is a convenient hobby option because its web services support public WebSocket connections. A free web service can sleep after inactivity, so the first connection after a long idle period may take longer to wake up.

## 1. Put this project on GitHub

Create a GitHub repository and upload/push the `ReforgerTacticalPlanner` project.

The included `render.yaml` describes the relay service, so the relay can be deployed from the `relay` subfolder.

## 2. Create the Render service

In Render:

1. Create a new Web Service / Blueprint from your GitHub repository.
2. Use the included `render.yaml`, or configure the service manually with:
   - Root directory: `relay`
   - Build command: `npm install`
   - Start command: `npm start`
3. Deploy it.

When it is live, Render gives the service an HTTPS address similar to:

```text
https://your-service-name.onrender.com
```

Open that address in a browser. The relay should return a small JSON status response.

## 3. Point the desktop app at the public relay

Edit `.env` in the desktop project:

```text
VITE_RELAY_URL=https://your-service-name.onrender.com
```

Do not add `/socket.io` to the end.

## 4. Rebuild the shareable Windows folder

After changing `.env`, double-click:

```text
BUILD-SHAREABLE-WINDOWS.bat
```

Upload/send `release-share\Reforger-Tactical-Planner-v0.6-Windows.zip`. Everyone using a build made with the same relay URL can use HOST / JOIN room codes without manual router port forwarding.

## Current relay limitation

Rooms are stored in the relay's memory only. If the relay restarts or sleeps, active rooms disappear and the host must create a new room. Saved `.plan` files are unaffected because they are stored on the desktop PC.

A future version should add reconnectable/persistent rooms and optional authentication.
