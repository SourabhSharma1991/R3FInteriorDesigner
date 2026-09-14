# R3F Interior Designer

React + [react-three-fiber](https://r3f.docs.pmnd.rs/) app that turns a floor-plan **scene graph JSON** into an
accurate, editable 3D interior. The bundled sample is the 2 BHK plan in
`src/data/sample-scene-graph.json` (10 rooms, 80 wall segments, 5 doors).

## Run it

```bash
nvm use          # Node 22 (see .nvmrc)
npm install
npm run dev      # http://localhost:5173
```

Other scripts: `npm run build` (typecheck + bundle), `npm run lint` (oxlint), `npm run preview`.

## Scene graph format

All coordinates are in **meters** on the ground plane: `x` to the right, `z` towards the viewer, `y` up.
Nodes are discriminated by `role`.

```jsonc
{
  "version": "1.0",
  "units": "meters",
  "building": { "name": "2 BHK", "total_carpet_area_sqm": 67.4 },
  "nodes": [
    { "role": "room", "id": "…", "type": "bedroom", "label": "Bed Room 1",
      "polygon": [{ "x": -5.079, "z": -0.158 }, …],   // any simple polygon
      "dimensions": { "width_m": 2.9, "depth_m": 3.954 }, "floor_y": 0,
      "color": "#dcd3ef" },                            // optional floor colour

    { "role": "wall", "id": "…", "type": "wall",
      "start": { "x": -8.155, "z": -5.483 }, "end": { "x": 8.137, "z": -5.483 },
      "height": 2.8, "thickness": 0.15 },

    { "role": "opening", "id": "…", "type": "door",    // or "window"
      "label": "Door to BedRoom1", "position": { "x": -2.214, "z": 1.336 },
      "width_m": 1.0, "height_m": 2.1, "sill_height": 0 },

    { "role": "furniture", "id": "…", "type": "bed_double", "label": "Double Bed",
      "position": { "x": -3.63, "z": 1.82 }, "rotation_deg": 0,
      "size": { "w": 1.6, "d": 2.0, "h": 0.5 }, "color": "#8d6e63", "floor_y": 0 }
  ]
}
```

Any node may also carry an optional `"themeRole": "wall.primary"` — see [Themes](#themes).

`bbox`, `centroid`, `length_m` and `summary` are derived — they are recomputed on load and on every edit,
so hand-written input can omit them. `furniture` is this app's extension of the plan schema; every other
role round-trips unchanged, so an exported file can be fed straight back in.

### How the geometry is built

- **Rooms** — the polygon is triangulated into a floor slab at `floor_y`; the area shown in the label is
  computed from the polygon (shoelace), not from `dimensions`.
- **Walls** — a box per segment, oriented along `start → end` with the given `thickness` and `height`.
- **Openings** — each door/window is projected onto the nearest collinear wall and *carved out of it*: the
  wall is split into the solid runs beside the opening plus the lintel above (and the sill below, for
  windows). Nothing is baked into the JSON, so moving a door re-cuts the wall live.

## Editing

- Click anything in the viewport, or pick it in the left outliner, to select it.
- Drag the gizmo to move it in the ground plane (5 cm snap); furniture can also be rotated (5° snap).
- The right inspector edits exact values: room label/type/floor colour/rectangle, wall endpoints, height and
  thickness, door size and sill, furniture size, colour and rotation.
- Add rooms, walls and doors from the outliner; add furniture from the catalog in a selected room's inspector.
- Duplicate/Delete (or <kbd>Del</kbd>), undo/redo (<kbd>Ctrl</kbd>+<kbd>Z</kbd> / <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd>).
- Toolbar: 3D vs top view, toggle walls/furniture/labels/grid, wall opacity (to see into rooms),
  import a JSON file, export the edited scene graph, paste JSON in the JSON panel, or switch the theme.

## Themes

The scene graph says **what exists**; a theme says **how it looks**. Themes are separate JSON files and never
touch geometry — switching one re-resolves materials only, the graph is not regenerated or modified.

Pick a theme in the toolbar (`Default (no theme)` keeps the original appearance), or import your own JSON with
*Import theme*. Built-in: `modern-warm`, `scandinavian`, `japandi` (`src/data/themes/`).

`src/data/themes/sample-theme.json` is a complete reference theme meant for *Import theme*: every section filled
in (palette, materials, roles, node types, room rules, 2D/3D presentation) covering walls, floors, doors and
windows, furniture — including potted plants (`plant.pot` / `plant.foliage`) and bedding.

```jsonc
{
  "id": "modern-warm",
  "name": "Modern Warm",
  "palette": { "wall": "#efe7dc" },          // colour tokens
  "materials": {
    "wall": { "kind": "standard", "color": "$wall", "roughness": 0.85 },
    "wallAccent": { "extends": "wall", "color": "#c96f4a" }
  },
  "roles": { "wall.primary": "wall", "wall.accent": "wallAccent" },
  "nodeTypes": { "sofa": "furniture.soft" },  // per node.type default
  "rooms": { "bathroom": { "floor": "tile" } },
  "view2D": { "background": "#f7f2ea", "wallOpacity": 0.9 },
  "view3D": { "background": "#f1e9df", "ambient": { "intensity": 0.75 }, "directional": [] }
}
```

A node may carry a semantic role — `"themeRole": "wall.primary"` — editable in the inspector. Nodes without
one get a role inferred from `node.type` (a `sofa` → `furniture.soft`, a room → `floor.<type>`).

Appearance resolves in this order, first hit wins:

1. **user override** (inspector colour, keyed `nodeId` or `nodeId:part`)
2. **node `themeRole`**
3. **room rule** (the room whose polygon contains the node)
4. **node type default**
5. **default material** — with no theme, the node's own colours, exactly as before

Colours written as `"$wall"` resolve through `palette`. Resolved materials are cached by their property set in
`MaterialFactory`, so no Three.js material is built per render.

## Layout

```
src/
  types/sceneGraph.ts   schema + type guards
  types/theme.ts        theme schema
  lib/sceneGraph.ts     parsing/validation, derived fields, transforms
  lib/wallGeometry.ts   opening→wall assignment and wall splitting
  lib/palette.ts        room colours + furniture catalog
  store/sceneStore.ts   zustand store (graph, selection, view options, undo/redo)
  theme/ThemeLoader     parse/validate theme JSON (file or URL)
  theme/ThemeManager    registered themes, active theme, overrides, material cache
  theme/ThemeResolver   role inference + the resolution order above
  theme/MaterialFactory cached Three.js materials
  theme/ThemeProvider   React context for the active theme
  scene/                Canvas and the meshes for rooms, walls, openings, furniture
  ui/                   toolbar, outliner, inspector, JSON panel, theme picker
```
