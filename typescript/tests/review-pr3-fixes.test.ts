import { execSync } from "node:child_process";
import { existsSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  lineString,
  mesh,
  point,
  polygon,
  Plotter,
  type GeometryAdapter,
  type LineStringGeometry,
  type MeshGeometry,
  type MeshLikeGeometry,
  type PolygonGeometry
} from "../src/index";

describe("review PR #3 fixes", () => {
  it("KR1: point() with object-form Coordinate produces a scatter3d trace at runtime", () => {
    const visualization = new Plotter([
      point({ x: 1, y: 2, z: 3 }, "object-point")
    ]).getVisualizationData();

    expect(visualization.data).toHaveLength(1);
    const trace = visualization.data[0]!;
    expect(trace.type).toBe("scatter3d");
    expect(trace.x).toEqual([1]);
    expect(trace.y).toEqual([2]);
    expect(trace.z).toEqual([3]);
  });

  it("KR2: empty mesh-like { vertices: [], faces: [] } produces a mesh3d trace at runtime", () => {
    const visualization = new Plotter([
      { vertices: [], faces: [], name: "empty-mesh-like" }
    ]).getVisualizationData();

    expect(visualization.data).toHaveLength(1);
    const trace = visualization.data[0]!;
    expect(trace.type).toBe("mesh3d");
    expect(trace.x).toEqual([]);
    expect(trace.y).toEqual([]);
    expect(trace.z).toEqual([]);
    expect(trace.i).toEqual([]);
    expect(trace.j).toEqual([]);
    expect(trace.k).toEqual([]);
  });

  it("KR3: GeometryAdapter accepts a function whose return type is MeshLikeGeometry", () => {
    class Cube {
      constructor(public readonly size: number) {}
    }

    const cubeAdapter: GeometryAdapter = (value: unknown): MeshLikeGeometry | undefined => {
      if (!(value instanceof Cube)) return undefined;
      const s = value.size;
      return {
        vertices: [[0, 0, 0], [s, 0, 0], [s, s, 0], [0, s, 0]],
        faces: [[0, 1, 2], [0, 2, 3]],
        name: "cube"
      };
    };

    const visualization = new Plotter([new Cube(2)], {
      adapters: [cubeAdapter]
    }).getVisualizationData();

    expect(visualization.data).toHaveLength(1);
    expect(visualization.data[0]!.type).toBe("mesh3d");
  });

  it(
    "KR4: npm pack from a clean checkout ships dist/index.js and dist/index.d.ts via prepack",
    () => {
      const pkgDir = process.cwd();
      const distDir = join(pkgDir, "dist");
      rmSync(distDir, { recursive: true, force: true });
      expect(existsSync(distDir)).toBe(false);

      const stdout = execSync("npm pack --dry-run --json", {
        cwd: pkgDir,
        stdio: ["ignore", "pipe", "ignore"]
      }).toString("utf8");

      const reports = JSON.parse(stdout) as Array<{
        files: Array<{ path: string }>;
      }>;
      const filePaths = reports[0]!.files.map((entry) => entry.path);

      expect(filePaths).toContain("dist/index.js");
      expect(filePaths).toContain("dist/index.d.ts");
    },
    60_000
  );

  it(
    "KR5: published tarball does not ship an orphan dist/index.d.ts.map (or includes the referenced src/)",
    () => {
      const pkgDir = process.cwd();
      const distDir = join(pkgDir, "dist");
      rmSync(distDir, { recursive: true, force: true });

      const stdout = execSync("npm pack --dry-run --json", {
        cwd: pkgDir,
        stdio: ["ignore", "pipe", "ignore"]
      }).toString("utf8");

      const reports = JSON.parse(stdout) as Array<{
        files: Array<{ path: string }>;
      }>;
      const filePaths = reports[0]!.files.map((entry) => entry.path);

      const hasMap = filePaths.includes("dist/index.d.ts.map");
      const hasSource = filePaths.includes("src/index.ts");
      expect(hasMap && !hasSource).toBe(false);
    },
    60_000
  );

  it("KR11: Plotter constructor and adapters option accept readonly arrays (as const)", () => {
    const passthroughAdapter: GeometryAdapter = (value) =>
      value instanceof Object && "kind" in (value as object) && (value as { kind: unknown }).kind === "Tag"
        ? lineString([[0, 0, 0], [1, 0, 0]], (value as { name: string }).name)
        : undefined;

    const geometries = [{ kind: "Tag", name: "ro" }] as const;
    const adapters = [passthroughAdapter] as const;

    const visualization = new Plotter(geometries, { adapters }).getVisualizationData();

    expect(visualization.data).toHaveLength(1);
    expect(visualization.data[0]!.type).toBe("scatter3d");
  });

  it("KR10: exported geometry interfaces accept readonly outer arrays (as const) via direct annotation", () => {
    // Realistic pattern: lift the `as const` literal into a separate binding,
    // then drop it into a value annotated with the exported interface.
    const lineCoords = [[0, 0, 0], [1, 0, 0]] as const;
    const polyCoords = [
      [
        [0, 0, 0],
        [2, 0, 0],
        [2, 2, 0],
        [0, 0, 0]
      ]
    ] as const;
    const meshVertices = [[0, 0, 0], [1, 0, 0], [1, 1, 0]] as const;
    const meshFaces = [[0, 1, 2]] as const;

    const line: LineStringGeometry = {
      type: "LineString",
      coordinates: lineCoords,
      name: "ro-line"
    };
    const poly: PolygonGeometry = {
      type: "Polygon",
      coordinates: polyCoords,
      name: "ro-poly"
    };
    const m: MeshGeometry = {
      type: "Mesh",
      vertices: meshVertices,
      faces: meshFaces,
      name: "ro-mesh"
    };

    const visualization = new Plotter([line, poly, m]).getVisualizationData();

    expect(visualization.data).toHaveLength(3);
    expect(visualization.data.map((trace) => trace.type)).toEqual([
      "scatter3d",
      "scatter3d",
      "mesh3d"
    ]);
  });

  it("KR6: lineString/polygon/mesh accept readonly tuple literals (as const)", () => {
    const lineCoords = [[0, 0, 0], [1, 0, 0]] as const;
    const polygonCoords = [
      [
        [0, 0, 0],
        [2, 0, 0],
        [2, 2, 0],
        [0, 0, 0]
      ]
    ] as const;
    const vertices = [
      [0, 0, 0],
      [1, 0, 0],
      [1, 1, 0]
    ] as const;
    const faces = [[0, 1, 2]] as const;

    const visualization = new Plotter([
      lineString(lineCoords, "edge"),
      polygon(polygonCoords, "parcel"),
      mesh(vertices, faces, "slab")
    ]).getVisualizationData();

    expect(visualization.data).toHaveLength(3);
    expect(visualization.data.map((trace) => trace.type)).toEqual([
      "scatter3d",
      "scatter3d",
      "mesh3d"
    ]);
  });

  it(
    "KR9: MeshLikeGeometry rejects adapter returns lacking (vertices|positions) and (faces|indices)",
    () => {
      const pkgDir = process.cwd();
      const fixturePath = join(pkgDir, "tests", "__kr9-regression.ts");
      writeFileSync(
        fixturePath,
        [
          'import type { MeshLikeGeometry } from "../src/index";',
          "// @ts-expect-error: bare { type, name } lacks a (vertices|positions) and (faces|indices) pair",
          'const overbroad: MeshLikeGeometry = { type: "DomainThing", name: "not-a-generic-geometry" };',
          "void overbroad;",
          ""
        ].join("\n"),
        "utf8"
      );

      let typecheckPassed = false;
      try {
        execSync("npm run typecheck --silent", {
          cwd: pkgDir,
          stdio: ["ignore", "ignore", "ignore"]
        });
        typecheckPassed = true;
      } catch {
        typecheckPassed = false;
      } finally {
        rmSync(fixturePath, { force: true });
      }

      expect(typecheckPassed).toBe(true);
    },
    60_000
  );

  it("KR8: empty TypedArray mesh-like { positions, indices } produces a mesh3d trace at runtime", () => {
    const visualization = new Plotter([
      {
        positions: new Float32Array(),
        indices: new Uint16Array(),
        name: "empty-typed-array-mesh"
      }
    ]).getVisualizationData();

    expect(visualization.data).toHaveLength(1);
    const trace = visualization.data[0]!;
    expect(trace.type).toBe("mesh3d");
    expect(trace.x).toEqual([]);
    expect(trace.y).toEqual([]);
    expect(trace.z).toEqual([]);
    expect(trace.i).toEqual([]);
    expect(trace.j).toEqual([]);
    expect(trace.k).toEqual([]);
  });

  it(
    "KR7: npm run typecheck fails when a tests/*.ts file has a deliberate type error",
    () => {
      const pkgDir = process.cwd();
      const brokenPath = join(pkgDir, "tests", "__kr7-broken.ts");
      writeFileSync(
        brokenPath,
        [
          'import { Plotter } from "../src/index";',
          "const wrong: number = new Plotter([]);",
          "void wrong;",
          "export {};",
          ""
        ].join("\n"),
        "utf8"
      );

      let typecheckFailed = false;
      try {
        execSync("npm run typecheck --silent", {
          cwd: pkgDir,
          stdio: ["ignore", "ignore", "ignore"]
        });
      } catch {
        typecheckFailed = true;
      } finally {
        rmSync(brokenPath, { force: true });
      }

      expect(typecheckFailed).toBe(true);
    },
    60_000
  );
});
