export interface PlotlyVisualizationData {
  kind: { plotly: true };
  data: PlotlyTrace[];
  layout: PlotlyLayout;
}

export interface PlotlyLayout {
  scene: {
    xaxis_title: string;
    yaxis_title: string;
    zaxis_title: string;
    aspectmode: "data";
    camera?: {
      projection: {
        type: "orthographic";
      };
    };
  };
}

export interface PlotlyTrace {
  type?: string;
  mode?: string;
  name?: string;
  showlegend?: boolean;
  opacity?: number;
  x?: Array<number | null>;
  y?: Array<number | null>;
  z?: Array<number | null>;
  i?: number[];
  j?: number[];
  k?: number[];
}

export type Coordinate =
  | readonly [number, number]
  | readonly [number, number, number]
  | { readonly x: number; readonly y: number; readonly z?: number };

export type MeshFace = readonly [number, number, number];

export interface PointGeometry {
  type: "Point";
  coordinates: Coordinate;
  name?: string;
}

export interface MultiPointGeometry {
  type: "MultiPoint";
  coordinates: Coordinate[];
  name?: string;
}

export interface LineStringGeometry {
  type: "LineString";
  coordinates: Coordinate[];
  name?: string;
}

export interface PolygonGeometry {
  type: "Polygon";
  coordinates: Coordinate[] | Coordinate[][];
  name?: string;
}

export interface MultiLineStringGeometry {
  type: "MultiLineString";
  coordinates: Coordinate[][];
  name?: string;
}

export interface MultiPolygonGeometry {
  type: "MultiPolygon";
  coordinates: Array<Coordinate[] | Coordinate[][]>;
  name?: string;
}

export interface MeshGeometry {
  type: "Mesh";
  vertices: Coordinate[];
  faces: MeshFace[];
  name?: string;
}

export interface MeshLikeGeometry {
  type?: string;
  vertices?: Coordinate[] | ArrayLike<number>;
  positions?: Coordinate[] | ArrayLike<number>;
  faces?: MeshFace[] | ArrayLike<number>;
  indices?: MeshFace[] | ArrayLike<number>;
  name?: string;
}

export interface FeatureGeometry {
  type: "Feature";
  geometry: GeometryInput | null;
  properties?: {
    name?: string;
    [key: string]: unknown;
  } | null;
  id?: string | number;
  name?: string;
}

export interface FeatureCollectionGeometry {
  type: "FeatureCollection";
  features: FeatureGeometry[];
  name?: string;
}

export type GeometryInput =
  | PointGeometry
  | MultiPointGeometry
  | LineStringGeometry
  | PolygonGeometry
  | MultiLineStringGeometry
  | MultiPolygonGeometry
  | MeshGeometry
  | FeatureGeometry
  | FeatureCollectionGeometry
  | GeometryInput[];

export interface PlotterOptions {
  mapZToY?: boolean;
  orthographic?: boolean;
  showVertices?: boolean;
  adapters?: GeometryAdapter[];
}

export type GeometryAdapter = (
  value: unknown
) => GeometryInput | GeometryInput[] | undefined;

export const point = (coordinates: Coordinate, name?: string): PointGeometry => ({
  type: "Point",
  coordinates,
  ...(name === undefined ? {} : { name })
});

export const lineString = (
  coordinates: Coordinate[],
  name?: string
): LineStringGeometry => ({
  type: "LineString",
  coordinates,
  ...(name === undefined ? {} : { name })
});

export const polygon = (
  coordinates: Coordinate[] | Coordinate[][],
  name?: string
): PolygonGeometry => ({
  type: "Polygon",
  coordinates,
  ...(name === undefined ? {} : { name })
});

export const mesh = (
  vertices: Coordinate[],
  faces: MeshFace[],
  name?: string
): MeshGeometry => ({
  type: "Mesh",
  vertices,
  faces,
  ...(name === undefined ? {} : { name })
});

export class Plotter {
  constructor(
    private readonly geometries: unknown[] = [],
    private readonly options: PlotterOptions = {}
  ) {}

  getVisualizationData(): PlotlyVisualizationData {
    const layout: PlotlyLayout = {
      scene: {
        xaxis_title: "X Axis",
        yaxis_title: "Y Axis",
        zaxis_title: "Z Axis",
        aspectmode: "data"
      }
    };

    if (this.options.orthographic ?? true) {
      layout.scene.camera = {
        projection: {
          type: "orthographic"
        }
      };
    }

    return {
      kind: { plotly: true },
      data: this.geometries.flatMap((geometry) => this.toTraces(geometry)),
      layout
    };
  }

  visualize(toJson = false): PlotlyVisualizationData | string {
    const data = this.getVisualizationData();
    return toJson ? JSON.stringify(data) : data;
  }

