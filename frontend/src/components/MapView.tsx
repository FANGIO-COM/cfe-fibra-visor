// src/components/MapView.tsx
import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  LayersControl,
  ScaleControl,
  useMap,
} from "react-leaflet";
import type { LatLngExpression, ControlPosition } from "leaflet";
import L from "leaflet";
import type { FeatureCollection } from "geojson";

import { UploadPanel } from "./panels/UploadPanel";
import type { MeasurePoints, MeasureResult } from "../utils/measureFibra";
import { computeMeasure } from "../utils/measureFibra";

const { BaseLayer, Overlay } = LayersControl;

const INITIAL_CENTER: LatLngExpression = [20.5, -103.5];
const POS_BOTTOM_LEFT: ControlPosition = "bottomleft";
const POS_TOP_RIGHT: ControlPosition = "topright";

// Change if needed
const API_BASE_URL = "http://127.0.0.1:8000";

// =====================
// Control de pantalla completa
// =====================
const FullScreenControl = () => {
  const map = useMap();
  const [isFs, setIsFs] = useState(false);

  useEffect(() => {
    const handler = () => {
      const fs = !!document.fullscreenElement;
      setIsFs(fs);
      setTimeout(() => map.invalidateSize(), 200);
    };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, [map]);

  const toggleFs = () => {
    const container = map.getContainer();
    if (!document.fullscreenElement) {
      container.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  return (
    <div className="leaflet-top leaflet-left">
      <div className="leaflet-control leaflet-bar">
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            toggleFs();
          }}
          title={isFs ? "Salir de pantalla completa" : "Ver en pantalla completa"}
          style={{
            textAlign: "center",
            width: 32,
            lineHeight: "32px",
            fontSize: 18,
          }}
        >
          ⛶
        </a>
      </div>
    </div>
  );
};

// =====================
// Minimap
// =====================
const MiniMapControl = () => {
  const map = useMap();
  const divId = "mini-map-container";

  useEffect(() => {
    let miniMap: L.Map | null = null;
    const el = document.getElementById(divId);
    if (!el) return;

    if (!miniMap) {
      miniMap = L.map(el, {
        attributionControl: false,
        zoomControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        zoomSnap: 0,
        zoomDelta: 0.25,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(miniMap);
    }

    const sync = () => {
      const center = map.getCenter();
      const zoom = map.getZoom();
      miniMap?.setView(center, Math.max(zoom - 3, 1));
    };

    sync();
    map.on("move", sync);
    map.on("zoom", sync);

    return () => {
      map.off("move", sync);
      map.off("zoom", sync);
      miniMap?.remove();
    };
  }, [map]);

  return (
    <div className="leaflet-bottom leaflet-right">
      <div className="leaflet-control leaflet-bar">
        <div
          id={divId}
          style={{
            width: 150,
            height: 150,
            borderRadius: 4,
            overflow: "hidden",
          }}
        />
      </div>
    </div>
  );
};

// =====================
// Leaflet-based GeoJSON layer
// =====================
function StyledGeoJsonLayer({
  data,
  style,
  onEachFeature,
}: {
  data: any;
  style?: L.PathOptions;
  onEachFeature?: (feature: any, layer: L.Layer) => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (!data) return;

    const layer = L.geoJSON(data, {
      style,
      onEachFeature,
      pointToLayer: (_feature, latlng) =>
        L.circleMarker(latlng, { radius: 6, weight: 2, opacity: 0.9 }),
    });

    layer.addTo(map);

    return () => {
      layer.remove();
    };
  }, [map, data, style, onEachFeature]);

  return null;
}

// =====================
// Mapa principal (UPLOAD-ONLY)
// =====================
export function MapView() {
  // Upload-only datasets
  const [fibra, setFibra] = useState<FeatureCollection | null>(null);
  const [hits, setHits] = useState<FeatureCollection | null>(null);
  const [sitios, setSitios] = useState<FeatureCollection | null>(null);

  // Measurement
  const [measurePoints, setMeasurePoints] = useState<MeasurePoints>({});
  const [measureResult, setMeasureResult] = useState<MeasureResult | null>(null);

  // Recompute measure when fibra or points change
  useEffect(() => {
    if (!fibra) {
      setMeasureResult(null);
      return;
    }
    const res = computeMeasure(fibra as any, measurePoints);
    setMeasureResult(res);
  }, [fibra, measurePoints]);

  const handleResetMeasure = () => setMeasurePoints({});

  const handleHitClick = (lat: number, lng: number) => {
    setMeasurePoints((prev) => ({ ...prev, hit: [lat, lng] }));
  };

  const handleSitioClick = (lat: number, lng: number) => {
    setMeasurePoints((prev) => {
      if (!prev.division) return { ...prev, division: [lat, lng] };
      return { ...prev, final: [lat, lng] };
    });
  };

  // Click handlers for uploaded point layers
  const onEachHit = (_feature: any, layer: L.Layer) => {
    layer.on("click", (e: any) => {
      const { lat, lng } = e.latlng;
      handleHitClick(lat, lng);
    });
  };

  const onEachSitio = (_feature: any, layer: L.Layer) => {
    layer.on("click", (e: any) => {
      const { lat, lng } = e.latlng;
      handleSitioClick(lat, lng);
    });
  };

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <MapContainer center={INITIAL_CENTER} zoom={8} scrollWheelZoom style={{ width: "100%", height: "100%" }}>
        <ScaleControl position={POS_BOTTOM_LEFT} />
        <FullScreenControl />
        <MiniMapControl />

        <LayersControl position={POS_TOP_RIGHT}>
          {/* Base maps */}
          <BaseLayer checked name="OpenStreetMap">
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          </BaseLayer>

          <BaseLayer name="CartoDB Positron">
            <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
          </BaseLayer>

          <BaseLayer name="Esri World Imagery">
            <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
          </BaseLayer>

          {/* Uploaded layers */}
          {fibra && (
            <Overlay checked name="Fibra (uploaded)">
              <StyledGeoJsonLayer data={fibra as any} style={{ weight: 3, opacity: 0.9 }} />
            </Overlay>
          )}

          {hits && (
            <Overlay checked name="HIT (uploaded)">
              <StyledGeoJsonLayer
                data={hits as any}
                style={{ weight: 2, opacity: 0.9 }}
                onEachFeature={onEachHit}
              />
            </Overlay>
          )}

          {sitios && (
            <Overlay checked name="Sitios (uploaded)">
              <StyledGeoJsonLayer
                data={sitios as any}
                style={{ weight: 2, opacity: 0.9 }}
                onEachFeature={onEachSitio}
              />
            </Overlay>
          )}

          {/* Measurement segments */}
          {measureResult?.segHitDiv && (
            <Overlay checked name="Tramo HIT→División">
              <StyledGeoJsonLayer data={measureResult.segHitDiv as any} style={{ weight: 6, opacity: 0.9 }} />
            </Overlay>
          )}

          {measureResult?.segDivFin && (
            <Overlay checked name="Tramo División→Final">
              <StyledGeoJsonLayer data={measureResult.segDivFin as any} style={{ weight: 6, opacity: 0.9 }} />
            </Overlay>
          )}
        </LayersControl>
      </MapContainer>

      {/* Upload panel */}
      <div style={{ position: "absolute", top: 16, left: 16, zIndex: 1000, display: "flex", gap: 12 }}>
        <UploadPanel
          apiBaseUrl={API_BASE_URL}
          onLayerLoaded={(geojson, info) => {
            // Basic heuristic: decide where to store it
            // You can improve this by adding a dropdown (fibra/hits/sitios) in the UploadPanel.
            const features = geojson.features ?? [];
            const geomType = features[0]?.geometry?.type;

            if (geomType === "LineString" || geomType === "MultiLineString") {
              setFibra(geojson as any);
            } else if (geomType === "Point" || geomType === "MultiPoint") {
              // If hits not set yet -> set hits, else set sitios
              if (!hits) setHits(geojson as any);
              else setSitios(geojson as any);
            } else {
              // Default: treat as fibra-ish
              setFibra(geojson as any);
            }
          }}
        />

        <div
          style={{
            width: 260,
            padding: 12,
            borderRadius: 12,
            background: "rgba(15,15,15,0.92)",
            color: "white",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Upload-only mode</div>
          <div style={{ fontSize: 12, opacity: 0.8, lineHeight: 1.35 }}>
            1) Upload fibra (lines). <br />
            2) Upload HIT points. <br />
            3) Upload Sitios points. <br />
            Click HIT/Sitio points to set measurement points.
          </div>

          <button
            onClick={() => {
              setFibra(null);
              setHits(null);
              setSitios(null);
              setMeasurePoints({});
            }}
            style={{
              marginTop: 10,
              width: "100%",
              padding: "8px 10px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.08)",
              color: "white",
              cursor: "pointer",
            }}
          >
            Clear uploaded data
          </button>

          <button
            onClick={handleResetMeasure}
            style={{
              marginTop: 8,
              width: "100%",
              padding: "8px 10px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.08)",
              color: "white",
              cursor: "pointer",
            }}
          >
            Reset measure points
          </button>
        </div>
      </div>
    </div>
  );
}
