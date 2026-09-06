# Built-in tiled maps in v0.7

Only two source folders matter:

```text
BUILT_IN_MAP_TILES/Everon
BUILT_IN_MAP_TILES/Serhiivka
```

Drop the original `tile_r###_c###.png` files directly into each folder. Do not create subfolders and do not rename the files.

The build scanner discovers the grid automatically. The installer build then creates its own lower-detail LOD data and includes both the original tiles and generated LOD in the installation.

You do not manually make a single giant PNG and you do not manually create the LOD folders.