  private toTraces(geometry: unknown): PlotlyTrace[] {
    if (Array.isArray(geometry)) {
      return geometry.flatMap((child) => this.toTraces(child));
    }

    if (isMeshLikeGeometry(geometry)) {
      return [this.meshTrace(normalizeMeshLikeGeometry(geometry))];
    }

    if (isFeatureCollectionGeometry(geometry)) {
      return geometry.features.flatMap((feature) => this.toTraces(feature));
    }

    if (isFeatureGeometry(geometry)) {
      if (geometry.geometry === null) {
        return [];
      }

      return this.toTraces(withFeatureName(geometry.geometry, geometry));
    }

    if (isMeshGeometry(geometry)) {
      return [this.meshTrace(geometry)];
    }

    if (isScatterGeometry(geometry)) {
      return [this.scatterTrace(geometry)];
    }

    for (const adapter of this.options.adapters ?? []) {
      const adapted = adapter(geometry);
      if (adapted !== undefined) {
        return this.toTraces(adapted);
      }
    }

    throw new Error("Unsupported geometry input.");
  }

  private meshTrace(geometry: MeshGeometry): PlotlyTrace {
    const vertices = geometry.vertices.map((coordinate) =>
      this.coordinateToXyz(coordinate)
    );

    return {
      type: "mesh3d",
      name: geometry.name ?? "mesh",
      showlegend: true,
      opacity: 0.6,
      x: vertices.map((vertex) => vertex.x),
      y: vertices.map((vertex) => vertex.y),
      z: vertices.map((vertex) => vertex.z),
      i: geometry.faces.map((face) => face[0]),
      j: geometry.faces.map((face) => face[1]),
      k: geometry.faces.map((face) => face[2])
    };
  }

  private scatterTrace(
    geometry: ScatterGeometry
  ): PlotlyTrace {
    const x: Array<number | null> = [];
    const y: Array<number | null> = [];
    const z: Array<number | null> = [];

    if (geometry.type === "Point") {
      this.pushCoordinate({ x, y, z }, geometry.coordinates);
    } else if (geometry.type === "MultiPoint") {
      for (const coordinate of geometry.coordinates) {
        this.pushCoordinate({ x, y, z }, coordinate);
      }
    } else {
      for (const ring of this.getLineRings(geometry)) {
        this.pushRing({ x, y, z }, ring);
      }
    }

    return {
      type: "scatter3d",
      mode: isPointType(geometry.type) ? "markers" : this.lineMode(),
      name: geometry.name ?? "geometry",
      showlegend: true,
      opacity: 0.6,
      x,
      y,
      z
    };
  }

  private getLineRings(
    geometry:
      | LineStringGeometry
      | PolygonGeometry
      | MultiLineStringGeometry
      | MultiPolygonGeometry
  ): Coordinate[][] {
    if (geometry.type === "LineString") {
      return [geometry.coordinates];
    }

    if (geometry.type === "MultiLineString") {
      return geometry.coordinates;
    }

    if (geometry.type === "Polygon") {
      return normalizePolygonCoordinates(geometry.coordinates);
    }

    return geometry.coordinates.flatMap((polygonCoordinates) =>
      normalizePolygonCoordinates(polygonCoordinates)
    );
  }

  private lineMode(): string {
    return this.options.showVertices === false ? "lines" : "lines+markers";
  }

  private pushRing(
    values: {
      x: Array<number | null>;
      y: Array<number | null>;
      z: Array<number | null>;
    },
    ring: Coordinate[]
  ): void {
    for (const coordinate of ring) {
      this.pushCoordinate(values, coordinate);
    }
    values.x.push(null);
    values.y.push(null);
    values.z.push(null);
  }

  private pushCoordinate(
    values: {
      x: Array<number | null>;
      y: Array<number | null>;
      z: Array<number | null>;
    },
    coordinate: Coordinate
  ): void {
    const mapped = this.coordinateToXyz(coordinate);
    values.x.push(mapped.x);
    values.y.push(mapped.y);
    values.z.push(mapped.z);
  }

  private coordinateToXyz(coordinate: Coordinate): {
    x: number;
    y: number;
    z: number;
  } {
    let x: number;
    let y: number;
    let z: number;

    if (isTupleCoordinate(coordinate)) {
      x = coordinate[0];
      y = coordinate[1];
      z = coordinate[2] ?? 0;
    } else {
      x = coordinate.x;
      y = coordinate.y;
      z = coordinate.z ?? 0;
    }

    if (this.options.mapZToY) {
      return { x, y: z, z: y };
    }

    return { x, y, z };
  }
}

type ScatterGeometry =
  | PointGeometry
  | MultiPointGeometry
  | LineStringGeometry
  | PolygonGeometry
  | MultiLineStringGeometry
  | MultiPolygonGeometry;

function isPointType(type: string): boolean {
  return type === "Point" || type === "MultiPoint";
}

function isFeatureCollectionGeometry(
  value: unknown
): value is FeatureCollectionGeometry {
  return (
    isRecord(value) &&
    value.type === "FeatureCollection" &&
    Array.isArray(value.features)
  );
}

function isFeatureGeometry(value: unknown): value is FeatureGeometry {
  return (
    isRecord(value) &&
    value.type === "Feature" &&
    "geometry" in value &&
    (value.geometry === null || isRecord(value.geometry))
  );
}

