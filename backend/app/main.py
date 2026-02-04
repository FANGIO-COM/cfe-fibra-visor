# backend/app/main.py
import json
from pathlib import Path
import traceback
import uuid
import shutil

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .data_loader import load_gdf_from_upload, gdf_to_featurecollection

app = FastAPI(
    title="API Visor Fibra RA",
    version="1.0.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # en producción: restringe
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- Basic endpoints ----

@app.get("/")
def root():
    return {"status": "ok", "message": "API running"}

@app.get("/health")
def health():
    return {"status": "ok"}

# ---- Upload + dynamic layers ----

BASE_DIR = Path(__file__).resolve().parent  # backend/app
UPLOAD_TMP = (BASE_DIR / ".." / "tmp" / "uploads").resolve()
LAYER_STORE = (BASE_DIR / ".." / "storage" / "layers").resolve()
UPLOAD_TMP.mkdir(parents=True, exist_ok=True)
LAYER_STORE.mkdir(parents=True, exist_ok=True)

@app.post("/api/layers/upload")
async def upload_layer(file: UploadFile = File(...)):
    layer_id = uuid.uuid4().hex
    filename = file.filename or "upload"
    tmp_path = UPLOAD_TMP / f"{layer_id}_{filename}"

    with tmp_path.open("wb") as f:
        shutil.copyfileobj(file.file, f)

    try:
        gdf = load_gdf_from_upload(str(tmp_path), filename)
        fc = gdf_to_featurecollection(gdf)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        tmp_path.unlink(missing_ok=True)

    out_path = LAYER_STORE / f"{layer_id}.geojson"
    out_path.write_text(json.dumps(fc, ensure_ascii=False), encoding="utf-8")

    return {
        "layerId": layer_id,
        "status": "ready",
        "dataUrl": f"/api/layers/{layer_id}/data",
        "featureCount": len(fc.get("features", [])),
    }

@app.get("/api/layers/{layer_id}/data")
def get_layer_data(layer_id: str):
    path = LAYER_STORE / f"{layer_id}.geojson"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Layer not found")
    return json.loads(path.read_text(encoding="utf-8"))
