# Reforger Tactical Planner v0.7 — Complete Windows Setup, Build, Relay, GitHub and Usage Tutorial

This guide starts from a fresh v0.7 ZIP and ends with a friend downloading and installing your finished Windows installer.

## 0. What you are building

There are two separate things:

- The **desktop planner installer**, built on your Windows PC. It contains the Everon and Serhiivka map tiles.
- The **small internet relay**, hosted on Render. It only synchronizes room state; it does not contain the map imagery.

Because both planner clients make outgoing connections to the public relay, neither player needs router port forwarding.

---

## 1. Make a clean project folder

1. Download `ReforgerTacticalPlanner-v0.7.zip`.
2. Right-click it and choose **Extract All**.
3. Put the extracted folder somewhere simple, for example:

```text
G:\ReforgerTacticalPlanner-v0.7\
```

Avoid building directly inside the ZIP preview.

The important files should include:

```text
BUILD-INSTALLER-WINDOWS.bat
VERIFY-SOURCE-WINDOWS.bat
render.yaml
package.json
BUILT_IN_MAP_TILES\
relay\
scripts\
src\
```

---

## 2. Install the one development dependency you need

Install Node.js on the PC that builds the application. Node 22 is a safe choice and matches the relay configuration included in `render.yaml`.

After installing Node, close old PowerShell/Command Prompt windows and open a fresh PowerShell.

Check:

```powershell
node --version
npm --version
```

Both commands should print version numbers.

Your friend does **not** need Node.js. Only the PC that builds the installer needs it.

---

## 3. Put the two maps in the correct folders

Put Everon PNG tiles directly in:

```text
BUILT_IN_MAP_TILES\Everon\
```

Put Serhiivka PNG tiles directly in:

```text
BUILT_IN_MAP_TILES\Serhiivka\
```

Do not add an extra `capture_tiles` folder inside those folders.

Correct:

```text
BUILT_IN_MAP_TILES\Everon\tile_r000_c000.png
BUILT_IN_MAP_TILES\Everon\tile_r000_c001.png
BUILT_IN_MAP_TILES\Everon\tile_r001_c000.png
```

Wrong:

```text
BUILT_IN_MAP_TILES\Everon\capture_tiles\tile_r000_c000.png
```

The required naming form is:

```text
tile_r###_c###.png
```

Orientation:

```text
tile_r000_c000  tile_r000_c001  tile_r000_c002  -> RIGHT
tile_r001_c000  tile_r001_c001  tile_r001_c002
tile_r002_c000  tile_r002_c001  tile_r002_c002
      |
      v
     DOWN
```

`r000/c000` is top-left. Row numbers increase downward. Column numbers increase to the right.

The validator automatically discovers the maximum row/column numbers, reads PNG dimensions, calculates the virtual map resolution, checks for missing row/column positions and calculates map scale.

Built-in calibration is:

```text
Everon / Eden: 12,800 x 12,800 m
Serhiivka:     10,240 x 10,240 m
```

---

## 4. Open PowerShell in the project folder

In File Explorer, open the extracted project folder.

Click the address bar, type:

```text
powershell
```

and press Enter.

You should now have PowerShell with the project folder as the current directory.

---

## 5. Install the application dependencies once

Run:

```powershell
npm install
```

Wait for it to finish.

If you also want to test the relay locally later, run:

```powershell
npm --prefix relay install
```

Warnings are not automatically failures. What matters is whether npm finishes successfully and returns to the prompt without an `npm ERR!` failure.

---

## 6. Check the map folders before doing anything else

Run:

```powershell
npm run maps:check
```

A healthy result looks roughly like:

```text
[Everon / Eden]
READY: 26 rows x 26 columns = 676 tiles
Tile size: ... x ... px
Virtual map: ... x ... px
Map scale: ... m/px X, ... m/px Y

[Serhiivka]
READY: ...

Both built-in maps are ready.
```

If the validator says a tile is missing, restore exactly the filename it reports before continuing.

You can also double-click:

```text
VERIFY-SOURCE-WINDOWS.bat
```

After dependencies are installed. It checks JavaScript syntax, map folders and the TypeScript/Vite frontend build.

---

## 7. Put the source code on GitHub — but NOT the huge map PNGs

The recommended easy method is GitHub Desktop.

Install GitHub Desktop and sign in to your GitHub account.

In GitHub Desktop:

1. Choose **File -> Add local repository**.
2. Select your extracted `ReforgerTacticalPlanner-v0.7` folder.
3. If GitHub Desktop says it is not yet a Git repository, choose the option to create a repository there.
4. Name it something like `Reforger-Tactical-Planner`.
5. Look at the **Changes** list before committing.
6. The hundreds of Everon and Serhiivka PNGs should **not** appear. `.gitignore` intentionally excludes them.
7. Enter a commit message such as `Reforger Tactical Planner v0.7`.
8. Commit to `main`.
9. Click **Publish repository**.
10. Choose Public or Private.

If the map PNGs appear in GitHub Desktop, stop before publishing. They are supposed to stay local and be embedded only into your built installer.

The command-line alternative is:

