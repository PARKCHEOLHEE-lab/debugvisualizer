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
  type MeshLikeGeometry
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
