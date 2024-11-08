import json
import trimesh
import numpy as np
import plotly.graph_objects as go

from plotly.offline import plot
from typing import List, Tuple, Union
from shapely.geometry import Polygon, MultiPolygon, LineString, MultiLineString, Point


class Plotter:
    """shapely geometries plotter for vscode debugvisualizer extension"""

    def __init__(
        self, *geometries, map_z_to_y: bool = False, orthographic: bool = True, show_vertices: bool = True
    ) -> None:
        self.__iterables = (list, tuple)
        self.__gen_geometries_dict(geometries, map_z_to_y, orthographic, show_vertices)

    @property
    def geometries_data(self):
        return self.__geometries_data

    @property
    def viz_dict(self):
        return self.__viz_dict

    def __gen_geometries_dict(self, geometries, map_z_to_y, orthographic, show_vertices) -> None:
        """main func"""

        self.__geometries_data: List[dict] = []
        for geometry in geometries:
            self.__geometries_data.append(self.__get_geometry_data(geometry, map_z_to_y, show_vertices))

        self.__viz_dict = {
            "kind": {"plotly": True},
            "data": self.__geometries_data,
            "layout": {
                "scene": {
                    "xaxis_title": "X Axis",
                    "yaxis_title": "Y Axis",
                    "zaxis_title": "Z Axis",
                    "aspectmode": "data",
                }
            },
        }

        if orthographic:
            self.__viz_dict["layout"]["scene"]["camera"] = dict(projection=dict(type="orthographic"))

    def __get_geometry_data(
        self,
        geometry: Union[trimesh.Trimesh, Polygon, LineString, MultiPolygon, MultiLineString, Point],
        map_z_to_y: bool,
        show_vertices: bool,
    ) -> dict:
        """get plotly format data"""

        data = {
            "x": [],
            "y": [],
            "z": [],
            "mode": "lines" if not show_vertices else "lines+markers",
            "type": "mesh3d" if isinstance(geometry, trimesh.Trimesh) else "scatter3d",
            "name": "mesh" if isinstance(geometry, trimesh.Trimesh) else "geometry",
            "showlegend": True,
            "opacity": 0.6,
        }

        if isinstance(geometry, trimesh.Trimesh):
            del data["mode"]
            if geometry.vertices.shape[0] > 0:
                data["x"] = geometry.vertices[:, 0].tolist()
                data["y"] = geometry.vertices[:, 1].tolist()
                data["z"] = geometry.vertices[:, 2].tolist()
                data["i"], data["j"], data["k"] = map(lambda arr: arr.tolist(), geometry.faces.T)

                if map_z_to_y:
                    data["y"], data["z"] = data["z"], data["y"]

        elif isinstance(geometry, (Point, LineString, Polygon)):
            x, y, z = self.__get_x_y_z(geometry)
            data["x"].extend(x)
            data["y"].extend(y)
            data["z"].extend(z)

            if isinstance(geometry, Polygon) and len(geometry.interiors) > 0:
                for interior in geometry.interiors:
                    data["x"].append(None)
                    data["y"].append(None)
                    data["z"].append(None)
                    x, y, z = self.__get_x_y_z(interior)
                    data["x"].extend(x)
                    data["y"].extend(y)
                    data["z"].extend(z)

            data["x"].append(None)
            data["y"].append(None)
            data["z"].append(None)

        else:
            geometry = self.__flatten(geometry) if isinstance(geometry, self.__iterables) else geometry.geoms
            for geom in geometry:
                d = self.__get_geometry_data(geom, map_z_to_y, show_vertices)
                data["x"].extend(d["x"])
                data["y"].extend(d["y"])
                data["z"].extend(d["z"])

        return data

    def __get_x_y_z(self, geometry: Union[Point, Polygon, LineString]) -> Tuple[List[float]]:
        """get single geometry's x,y coordinates"""

        if geometry.is_empty:
            return [], [], []

        coords = geometry.exterior.coords if isinstance(geometry, Polygon) else geometry.coords
        x = list(np.array(coords)[:, 0])
        y = list(np.array(coords)[:, 1])
        z = list(np.zeros_like(y))

        if geometry.has_z:
            z = list(np.array(coords)[:, 2])

        return x, y, z

    def __flatten(self, geometry):
        """flatten a list of geometries"""

        flattened = []
        for geom in geometry:
            if isinstance(geom, self.__iterables):
                flattened.extend(self.__flatten(geom))
            else:
                flattened.append(geom)

        return flattened

    def visualize(self, to_json: bool = True) -> dict:
        """get data for visualization. if to_json switch is true, convert it to JSON string."""

        if to_json:
            return json.dumps(self.viz_dict)

        return self.viz_dict

    def save(self, filename: str = "visualization.html") -> None:
        """save the visualized result to an HTML file."""

        fig = go.Figure(
            data=[
                go.Mesh3d(**geom) if geom["type"] == "mesh3d" else go.Scatter3d(**geom) for geom in self.geometries_data
            ]
        )
        fig.update_layout(**self.viz_dict["layout"])

        plot(fig, filename=filename, auto_open=False)