```powershell
git init
git add .
git status
git commit -m "Reforger Tactical Planner v0.7"
git branch -M main
git remote add origin https://github.com/YOUR-NAME/Reforger-Tactical-Planner.git
git push -u origin main
```

Always inspect `git status` before the commit and confirm the giant tile PNG sets are absent.

---

## 8. Deploy the internet relay on Render

The project already contains a root `render.yaml`.

It defines one Node web service using the `relay` folder, installs relay dependencies with `npm install`, starts with `npm start`, and uses `/` as the health check.

In Render:

1. Sign in.
2. Connect your GitHub account if needed.
3. Choose **New -> Blueprint**.
4. Select the GitHub repository you just published.
5. Render should detect the root `render.yaml` automatically.
6. Review the service. It should be named approximately `reforger-planner-relay`.
7. Deploy the Blueprint.
8. Wait for the service to become **Live**.
9. Open the service's public URL in a browser.

A healthy relay returns JSON similar to:

```json
{"service":"Reforger Tactical Planner Relay","status":"ok","rooms":0}
```

Copy the HTTPS address, for example:

```text
https://reforger-planner-relay-xxxx.onrender.com
```

Keep this address. The installer builder will ask for it.

The relay means HOST and JOIN work across different home networks without opening router ports.

---

## 9. Optional: test the desktop app locally before making the installer

Create a development `.env` file if one does not exist:

```powershell
Copy-Item .env.example .env
```

Start the local relay in PowerShell window 1:

```powershell
npm --prefix relay install
npm run relay
```

You should see:

```text
Reforger Tactical Planner relay listening on port 8787
```

Open PowerShell window 2 in the same project folder:

```powershell
npm run dev
```

The Electron app should open.

This local test uses `http://127.0.0.1:8787`, so it is only for development. The final installer uses your public Render URL.

---

## 10. Build the real Windows installer

Close unnecessary heavy programs first because the map/installer build can use substantial disk, RAM and CPU.

Double-click:

```text
BUILD-INSTALLER-WINDOWS.bat
```

Do not close the window while it is working.

The builder performs seven stages:

```text
1/7 Check the two map tile folders
2/7 Install app dependencies if needed
3/7 Generate automatic low-memory map LOD
4/7 Configure the internet relay
5/7 Type-check/build the UI
6/7 Build the Windows NSIS installer
7/7 Check the finished installer
```

### Stage 1 — maps

It validates both tile grids and writes generated `map.json` manifests.

### Stage 2 — dependencies

If `node_modules` is already present, it skips reinstalling them.

### Stage 3 — LOD

It creates lower-detail JPEG map levels in:

```text
generated-map-lod\
```

This can take time on the first build. Later builds reuse the LOD cache if the source map fingerprint has not changed.

### Stage 4 — relay URL

On the first build it asks:

```text
Relay URL:
```

Paste the **HTTPS** Render URL you copied earlier and press Enter.

The builder stores it in:

```text
.env.production.local
```

That file is ignored by Git, so it stays local. Future builds normally reuse it automatically.

### Stage 5 — frontend

This runs:

```text
tsc -b && vite build
```

If this fails, always read the **first TypeScript error** rather than the final `Frontend build failed` line.

### Stage 6 — installer

Electron Builder creates an x64 assisted NSIS installer containing the app, both raw map sets, generated LOD levels and map manifests.

### Stage 7 — final check

The builder prints the exact installer path and size.

Expected output folder:

```text
release-installer\
```

Expected filename:

```text
Reforger-Tactical-Planner-0.7.0-x64-Setup.exe
```

---

## 11. Install your own build before uploading it

Run the Setup.exe you just built.

The installer should let you choose an installation directory and creates normal Start-menu/desktop shortcuts.

After installation, launch **Reforger Tactical Planner**.

Check:

- Everon loads from the built-in map library.
- Serhiivka loads from the built-in map library.
- FIT shows the whole map.
- Zooming out uses the generated LOD rather than stuttering badly on hundreds of full-resolution tiles.
- Markers stay screen-space sized instead of becoming huge map-space objects.
- Drawing works.
- Right-click finishes line/arrow/route/area.
- Escape cancels an unfinished drawing.
- Text editor opens on the map and supports color, size and multiline text.
- Side mode works with `Ctrl+Shift+S`.
- Click-through emergency toggle works with `Ctrl+Shift+O`.
- Save/load works.

Windows may warn that your locally built installer has an unknown publisher because it is not code-signed. Do not disable Windows security features globally. Treat warnings for files from other people cautiously.

---

## 12. Test multiplayer before sending it to your friend

Start the installed planner.

Host side:

1. Click **HOST**.
2. Enter your player name.
3. Create the room.
4. You receive a six-character room code.
5. Use **COPY** if available to copy it.

Join side:

1. Open the same build on another PC or a second copy for testing.
2. Click **JOIN**.
3. Enter a different player name.
4. Enter the six-character room code.
5. Join.

Test marker moves, drawings and map changes.

For the best network test, use two computers on different internet connections. No port forwarding should be required because both clients connect outward to Render.

The relay currently keeps active rooms in memory. If the relay service restarts, active rooms are lost and you create a new room.

