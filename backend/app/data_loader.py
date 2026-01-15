# backend/app/data_loader.py
import os
import zipfile
import math

import geopandas as gpd
import pandas as pd
from pyproj import Geod
import tempfile
import uuid
import shutil

from .config import (
    FIBRA_SHP,
    PUNTOS_ZIP,
    HIT_NAME,
    SITIO_NAME,
    CAND_ESTADO,
    CAND_TEC,
    CAND_ZONA,
    CAND_ID,
    CAND_ORIGEN,
    ESTADO_MAP,
    SIMPLIFY_TOL,
)

# =====================
# Helpers (copiados y adaptados de visor_fibra.py)
# =====================


def find_col(cols, candidates):
    """
    Devuelve el nombre real de la primera columna de `cols` que coincida
    (ignorando mayúsculas/minúsculas) con alguno de los nombres en `candidates`.
    """
    low = {c.lower(): c for c in cols}
    for c in candidates:
        if c and c.lower() in low:
            return low[c.lower()]
    return None


def normalize_estado(series):
    """
    Normaliza el campo de estado usando ESTADO_MAP y unifica variantes como
    'en obra' / 'en-obra' -> 'en_obra'.
    """
    s = series.astype(str).str.strip().str.lower()
    s = s.map(lambda v: ESTADO_MAP.get(v, v))
    return s.replace({"en obra": "en_obra", "en-obra": "en_obra"})


def to_wgs84(gdf: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    """
    Reproyecta un GeoDataFrame a WGS84 (EPSG:4326).

    Si el GeoDataFrame no trae CRS:
      - Toma una geometría de ejemplo.
      - Si |x| <= 180 y |y| <= 90, asume que ya está en lon/lat (EPSG:4326).
      - En caso contrario, asume coordenadas en metros tipo WebMercator (EPSG:3857).
    Si ya trae CRS, lo respeta y solo hace to_crs(4326).
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
                # ¿Parece lon/lat en grados?
                if abs(x0) <= 180 and abs(y0) <= 90:
                    gdf = gdf.set_crs(epsg=4326)
                else:
                    # Asumimos métrico tipo WebMercator; si usas otro CRS,
                    # cámbialo aquí.
                    gdf = gdf.set_crs(epsg=3857)
        else:
            # Sin geometrías válidas, asumimos WGS84 por defecto
            gdf = gdf.set_crs(epsg=4326)

    # Si ya tenía CRS definido, simplemente lo reproyectamos
    return gdf.to_crs(epsg=4326)


def km_lengths(gdf):
    """
    Calcula la longitud en km de cada geometría sin depender de .length ni de CRS.

    - Soporta coordenadas 2D, 3D o 4D (x, y, z, m).
    - Si las coordenadas parecen grados (lon/lat), usa cálculo geodésico WGS84.
    - Si NO parecen grados, asume que las unidades son metros y usa distancia euclidiana.
    """

    if gdf.crs is None:
        gdf = gdf.set_crs(epsg=3857)  # tu data real viene en 3857

    g4326 = gdf.to_crs(epsg=4326)
    crs_metric = g4326.estimate_utm_crs()
    gm = g4326.to_crs(crs_metric)

    return (gm.length / 1000.0).round(3)

def load_points_from_zip(zip_path, base_name):
    """
    Extrae un shapefile desde un ZIP en una carpeta TEMP única (evita locks/permissions)
    y lo devuelve reproyectado a WGS84.
    """
    if not os.path.exists(zip_path):
        return None

    # Extract into a NEW unique temp directory every run
    extract_dir = os.path.join(
        tempfile.gettempdir(),
        f"{os.path.splitext(os.path.basename(zip_path))[0]}_{uuid.uuid4().hex}"
    )
    os.makedirs(extract_dir, exist_ok=True)

    with zipfile.ZipFile(zip_path, "r") as z:
        z.extractall(extract_dir)

    shp = os.path.join(extract_dir, base_name + ".shp")
    if not os.path.exists(shp):
        return None

    gdf = gpd.read_file(shp)
    return to_wgs84(gdf)


# =====================
# Carga principal (equivalente a la parte inicial de main())
# =====================


def load_base_data():
    """
    Carga la fibra, calcula campos, pasa a WGS84 y carga HIT/SITIO.

    Devuelve:
      - gdf_fibra_wgs (GeoDataFrame en WGS84)
      - gdf_hit (GeoDataFrame o None)
      - gdf_sitio (GeoDataFrame o None)
    """
    if not os.path.exists(FIBRA_SHP):
        raise FileNotFoundError(f"No se encontró {FIBRA_SHP}")

    gdf = gpd.read_file(FIBRA_SHP)
    if gdf.crs is None:
        gdf = gdf.set_crs(epsg=3857)

    # En este punto NO tocamos gdf.crs; km_lengths se encarga de decidir
    # si trata las coords como grados o como metros.

    # columnas
    estado_col = find_col(gdf.columns, CAND_ESTADO)
    tec_col = find_col(gdf.columns, CAND_TEC)
    zona_col = find_col(gdf.columns, CAND_ZONA)
    id_col = find_col(gdf.columns, CAND_ID)
    origen_col = find_col(gdf.columns, CAND_ORIGEN)

    # longitudes y atributos normalizados
    gdf["long_km"] = km_lengths(gdf)
    print("Ejemplo long_km:")
    print(gdf[["long_km"]].head())


    gdf["estado"] = (
        normalize_estado(gdf[estado_col]) if estado_col else "construido"
    )
    gdf["tec"] = gdf[tec_col] if tec_col else None
    gdf["zona"] = gdf[zona_col] if zona_col else None
    gdf["id"] = gdf[id_col] if id_col else None
    gdf["origen"] = gdf[origen_col] if origen_col else None
    gdf["dataset"] = "RA - RUTAS RENAyA"

    # Ahora sí, llevamos todo a WGS84 para el mapa/API
    gdf_wgs = to_wgs84(gdf)

    if SIMPLIFY_TOL > 0:
        gdf_wgs["geometry"] = gdf_wgs.geometry.simplify(
            SIMPLIFY_TOL, preserve_topology=True
        )
        print("SUM long_km:", gdf["long_km"].sum())


    # puntos HIT / SITIO
    gdf_hit = load_points_from_zip(PUNTOS_ZIP, HIT_NAME)
    gdf_sitio = load_points_from_zip(PUNTOS_ZIP, SITIO_NAME)

    return gdf_wgs, gdf_hit, gdf_sitio
