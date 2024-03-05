
import json
import trimesh
import numpy as np
import plotly.graph_objects as go

from plotly.offline import plot
from typing import List, Tuple, Union, Iterable
from shapely.geometry import Polygon, MultiPolygon, LineString, MultiLineString, Point


class Plotter:
    """shapely geometries plotter for vscode debugvisualizer extension"""

    def __init__(self, *geometries, map_z_to_y: bool = True) -> None:
        self.map_z_to_y = map_z_to_y
        self.__gen_geometries_dict(geometries)
    
    @property
    def geometries_data(self):
        return self.__geometries_data

    @property
    def viz_dict(self):
        return self.__viz_dict

    def __gen_geometries_dict(self, geometries) -> None:
        """main func"""

        self.__geometries_data: List[dict] = []
        for geometry in geometries:
            self.__geometries_data.append(self.__get_geometry_data(geometry))

        self.__viz_dict = {
            "kind": {"plotly": True},
            "data": self.__geometries_data,
        }

    def __get_geometry_data(self, geometry: Union[trimesh.Trimesh, Polygon, LineString, MultiPolygon, MultiLineString, Point]) -> dict:
        """get plotly format data"""

        data = {
            "x": [],
            "y": [],
            "z": [],
            "type": "mesh3d" if isinstance(geometry, trimesh.Trimesh) else "scatter3d",
        }

        if isinstance(geometry, trimesh.Trimesh):
            data["opacity"] = 0.7
            data["x"] = geometry.vertices[:, 0].tolist()
            data["y"] = geometry.vertices[:, 1].tolist()
            data["z"] = geometry.vertices[:, 2].tolist()
            data["i"], data["j"], data["k"] = map(lambda arr: arr.tolist(), geometry.faces.T)

            if self.map_z_to_y:
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
            geometry = np.array(geometry).flatten() if isinstance(geometry, Iterable) else geometry.geoms
            for geom in geometry:
                d = self.__get_geometry_data(geom)
                data["x"].extend(d["x"])
                data["y"].extend(d["y"])
                data["z"].extend(d["z"])

        return data

    def __get_x_y_z(self, geometry: Union[Point, Polygon, LineString]) -> Tuple[List[float]]:
        """get single geometry's x,y coordinates"""

        if geometry.is_empty:
            return [], []

        coords = geometry.exterior.coords if isinstance(geometry, Polygon) else geometry.coords
        x = list(np.array(coords)[:, 0])
        y = list(np.array(coords)[:, 1])
        z = list(np.zeros_like(y))

        if geometry.has_z:
            z = list(np.array(coords)[:, 2])
        
        return x, y, z

    def visualize(self, to_json: bool = True) -> dict:
        """get data for visualization. if to_json switch is true, convert it to JSON string."""

        if to_json:
            return json.dumps(self.viz_dict)
        
        return self.viz_dict
    
    def save(self, filename: str = "visualization.html") -> None:
        """save the visualized result to an HTML file."""

        fig = go.Figure(data=[go.Mesh3d(**geom) if geom["type"] == "mesh3d" else go.Scatter3d(**geom) for geom in self.geometries_data])
        
        fig.update_layout(scene=dict(
            xaxis_title='X Axis',
            yaxis_title='Y Axis',
            zaxis_title='Z Axis'
        ))
        
        plot(fig, filename=filename, auto_open=False)
        



if __name__ == "__main__":
    polygon = Polygon([[0,0], [2,0], [2,2], [0,2], [0,0]])
    polygon2 = Polygon([[1,1], [2,1], [2,2], [1,2], [1,1]])
    polygon3 = Polygon([[3,3], [3,5], [5,5], [5,3], [3,3]])
    multipolygon = MultiPolygon([polygon, polygon3])

    l1 = LineString([[0,0], [1,1]])
    l2 = LineString([[2,2], [3,3]])
    multilinestring = MultiLineString([l1, l2])

    p1 = Point(2,2)
    ep = Point()
    
    mesh_vertices = np.array([
        [0, 0, 0],
        [1, 0, 0],
        [1, 1, 0],
        [0, 1, 0],
        [0, 0, 1],
        [1, 0, 1],
        [1, 1, 1],
        [0, 1, 1] 
    ])

    mesh_faces = np.array([
        [0, 1, 2], [0, 2, 3],
        [4, 5, 6], [4, 6, 7],
        [0, 1, 5], [0, 5, 4],
        [1, 2, 6], [1, 6, 5],
        [2, 3, 7], [2, 7, 6],
        [3, 0, 4], [3, 4, 7] 
    ])

    mesh = trimesh.Trimesh(vertices=mesh_vertices, faces=mesh_faces)