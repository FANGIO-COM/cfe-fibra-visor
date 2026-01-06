# backend/app/config.py
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"

# Archivos que ya usas en visor_fibra.py
FIBRA_SHP   = DATA_DIR / "RA - RUTAS RENAyA.shp"
PUNTOS_ZIP  = DATA_DIR / "RENAyA_R4.zip"
HIT_NAME    = "HIT"
SITIO_NAME  = "SITIO"

# Columnas candidatas (igual que tu script)
CAND_ESTADO = ["estado","status","est","state"]
CAND_TEC    = ["tecnologia","technology","tec","tipo","tipo_red"]
CAND_ZONA   = ["zona","region","municipio","muni","area"]
CAND_ID     = ["id_segmento","id","segmento","seg_id","idtramo","tramo"]
CAND_ORIGEN = ["origen","origen_nom","origin","site_ini","site_origen","hit"]

# Mapeo de estados (idéntico)
ESTADO_MAP = {"ab": "construido", "opo": "planeado"}

# Estilo por estado (por si luego lo usa el front)
DASH_BY_STATE = {"construido": None, "en_obra": "10,6", "planeado": "5,5"}
STYLE_BY_STATE = {
    "construido": {"weight": 4, "opacity": 0.95},
    "en_obra":    {"weight": 4, "opacity": 0.85},
    "planeado":   {"weight": 3, "opacity": 0.75},
}

COLOR_LINEAS = "#D33682"
COLOR_SITIO  = "#0899D3"

# En el backend mantenemos la misma decisión (no simplificar)
SIMPLIFY_TOL = 0.0  # antes 0.00025
