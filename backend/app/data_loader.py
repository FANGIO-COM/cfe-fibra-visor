# backend/app/data_loader.py
import os
import zipfile
import math

import geopandas as gpd
import pandas as pd
from pyproj import Geod

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


def km_lengths(gdf: gpd.GeoDataFrame) -> pd.Series:
    """
    Calcula la longitud en km de cada geometría sin depender de .length ni de CRS.

    - Soporta coordenadas 2D, 3D o 4D (x, y, z, m).
    - Si las coordenadas parecen grados (lon/lat), usa cálculo geodésico WGS84.
    - Si NO parecen grados, asume que las unidades son metros y usa distancia euclidiana.
    """
    geod = Geod(ellps="WGS84")

    # Buscar una geometría de ejemplo no vacía
    sample_geom = next(
        (g for g in gdf.geometry if g is not None and not g.is_empty),
        None,
    )
    if sample_geom is None:
        # No hay geometrías válidas
        return pd.Series([0.0] * len(gdf), index=gdf.index)

    coords0 = list(sample_geom.coords)
    if not coords0:
        return pd.Series([0.0] * len(gdf), index=gdf.index)

    # Tomamos el primer punto y vemos si parece lon/lat (en grados)
    x0, y0 = float(coords0[0][0]), float(coords0[0][1])
    is_degrees = (abs(x0) <= 180 and abs(y0) <= 90)

    def length_geom(geom) -> float:
        if geom is None or geom.is_empty:
            return 0.0

        total_m = 0.0

        def acumula_segmentos(coords):
            nonlocal total_m
            if len(coords) < 2:
                return
            for p1, p2 in zip(coords[:-1], coords[1:]):
                # Las coords pueden ser (x, y), (x, y, z) o (x, y, z, m)
                x1, y1 = float(p1[0]), float(p1[1])
                x2, y2 = float(p2[0]), float(p2[1])

                if not all(math.isfinite(v) for v in (x1, y1, x2, y2)):
                    continue

                if is_degrees:
                    # Tratamos las coords como lon/lat en grados (distancia geodésica)
                    _, _, dist_m = geod.inv(x1, y1, x2, y2)
                else:
                    # Tratamos las coords como metros en un plano
                    dx, dy = x2 - x1, y2 - y1
                    dist_m = math.hypot(dx, dy)

                if math.isfinite(dist_m):
                    total_m += dist_m

        if geom.geom_type in ("LineString", "LinearRing"):
            acumula_segmentos(list(geom.coords))
        elif geom.geom_type == "MultiLineString":
            for part in geom.geoms:
                acumula_segmentos(list(part.coords))
        else:
            # Si hay polígonos u otras cosas raras, las ignoramos para longitud de fibra
            pass

        return round(total_m / 1000.0, 3)

    lengths = [length_geom(geom) for geom in gdf.geometry]
    return pd.Series(lengths, index=gdf.index)


def load_points_from_zip(zip_path, base_name):
    """
    Extrae un shapefile de puntos desde un ZIP y lo devuelve reproyectado a WGS84.
    """
    if not os.path.exists(zip_path):
        return None

    extract_dir = os.path.splitext(str(zip_path))[0] + "_extracted"
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
    if gdf.empty:
        raise ValueError(f"Shapefile vacío: {FIBRA_SHP}")

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

    # puntos HIT / SITIO
    gdf_hit = load_points_from_zip(PUNTOS_ZIP, HIT_NAME)
    gdf_sitio = load_points_from_zip(PUNTOS_ZIP, SITIO_NAME)

    return gdf_wgs, gdf_hit, gdf_sitio
