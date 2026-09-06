# Research notes for v0.3

## NATO / military symbology

The project now uses the open-source **milsymbol** library (MIT license) rather than drawing pretend NATO boxes by hand.

Milsymbol supports MIL-STD-2525 and NATO STANAG APP-6 families, including affiliation frame shapes, unit echelons/modifiers, SVG/Canvas output and OpenLayers integration. Version 3 targets the modern MIL-STD-2525E / APP-6E visual style while still accepting older readable letter-based SIDCs.

That is why the app stores a base SIDC for each unit family and changes affiliation/echelon fields instead of maintaining separate PNG icon files.

## Arma Reforger map images

Bohemia Interactive's official 2D Map Creation documentation describes a World Editor workflow using **Export Map Data → Rasterization**. It generates an upside-down TGA raster; the documented workflow flips it vertically and converts it to PNG with an image editor.

For development, a cropped in-game map screenshot is much faster and requires no Workbench setup.

## Networking

The desktop app continues to use a separate Socket.IO relay. This is simpler for normal players than exposing a host PC directly, and it avoids requiring manual router port forwarding.

Render's current web services support inbound WebSockets. Its free web services can sleep when idle, which is acceptable for hobby testing but not ideal for a permanent production service.


## Map scaling
- Everon / Eden full world dimensions: 12.8 km × 12.8 km.
- Full world-square area: 163.84 km².
- Serhiivka preset in this project: 10.24 km × 10.24 km, based on the user-supplied map dimensions.
- Reforger Tools World Editor rasterization export produces a 4096×4096 TGA that is flipped vertically before PNG export.
