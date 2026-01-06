# backend/app/kpi.py
import pandas as pd
import geopandas as gpd

def build_kpis(gdf_fibra: gpd.GeoDataFrame,
               gdf_hit: gpd.GeoDataFrame | None,
               gdf_sitio: gpd.GeoDataFrame | None) -> dict:
    # Agrupación por estado (igual que en visor_fibra.py)
    kpi = (
        gdf_fibra[["estado", "long_km"]]
        .groupby("estado", as_index=False)["long_km"]
        .sum()
    )

    total_km = float(kpi["long_km"].sum()) if not kpi.empty else 0.0
    estados_set = set(kpi["estado"]) if not kpi.empty else set()
    km_cons = float(
        kpi[kpi["estado"] == "construido"]["long_km"].sum()
    ) if "construido" in estados_set else 0.0
    pct = 0 if total_km == 0 else round(100 * km_cons / total_km)

    hit_count   = int(len(gdf_hit))   if gdf_hit   is not None else 0
    sitio_count = int(len(gdf_sitio)) if gdf_sitio is not None else 0

    detalle = [
        {
            "estado": str(row["estado"]),
            "km": float(row["long_km"]),
            "unidad": "km",
        }
        for _, row in kpi.iterrows()
    ]

    return {
        "total_km": total_km,
        "km_construido": km_cons,
        "porcentaje_construido": pct,
        "hits": hit_count,
        "sitios": sitio_count,
        "detalle_por_estado": detalle,
    }
