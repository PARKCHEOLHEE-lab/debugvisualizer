import json
import pytest

from ..debugvisualizer import Plotter


@pytest.fixture
def plotter_dummy() -> Plotter:
    return Plotter()


def test_visualize_to_json(plotter_dummy: Plotter) -> None:
    """Tests `visualize` method with `to_json=True` whether it returns valid result."""

    visualized_str = plotter_dummy.visualize(to_json=True)
    visualied_dict = json.loads(visualized_str)

    assert isinstance(visualized_str, str)
    assert isinstance(visualied_dict, dict)
    assert "kind" in visualied_dict
    assert "data" in visualied_dict
    assert "layout" in visualied_dict


def test_visualize_to_dict(plotter_dummy: Plotter) -> None:
    """Tests `visualize` method with `to_json=False` whether it returns valid result."""

    visualized_dict = plotter_dummy.visualize(to_json=False)
    visualized_str = json.dumps(visualized_dict)

    assert isinstance(visualized_dict, dict)
    assert isinstance(visualized_str, str)
    assert "kind" in visualized_dict
    assert "data" in visualized_dict
    assert "layout" in visualized_dict
