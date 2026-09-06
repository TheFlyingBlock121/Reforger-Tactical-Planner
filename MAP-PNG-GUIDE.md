# Map PNG + Scale Guide — v0.3

## Your two current presets

### Everon / Eden

Use **12,800 m × 12,800 m** for the complete world square.

In the app:

1. Import the Everon/Eden image.
2. Press **SCALE**.
3. Select **EVERON / EDEN**.
4. Press **APPLY SCALE**.

The complete world square is 163.84 km². The island/terrain occupies only part of that square.

### Serhiivka

Use **10,240 m × 10,240 m**, matching the dimensions supplied for this project.

1. Import the Serhiivka image.
2. Press **SCALE**.
3. Select **SERHIIVKA**.
4. Press **APPLY SCALE**.

## Why image resolution does not need to match map size

The planner stores positions in image coordinates and converts them to metres.

Example only: if a Serhiivka image is 4096 px wide:

```text
10240 m / 4096 px = 2.5 m per pixel
```

If the image is 8192 px wide, the app automatically calculates a different pixel scale. You do not need to resize it to a special resolution.

## Reforger Tools / Workbench method

For a terrain that can be opened in World Editor:

1. Open the world.
2. Open **Export Map Data**.
3. Choose **Rasterization**.
4. Export the raster.
5. The standard export is a 4096×4096 TGA.
6. Flip the TGA vertically in an image editor.
7. Export it as PNG.
8. Import that PNG into Reforger Tactical Planner.
9. Select the correct map-scale preset.

## Screenshot method

For casual use, a clean screenshot works too. Try to capture the **complete map rectangle** rather than only one zoomed section if you want the built-in full-map presets to remain accurate.

If you crop away part of the map, use **CUSTOM** calibration instead of the full-map preset unless you know the real-world width/height represented by the crop.

## Very large source archives

The planner imports the actual PNG/JPG/WebP image, not a multi-gigabyte archive. Extract the map image first. For extremely large imagery, a future tiled-map-pack format will be more efficient than one giant image.
