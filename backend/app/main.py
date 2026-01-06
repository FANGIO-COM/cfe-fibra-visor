# backend/app/main.py
import json
from functools import lru_cache

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .data_loader import load_base_data
from .kpi import build_kpis

app = FastAPI(
    title="API Visor Fibra RA",
    version="1.0.0",
)

# CORS (luego puedes restringir orígenes)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # en producción: ["https://tu-dominio.com"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@lru_cache(maxsize=1)
def get_data():
    """
    Carga datos una sola vez (mientras no se reinicie el proceso).
    """
    return load_base_data()  # gdf_fibra, gdf_hit, gdf_sitio

# ===== Endpoints =====

@app.get("/api/fibra")
def get_fibra():
    gdf_fibra, _, _ = get_data()
    # Usamos to_json + json.loads para asegurar tipos serializables
    return json.loads(gdf_fibra.to_json())

@app.get("/api/hits")
def get_hits():
    _, gdf_hit, _ = get_data()
    if gdf_hit is None:
        return {"type": "FeatureCollection", "features": []}
    return json.loads(gdf_hit.to_json())

@app.get("/api/sitios")
def get_sitios():
    _, _, gdf_sitio = get_data()
    if gdf_sitio is None:
        return {"type": "FeatureCollection", "features": []}
    return json.loads(gdf_sitio.to_json())

@app.get("/api/kpis")
def get_kpis():
    gdf_fibra, gdf_hit, gdf_sitio = get_data()
    return build_kpis(gdf_fibra, gdf_hit, gdf_sitio)

@app.get("/health")
def health():
    return {"status": "ok"}
