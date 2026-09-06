# Multiplayer relay setup - no port forwarding

You only do this once for the group.

The app does **not** make your PC a public server. Instead, every installed planner makes an outgoing WebSocket connection to a tiny public relay. This is why HOST/JOIN works across different home networks without router port forwarding.

## Before this step

Upload the source project to a GitHub repository first. `render.yaml` is already included at the repository root.

## Easiest Render setup

1. Sign in to Render.
2. Connect your GitHub account to Render if it is not connected yet.
3. In the Render dashboard choose **New -> Blueprint**.
4. Select the GitHub repository containing this planner.
5. Render automatically reads the root `render.yaml`.
6. Review the single service named approximately `reforger-planner-relay`.
7. Deploy the Blueprint.
8. Wait until the service reports Live.
9. Open the service URL in a browser.

You should see JSON similar to:

```json
{"service":"Reforger Tactical Planner Relay","status":"ok","rooms":0}
```

10. Copy the HTTPS URL, for example:

```text
https://reforger-planner-relay-xxxx.onrender.com
```

## Put that URL into your installer

You do not edit source files manually.

Double-click:

```text
BUILD-INSTALLER-WINDOWS.bat
```

On the first build it asks:

```text
Relay URL:
```

Paste the HTTPS Render URL. The script stores it locally in `.env.production.local` and future builds reuse it.

`.env.production.local` is in `.gitignore` so your local build setting is not accidentally committed.

## Test before sending the installer

After installing the built Setup.exe on your PC, open the planner and create a room. Open a second installed/dev copy and join using the six-character code.

For a better real-world networking test, have a friend on a different internet connection install the same build and join the room.

## Free-host caveat

A free web service can sleep after inactivity. The first HOST/JOIN after a long idle period can therefore take longer while the relay wakes up. Once the WebSocket is active, current Render behavior counts incoming WebSocket traffic as activity.

## Local development

For same-PC testing you can still run:

```powershell
npm --prefix relay install
npm run relay
```

and use the default development `.env` URL `http://127.0.0.1:8787`.
