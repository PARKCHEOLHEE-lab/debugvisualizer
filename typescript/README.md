# debugvisualizer TypeScript

TypeScript helpers for visualizing geometry with the VS Code
[Debug Visualizer](https://github.com/hediet/vscode-debug-visualizer)
extension.

The package emits Debug Visualizer-compatible Plotly data:

```ts
{
  kind: { plotly: true },
  data: [
    // scatter3d and mesh3d traces
  ],
  layout: {
    scene: { aspectmode: "data" }
  }
}
```

## Usage

```ts
import { Plotter, lineString, mesh, polygon } from "debugvisualizer";

const view = new Plotter(
  [
    polygon(
      [
        [0, 0, 0],
        [2, 0, 0],
        [2, 2, 0],
        [0, 2, 0],
        [0, 0, 0]
      ],
      "parcel"
    ),
    lineString(
      [
        [0, 0, 1],
        [1, 1, 2]
      ],
      "edge"
    ),
    mesh(
      [
        [0, 0, 0],
        [1, 0, 0],
        [1, 1, 0],
        [0, 1, 0]
      ],
      [
        [0, 1, 2],
        [0, 2, 3]
      ],
      "slab"
    )
  ],
  { orthographic: true, showVertices: false }
);

debugger;
```

When execution stops at the breakpoint, open `Debug Visualizer: New View` and
enter `view` as the expression. The extension calls `getVisualizationData()` and
renders the returned Plotly traces.

Use `view.getVisualizationData()` when you want the raw object, or
`view.visualize(true)` when you need a JSON string.

## Geometry Inputs

- `point([x, y, z?], name?)`
- GeoJSON-like `Point` / `MultiPoint`
- `lineString([[x, y, z?], ...], name?)`
- GeoJSON-like `LineString` / `MultiLineString`
- `polygon(ringOrRings, name?)`
- GeoJSON-like `Polygon` / `MultiPolygon`
- GeoJSON-like `Feature` / `FeatureCollection`
- `mesh(vertices, faces, name?)`
- mesh-like `{ vertices, faces }`
- mesh-like `{ positions, indices }`

`mapZToY` swaps `y` and `z` in emitted traces for projects that use z-up model
coordinates but want y-up visualization.

## Custom Adapters

Keep application-specific types out of the package core. Use `adapters` to map
project objects into generic geometry:

```ts
const view = new Plotter([domainSegment], {
  adapters: [
    (value) => {
      if (!(value instanceof DomainSegment)) {
        return undefined;
      }

      return lineString([value.start, value.end], value.label);
    }
  ]
});
```

Adapters are tried only when a value is not already recognized as built-in
geometry. Returning `undefined` means "this adapter does not handle the value".

## Development

```bash
npm ci
npm test
npm run typecheck
npm run build
```