function isMeshGeometry(value: unknown): value is MeshGeometry {
  return (
    isRecord(value) &&
    value.type === "Mesh" &&
    Array.isArray(value.vertices) &&
    Array.isArray(value.faces)
  );
}

function isMeshLikeGeometry(value: unknown): value is MeshLikeGeometry {
  if (!isRecord(value)) {
    return false;
  }

  const vertices = value.vertices ?? value.positions;
  const faces = value.faces ?? value.indices;
  return hasCoordinateInput(vertices) && hasFaceInput(faces);
}

function normalizeMeshLikeGeometry(value: MeshLikeGeometry): MeshGeometry {
  const vertexInput = value.vertices ?? value.positions;
  const faceInput = value.faces ?? value.indices;

  if (!hasCoordinateInput(vertexInput) || !hasFaceInput(faceInput)) {
    throw new Error("Invalid mesh-like geometry input.");
  }

  return {
    type: "Mesh",
    vertices: normalizeCoordinateList(vertexInput),
    faces: normalizeFaceList(faceInput),
    ...(value.name === undefined ? {} : { name: value.name })
  };
}

function hasCoordinateInput(
  value: unknown
): value is Coordinate[] | ArrayLike<number> {
  if (Array.isArray(value) && value.length > 0) {
    return isCoordinate(value[0]) || typeof value[0] === "number";
  }

  return isArrayLikeNumber(value);
}

function hasFaceInput(value: unknown): value is MeshFace[] | ArrayLike<number> {
  if (Array.isArray(value) && value.length > 0) {
    return isFace(value[0]) || typeof value[0] === "number";
  }

  return isArrayLikeNumber(value);
}

function normalizeCoordinateList(
  value: Coordinate[] | ArrayLike<number>
): Coordinate[] {
  if (Array.isArray(value) && value.length > 0 && isCoordinate(value[0])) {
    return value as Coordinate[];
  }

  return chunkNumbers(value as ArrayLike<number>, 3).map(
    ([x, y, z]) => [x, y, z] as const
  );
}

function normalizeFaceList(value: MeshFace[] | ArrayLike<number>): MeshFace[] {
  if (Array.isArray(value) && value.length > 0 && isFace(value[0])) {
    return value as MeshFace[];
  }

  return chunkNumbers(value as ArrayLike<number>, 3).map(
    ([i, j, k]) => [i, j, k] as const
  );
}

function chunkNumbers(
  value: ArrayLike<number>,
  chunkSize: 3
): Array<[number, number, number]> {
  if (value.length % chunkSize !== 0) {
    throw new Error("Flat mesh arrays must be divisible into triples.");
  }

  const chunks: Array<[number, number, number]> = [];
  for (let index = 0; index < value.length; index += chunkSize) {
    const first = value[index];
    const second = value[index + 1];
    const third = value[index + 2];
    if (
      typeof first !== "number" ||
      typeof second !== "number" ||
      typeof third !== "number"
    ) {
      throw new Error("Flat mesh arrays must contain numbers.");
    }

    chunks.push([first, second, third]);
  }

  return chunks;
}

function isFace(value: unknown): value is MeshFace {
  return (
    Array.isArray(value) &&
    typeof value[0] === "number" &&
    typeof value[1] === "number" &&
    typeof value[2] === "number"
  );
}

function isScatterGeometry(value: unknown): value is ScatterGeometry {
  return (
    isRecord(value) &&
    typeof value.type === "string" &&
    [
      "Point",
      "MultiPoint",
      "LineString",
      "Polygon",
      "MultiLineString",
      "MultiPolygon"
    ].includes(value.type) &&
    "coordinates" in value &&
    Array.isArray(value.coordinates)
  );
}

function withFeatureName(
  geometry: GeometryInput,
  feature: FeatureGeometry
): GeometryInput {
  if (Array.isArray(geometry)) {
    return geometry;
  }

  const featureName =
    feature.name ?? feature.properties?.name ?? feature.id?.toString();
  if (featureName === undefined || geometry.name !== undefined) {
    return geometry;
  }

  return { ...geometry, name: featureName };
}

function normalizePolygonCoordinates(
  coordinates: Coordinate[] | Coordinate[][]
): Coordinate[][] {
  if (coordinates.length === 0) {
    return [];
  }

  const first = coordinates[0];
  return first !== undefined && isCoordinate(first)
    ? [coordinates as Coordinate[]]
    : coordinates as Coordinate[][];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isArrayLikeNumber(value: unknown): value is ArrayLike<number> {
  if (!isRecord(value) || typeof value.length !== "number" || value.length === 0) {
    return false;
  }

  return typeof value[0] === "number";
}

function isCoordinate(value: unknown): value is Coordinate {
  if (isTupleCoordinate(value)) {
    return true;
  }

  return (
    typeof value === "object" &&
    value !== null &&
    "x" in value &&
    "y" in value &&
    typeof value.x === "number" &&
    typeof value.y === "number"
  );
}

function isTupleCoordinate(
  value: unknown
): value is readonly [number, number, number?] {
  return (
    Array.isArray(value) &&
    typeof value[0] === "number" &&
    typeof value[1] === "number"
  );
}
