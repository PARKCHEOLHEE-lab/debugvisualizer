# debugvisualizer

Geometry helpers for the VS Code
[Debug Visualizer](https://github.com/hediet/vscode-debug-visualizer)
extension.

This repository keeps language implementations isolated so Python and
TypeScript can evolve without sharing package metadata or build output.

## Packages

| Package | Location | Runtime | Status |
| --- | --- | --- | --- |
| Python | repository root | Shapely, Trimesh, Plotly | Existing implementation |
| TypeScript | `typescript/` | No runtime dependencies | Generic geometry-to-Plotly Debug Visualizer helpers |

## Python

```python
from debugvisualizer import Plotter

view = Plotter(site_extruded, mass_extruded, possible_boundaries)
view.visualize()
```

The Python implementation accepts Shapely and Trimesh geometry objects and
returns Plotly JSON that Debug Visualizer can render.

## TypeScript

```ts
import { Plotter, lineString, mesh, polygon } from "debugvisualizer";

const view = new Plotter([
  polygon(siteBoundary, "site"),
  mesh(vertices, faces, "mass"),
  lineString(sectionLine, "section")
]);

debugger;
```

At the breakpoint, open `Debug Visualizer: New View` and use `view` as the
expression. The TypeScript `Plotter` implements `getVisualizationData()`, so the
Debug Visualizer JavaScript/TypeScript extractor can render it directly.

The TypeScript package is intentionally generic. It understands GeoJSON-like
point, line, polygon, multi-geometry, feature, and feature collection objects,
plus mesh-like `{ vertices, faces }` or `{ positions, indices }` objects. Project
or application classes should be converted with the `adapters` option instead of
being baked into this package.

## Development

Python checks:

```bash
pip install -r requirements.txt
PYTHONPATH=. pytest tests/
```

TypeScript checks:

```bash
cd typescript
npm ci
npm test
npm run build
```
