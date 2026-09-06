# v0.7.1 map.json hotfix

This hotfix fixes the Maps window error:

`Invalid map.json: Unexpected token ... is not valid JSON`

Changes:
- strips UTF-8 BOMs before parsing JSON
- recovers from accidentally quote-wrapped generated manifests
- built-in Everon/Serhiivka fall back to known map dimensions if a manifest is damaged
- LOD generator now writes UTF-8 JSON without a BOM
- a damaged built-in manifest is shown as a warning instead of disabling a valid tile set

You still need to place the PNG tiles directly inside:
- `BUILT_IN_MAP_TILES\Everon\`
- `BUILT_IN_MAP_TILES\Serhiivka\`

Then run `npm run maps:check` or the installer builder.
