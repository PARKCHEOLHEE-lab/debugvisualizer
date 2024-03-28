import trimesh
import numpy as np

from debugvisualizer import Plotter
from shapely import wkt, affinity
from shapely.geometry import Polygon, MultiPolygon, LineString, MultiLineString, Point

if __name__ == "__main__":
    polygon = Polygon([[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]])
    polygon2 = Polygon([[1, 1], [2, 1], [2, 2], [1, 2], [1, 1]])
    polygon3 = Polygon([[3, 3], [3, 5], [5, 5], [5, 3], [3, 3]])
    multipolygon = MultiPolygon([polygon, polygon3])

    l1 = LineString([[0, 0], [1, 1]])
    l2 = LineString([[2, 2], [3, 3]])
    multilinestring = MultiLineString([l1, l2])

    p1 = Point(2, 2)
    ep = Point()

    mesh_vertices = np.array([[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]])

    mesh_faces = np.array(
        [
            [0, 1, 2],
            [0, 2, 3],
            [4, 5, 6],
            [4, 6, 7],
            [0, 1, 5],
            [0, 5, 4],
            [1, 2, 6],
            [1, 6, 5],
            [2, 3, 7],
            [2, 7, 6],
            [3, 0, 4],
            [3, 4, 7],
        ]
    )

    mesh = trimesh.Trimesh(vertices=mesh_vertices, faces=mesh_faces)

    print("break point")

    site_wkt = "POLYGON ((-6 5, -6 -1, -4 -6, 0 -5, 9 -1, 5 1, 1 6, -4 6, -6 5))"
    site = wkt.loads(site_wkt)
    site_extruded = trimesh.primitives.Extrusion(site, height=-3)

    empty_area = site.buffer(-0.5, join_style=2)

    mass = Polygon(
        [
            [-4, 0],
            [-4, 4],
            [0, 4],
            [0, 2],
            [2, 2],
            [2, -2],
            [0, -2],
            [0, -4],
            [-4, -4],
            [-4, -2],
        ]
    )

    mass_extruded = trimesh.primitives.Extrusion(mass, height=9)

    translate_interval = 1.5
    height_interval = 0.2
    height = 0

    possible_boundaries = []

    while height < 12:
        multiplier = translate_interval
        if height > 9:
            multiplier = height / 2

        translated_site = affinity.translate(site, *(np.array([0, -1]) * multiplier))

        intersected = translated_site.intersection(empty_area)
        intersected_boundary = np.array(intersected.boundary.coords)
        intersected_with_z = np.hstack((intersected_boundary, np.zeros((intersected_boundary.shape[0], 1)) + height))

        if height != 0:
            possible_boundaries.append(Polygon(intersected_with_z))

        height += height_interval

    print("break point")

    Plotter(site_extruded, mass_extruded, possible_boundaries, show_vertices=False, orthographic=True).save()
