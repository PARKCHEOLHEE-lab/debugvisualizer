import { describe, expect, it } from "vitest";
import { lineString, mesh, point, polygon, Plotter } from "../src/index";

describe("Plotter", () => {
  it("emits Debug Visualizer Plotly traces for 3D points, polygons, and meshes", () => {
    const visualization = new Plotter(
      [
        point([0, 0, 2], "anchor"),
        lineString(
          [
            [0, 0, 1],
            [1, 1, 2]
          ],
          "edge"
        ),
        polygon(
          [
            [
              [0, 0, 0],
              [2, 0, 0],
              [2, 2, 0],
              [0, 2, 0],
              [0, 0, 0]
            ],
            [
              [0.5, 0.5, 0],
              [1, 0.5, 0],
              [1, 1, 0],
              [0.5, 0.5, 0]
            ]
          ],
          "parcel"
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
      { mapZToY: true, orthographic: true, showVertices: false }
    ).getVisualizationData();

    expect(visualization.kind).toEqual({ plotly: true });
    expect(visualization.layout).toMatchObject({
      scene: {
        aspectmode: "data",
        camera: { projection: { type: "orthographic" } }
      }
    });

    expect(visualization.data).toHaveLength(4);
    expect(visualization.data[0]).toMatchObject({
      type: "scatter3d",
      mode: "markers",
      name: "anchor",
      x: [0],
      y: [2],
      z: [0]
    });
    expect(visualization.data[1]).toMatchObject({
      type: "scatter3d",
      mode: "lines",
      name: "edge",
      x: [0, 1, null],
      y: [1, 2, null],
      z: [0, 1, null]
    });
    expect(visualization.data[2]).toMatchObject({
      type: "scatter3d",
      mode: "lines",
      name: "parcel",
      x: [0, 2, 2, 0, 0, null, 0.5, 1, 1, 0.5, null],
      y: [0, 0, 0, 0, 0, null, 0, 0, 0, 0, null],
      z: [0, 0, 2, 2, 0, null, 0.5, 0.5, 1, 0.5, null]
    });
    expect(visualization.data[3]).toMatchObject({
      type: "mesh3d",
      name: "slab",
      x: [0, 1, 1, 0],
      y: [0, 0, 0, 0],
      z: [0, 0, 1, 1],
      i: [0, 0],
      j: [1, 2],
      k: [2, 3]
    });
    expect(JSON.parse(new Plotter([]).visualize(true) as string)).toEqual({
      kind: { plotly: true },
      data: [],
      layout: {
        scene: {
          xaxis_title: "X Axis",
          yaxis_title: "Y Axis",
          zaxis_title: "Z Axis",
          aspectmode: "data",
          camera: { projection: { type: "orthographic" } }
        }
      }
    });
  });

  it("accepts GeoJSON-like features and feature collections without project-specific adapters", () => {
    const visualization = new Plotter([
      {
        type: "Feature",
        properties: { name: "survey-points" },
        geometry: {
          type: "MultiPoint",
          coordinates: [
            [0, 0, 1],
            [2, 2, 3]
          ]
        }
      },
      {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: { name: "outline" },
            geometry: {
              type: "LineString",
              coordinates: [
                [0, 0, 0],
                [1, 0, 0],
                [1, 1, 0]
              ]
            }
          }
        ]
      }
    ]).getVisualizationData();

    expect(visualization.data).toHaveLength(2);
    expect(visualization.data[0]).toMatchObject({
      type: "scatter3d",
      mode: "markers",
      name: "survey-points",
      x: [0, 2],
      y: [0, 2],
      z: [1, 3]
    });
    expect(visualization.data[1]).toMatchObject({
      type: "scatter3d",
      mode: "lines+markers",
      name: "outline",
      x: [0, 1, 1, null],
      y: [0, 0, 1, null],
      z: [0, 0, 0, null]
    });
  });

  it("accepts mesh-like objects and custom adapters for project-specific objects", () => {
    const segment = {
      kind: "Segment",
      label: "custom-edge",
      start: { x: 0, y: 0, z: 0 },
      end: { x: 2, y: 0, z: 1 }
    };

    const visualization = new Plotter(
      [
        {
          name: "duck-mesh",
          vertices: [
            [0, 0, 0],
            [1, 0, 0],
            [1, 1, 0]
          ],
          faces: [[0, 1, 2]]
        },
        segment
      ],
      {
        adapters: [
          (value) => {
            if (
              typeof value === "object" &&
              value !== null &&
              "kind" in value &&
              value.kind === "Segment"
            ) {
              return lineString([
                value.start as { x: number; y: number; z: number },
                value.end as { x: number; y: number; z: number }
              ], value.label as string);
            }

            return undefined;
          }
        ]
      }
    ).getVisualizationData();

    expect(visualization.data).toHaveLength(2);
    expect(visualization.data[0]).toMatchObject({
      type: "mesh3d",
      name: "duck-mesh",
      x: [0, 1, 1],
      y: [0, 0, 1],
      z: [0, 0, 0],
      i: [0],
      j: [1],
      k: [2]
    });
    expect(visualization.data[1]).toMatchObject({
      type: "scatter3d",
      mode: "lines+markers",
      name: "custom-edge",
      x: [0, 2, null],
      y: [0, 0, null],
      z: [0, 1, null]
    });
  });
});