The current relay has a 16-player-per-room cap.

---

## 13. Upload the source repository updates

If you changed source files after the first GitHub publish, use GitHub Desktop:

1. Review **Changes**.
2. Confirm map PNGs and generated LOD files are still absent.
3. Write a commit message.
4. Commit to `main`.
5. Click **Push origin**.

Render may automatically redeploy when the linked branch changes.

---

## 14. Create the GitHub Release for your friend

On the GitHub repository page:

1. Open **Releases**.
2. Click **Draft a new release**.
3. Choose/create tag `v0.7.0`.
4. Set title to `Reforger Tactical Planner v0.7`.
5. Add short release notes.
6. Drag this file into the binary asset box:

```text
release-installer\Reforger-Tactical-Planner-0.7.0-x64-Setup.exe
```

7. Wait until the upload finishes completely.
8. Publish the release.

Do **not** tell your friend to download GitHub's automatic `Source code (zip)` file. They want the attached `*-Setup.exe` release asset.

GitHub requires each individual release asset to be under 2 GiB. The v0.7 builder checks the finished installer and warns when it approaches/exceeds that size.

Before publicly redistributing map imagery, make sure you have permission to redistribute those particular map assets.

---

## 15. What your friend does

Your friend only needs the finished release asset.

They:

1. Open your GitHub Release.
2. Download `Reforger-Tactical-Planner-0.7.0-x64-Setup.exe`.
3. Run the installer.
4. Choose the install location if desired.
5. Launch **Reforger Tactical Planner** from the desktop or Start menu.
6. Everon and Serhiivka are already installed with it.
7. They click **JOIN** and enter your room code.

They do not need Node.js, npm, GitHub Desktop, Render, Workbench tile folders or router port forwarding.

---

## 16. Main v0.7 controls

```text
V                 Select
L                 Line
A                 Arrow
P                 Pencil
G                 Area
R                 Route
M                 Measure
T                 Text
E                 Eraser
Right-click       Finish active line/arrow/route/area
Escape            Cancel unfinished drawing; otherwise return to Select
Delete            Delete selected marker/graphic
Ctrl+S            Save plan
Ctrl+O            Load plan
Ctrl+Shift+S      Toggle narrow Side mode
Ctrl+Shift+O      Emergency click-through toggle
```

Text tool:

```text
Click map          choose text position
Enter/Add          add text
Shift+Enter        new line
Escape             cancel
Right-click        cancel
```

---

## 17. Side-screen / overlay use

Press:

```text
Ctrl+Shift+S
```

The planner becomes a narrow always-on-top panel on the right side of the display. Marker library and details are temporary drawers so the map remains the dominant part of the window.

Press `Ctrl+Shift+S` again to restore the previous normal window bounds.

If click-through is enabled and you cannot click the planner, press:

```text
Ctrl+Shift+O
```

---

## 18. Updating to a later version

For your next version:

1. Replace/update the source files.
2. Keep your two local map tile folders.
3. Run `npm run maps:check`.
4. Run `VERIFY-SOURCE-WINDOWS.bat`.
5. Commit and push source changes to GitHub.
6. Let Render redeploy if relay code changed.
7. Run `BUILD-INSTALLER-WINDOWS.bat` again.
8. Create a new release/tag such as `v0.8.0` and attach the new Setup.exe.

The map source PNGs should continue to stay out of normal Git commits.

---

# Troubleshooting

| Problem | What to do |
|---|---|
| `node` is not recognized | Install Node.js, close old terminals, open a new PowerShell, run `node --version`. |
| `npm` is not recognized | Reinstall Node.js with npm included, then reopen PowerShell. |
| `No tile_r###_c###.png files found` | Put PNGs directly inside `BUILT_IN_MAP_TILES\Everon` or `Serhiivka`; do not leave them one folder deeper. |
| `Tile numbering must start at r000/c000` | Your set must include a top-left `tile_r000_c000.png` and start at zero. |
| Missing tile error | Restore the exact missing filename printed by the validator. |
| `Frontend build failed` | Scroll upward to the first TypeScript error. The last line is only the wrapper telling you the earlier build failed. |
| `npm warn install-scripts ...` | A warning by itself is not a build failure. Continue unless npm actually returns `npm ERR!` or the later build stage fails because of that specific package. |
| Render URL is rejected | Use the full public `https://...onrender.com` service address, not the dashboard URL and not `http://`. |
| Render page does not show JSON | Open the service's public URL and inspect Render deploy logs. The root `/` endpoint should return relay status JSON. |
| First HOST/JOIN is slow | A free Render service can sleep while idle and may need time to wake. |
| Room code stops working after relay restart | Rooms are in-memory; create a new room. |
| GitHub Desktop shows hundreds of PNG changes | Do not publish yet. Confirm `.gitignore` is present. Fresh v0.7 ignores both built-in PNG folders. |
| Setup.exe exceeds 2 GiB | GitHub cannot accept it as one release asset. Reduce packaged map payload/LOD or use another distribution method. |
| Installer is unsigned | Windows may identify the publisher as unknown. Do not disable security globally; signing can be added later if you distribute the app more widely. |

