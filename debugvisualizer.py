from typing import List, Tuple, Union, Iterable
from shapely.geometry import Polygon, MultiPolygon, LineString, MultiLineString, Point, MultiPoint

import numpy as np



class Plotter:
    """shapely geometries plotter for vscode debugvisualizer extension"""

    def __init__(self, *geometries) -> None:
        self.__gen_geometries_dict(geometries)

    def __gen_geometries_dict(self, geometries) -> None:
        """main func"""

        self.__geometries_data: List[dict] = []
        for geometry in geometries:
            self.__geometries_data.append(self.__get_geometry_data(geometry))

        self.__viz_dict = {
            "kind": {"plotly": True},
            "data": self.__geometries_data,
        }

    def __get_geometry_data(self, geometry: Union[Polygon, LineString, MultiPolygon, MultiLineString]) -> dict:
        """get plotly format data"""

        data = {
            "x": [],
            "y": [],
            "fill": "toself" if isinstance(geometry, (Polygon, MultiPolygon)) else None,
        }

        # get single geometry's data
        if isinstance(geometry, (Point, LineString, Polygon)):
            x, y = self.__get_x_y(geometry)
            data["x"].extend(x)
            data["y"].extend(y)
            
            if isinstance(geometry, Polygon) and len(geometry.interiors) > 0:
                for interior in geometry.interiors:
                    data["x"].append(None)  # Separator for holes
                    data["y"].append(None)
                    x, y = self.__get_x_y(interior)
                    data["x"].extend(x)
                    data["y"].extend(y)
            
            # separator
            data["x"].append(None)
            data["y"].append(None)

        # get multiple geometries's data
        else:
            geometry = np.array(geometry).flatten() if isinstance(geometry, Iterable) else geometry.geoms
            for geom in geometry:
                d = self.__get_geometry_data(geom)
                data["x"].extend(d["x"])
                data["y"].extend(d["y"])

                if isinstance(geom, (Polygon, MultiPolygon)) and data["fill"] is None:
                    data["fill"] = "toself"

        return data

    def __get_x_y(self, geometry: Union[Point, Polygon, LineString]) -> Tuple[List[float]]:
        """get single geometry's x,y coordinates"""

        if geometry.is_empty:
            return [], []

        coords = geometry.exterior.coords if isinstance(geometry, Polygon) else geometry.coords
        x = list(np.array(coords)[:, 0])
        y = list(np.array(coords)[:, 1])
        return x, y

    def visualize(self):
        return self.__viz_dict



# if __name__ == "__main__":
#     polygon = Polygon([[0,0], [2,0], [2,2], [0,2], [0,0]])
#     polygon2 = Polygon([[1,1], [2,1], [2,2], [1,2], [1,1]])
#     polygon3 = Polygon([[3,3], [3,5], [5,5], [5,3], [3,3]])
#     multipolygon = MultiPolygon([polygon, polygon3])

#     l1 = LineString([[0,0], [1,1]])
#     l2 = LineString([[2,2], [3,3]])
#     multilinestring = MultiLineString([l1, l2])

#     p1 = Point(2,2)
#     ep = Point()