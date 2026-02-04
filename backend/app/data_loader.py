# backend/app/data_loader.py
import os
import zipfile
import tempfile
import uuid
import json
import shutil
from pathlib import Path
from os import PathLike
from typing import Union, Optional

import geopandas as gpd

# =====================
# Helpers
# =====================

Pathish = Union[str, PathLike]

SUPPORTED_GEOJSON_EXT = {".geojson", ".json"}
SUPPORTED_ZIP_EXT = {".zip"}


def to_wgs84(gdf: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    """
    Reproject GeoDataFrame to WGS84 (EPSG:4326).

    If CRS is missing:
      - Inspect first non-empty geometry coordinate
      - If it looks like lon/lat -> assume EPSG:4326
      - Else assume WebMercator meters -> EPSG:3857
    """
    if gdf.crs is None:
        sample = next(
            (g for g in gdf.geometry if g is not None and not g.is_empty),
            None,
        )
        if sample is not None:
            coords = list(sample.coords)
            if coords:
                x0, y0 = float(coords[0][0]), float(coords[0][1])
                if abs(x0) <= 180 and abs(y0) <= 90:
                    gdf = gdf.set_crs(epsg=4326)
                else:
                    gdf = gdf.set_crs(epsg=3857)
        else:
            gdf = gdf.set_crs(epsg=4326)

    return gdf.to_crs(epsg=4326)


def _find_first_shp(extract_dir: str) -> Optional[str]:
    """Find first .shp anywhere under extract_dir."""
    for root, _, files in os.walk(extract_dir):
        for fn in files:
            if fn.lower().endswith(".shp"):
                return os.path.join(root, fn)
    return None


# =====================
# Upload loaders
# =====================

def load_gdf_from_geojson_file(file_path: Pathish) -> gpd.GeoDataFrame:
    """
    Robust GeoJSON loader:
    - Tries geopandas.read_file first
    - Falls back to manual JSON parsing if needed
    - Handles UTF-8 BOM
    """
    file_path = os.fspath(file_path)

    # 1) Try Fiona/GeoPandas first
    try:
        gdf = gpd.read_file(file_path)
        if gdf.crs is None:
            gdf = gdf.set_crs(epsg=4326)
        return to_wgs84(gdf)
    except Exception:
        pass

    # 2) Manual fallback
    with open(file_path, "rb") as f:
        raw = f.read()

    try:
        text = raw.decode("utf-8-sig")  # handles UTF-8 BOM
    except UnicodeDecodeError:
        text = raw.decode("latin-1")

    try:
        obj = json.loads(text)
    except Exception as e:
        raise ValueError(f"Invalid JSON/GeoJSON: {e}")

    # Normalize to FeatureCollection
    if isinstance(obj, dict) and obj.get("type") == "Feature":
        obj = {"type": "FeatureCollection", "features": [obj]}
    elif not (isinstance(obj, dict) and obj.get("type") == "FeatureCollection"):
        raise ValueError("GeoJSON must be FeatureCollection or Feature")

    features = obj.get("features") or []
    if not isinstance(features, list):
        raise ValueError("GeoJSON 'features' must be a list")

    # Remove features with null geometry
    features = [f for f in features if isinstance(f, dict) and f.get("geometry")]

    gdf = gpd.GeoDataFrame.from_features(features)
    if gdf.crs is None:
        gdf = gdf.set_crs(epsg=4326)

    return to_wgs84(gdf)


def load_gdf_from_shapefile_zip(zip_path: Pathish) -> gpd.GeoDataFrame:
    """
    Extract shapefile zip into a unique temp folder, load the first .shp found,
    and return it projected to WGS84. Cleans up temp folder afterwards.
    """
    zip_path = os.fspath(zip_path)

    if not os.path.exists(zip_path):
        raise FileNotFoundError(zip_path)

    extract_dir = os.path.join(
        tempfile.gettempdir(),
        f"upload_{Path(zip_path).stem}_{uuid.uuid4().hex}",
    )
    os.makedirs(extract_dir, exist_ok=True)

    try:
        with zipfile.ZipFile(zip_path, "r") as z:
            z.extractall(extract_dir)

        shp_path = _find_first_shp(extract_dir)
        if not shp_path:
            raise ValueError("ZIP does not contain any .shp file")

        gdf = gpd.read_file(shp_path)
        return to_wgs84(gdf)

    finally:
        shutil.rmtree(extract_dir, ignore_errors=True)


def load_gdf_from_upload(file_path: Pathish, filename: str) -> gpd.GeoDataFrame:
    """
    Single entry point: detect format and return GeoDataFrame in WGS84.
    """
    file_path = os.fspath(file_path)
    ext = Path(filename).suffix.lower()

    if ext in SUPPORTED_GEOJSON_EXT:
        return load_gdf_from_geojson_file(file_path)

    if ext in SUPPORTED_ZIP_EXT:
        return load_gdf_from_shapefile_zip(file_path)

    raise ValueError("Unsupported file type. Use .geojson/.json or shapefile .zip")


def gdf_to_featurecollection(gdf: gpd.GeoDataFrame) -> dict:
    """
    Convert GeoDataFrame to GeoJSON FeatureCollection dict (WGS84).
    """
    gdf_wgs = to_wgs84(gdf)
    return json.loads(gdf_wgs.to_json(drop_id=True))
