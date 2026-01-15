// src/components/MapView.tsx
import { useState, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  LayersControl,
  GeoJSON,
  ScaleControl,
  useMap,
} from "react-leaflet";
import L from "leaflet";

import { useFibraData } from "../hooks/useFibraData";
import { FibraLayer } from "./layers/FibraLayer";
import { PointsLayer } from "./layers/PointsLayer";
import { KpiPanel } from "./panels/KpiPanel";
import { FilterPanel } from "./panels/FilterPanel";
import { LegendPanel } from "./panels/LegendPanel";
import { MeasurePanel } from "./panels/MeasurePanel";
import type { MeasurePoints, MeasureResult } from "../utils/measureFibra";
import { computeMeasure } from "../utils/measureFibra";

const { BaseLayer, Overlay } = LayersControl;

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
          title={
            isFs ? "Salir de pantalla completa" : "Ver en pantalla completa"
          }
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
  }, [map, divId]);

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
// Mapa principal
// =====================

export function MapView() {
  const { fibra, hits, sitios, kpis, filtros, setFiltros, loading, error } =
    useFibraData();

  const [measurePoints, setMeasurePoints] = useState<MeasurePoints>({});
  const [measureResult, setMeasureResult] =
    useState<MeasureResult | null>(null);

  // Siempre que cambien los puntos de medición o la fibra, recalculamos
  useEffect(() => {
    if (!fibra) {
      setMeasureResult(null);
      return;
    }
    const res = computeMeasure(fibra as any, measurePoints);
    setMeasureResult(res);
  }, [fibra, measurePoints]);

  if (loading) {
    return <div style={{ padding: "1rem" }}>Cargando datos del mapa…</div>;
  }

  if (error || !fibra) {
    return (
      <div style={{ padding: "1rem", color: "red" }}>
        Error cargando datos: {error ?? "sin detalles"}
      </div>
    );
  }

  const handleResetMeasure = () => {
    setMeasurePoints({});
  };

  const handleHitClick = (lat: number, lng: number) => {
    // IMPORTANTE: actualización funcional → no perdemos division/final
    setMeasurePoints((prev) => ({
      ...prev,
      hit: [lat, lng],
    }));
  };

  const handleSitioClick = (lat: number, lng: number) => {
    setMeasurePoints((prev) => {
      // Si no hay división, este click es la división
      if (!prev.division) {
        return {
          ...prev,
          division: [lat, lng],
        };
      }
      // Si ya hay división, este click es el final
      return {
        ...prev,
        final: [lat, lng],
      };
    });
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
      }}
    >
      <MapContainer
        center={[20.5, -103.5]}
        zoom={8}
        scrollWheelZoom
        style={{ width: "100%", height: "100%" }}
      >
        <ScaleControl position="bottomleft" />
        <FullScreenControl />
        <MiniMapControl />

        <LayersControl position="topright">
          {/* Mapas base */}
          <BaseLayer checked name="OpenStreetMap">
            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          </BaseLayer>

          <BaseLayer name="CartoDB Positron">
            <TileLayer
              attribution="&copy; OpenStreetMap contributors &copy; CARTO"
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            />
          </BaseLayer>

          <BaseLayer name="Esri World Imagery">
            <TileLayer
              attribution="Tiles &copy; Esri"
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
          </BaseLayer>

          {/* Overlays */}
          <Overlay checked name="Fibra RA">
            <FibraLayer fibra={fibra} filtros={filtros} />
          </Overlay>

          <Overlay checked name="HIT + Sitios">
            <PointsLayer
              hits={hits}
              sitios={sitios}
              onHitClick={handleHitClick}
              onSitioClick={handleSitioClick}
            />
          </Overlay>

          {/* Trazado de medición */}
          {measureResult?.segHitDiv && (
            <Overlay checked name="Tramo HIT→División">
              <GeoJSON
                data={measureResult.segHitDiv as any}
                style={{ color: "#1abc9c", weight: 6, opacity: 0.9 }}
              />
            </Overlay>
          )}
          {measureResult?.segDivFin && (
            <Overlay checked name="Tramo División→Final">
              <GeoJSON
                data={measureResult.segDivFin as any}
                style={{ color: "#e67e22", weight: 6, opacity: 0.9 }}
              />
            </Overlay>
          )}
        </LayersControl>
      </MapContainer>

      {/* Panel KPIs */}
      <div
        style={{
          position: "absolute",
          top: 16,
          left: 50,
          zIndex: 1000,
        }}
      >
        {kpis && <KpiPanel kpis={kpis} />}
      </div>

      {/* Panel filtros + medición */}
      <div
        style={{
          position: "absolute",
          top: 160,
          right: 20,
          zIndex: 1000,
        }}
      >
        <div style={{ marginBottom: 8 }}>
          <FilterPanel fibra={fibra} filtros={filtros} onChange={setFiltros} />
        </div>
        <MeasurePanel
          points={measurePoints}
          result={measureResult}
          onReset={handleResetMeasure}
        />
      </div>

      {/* Leyenda */}
      <div
        style={{
          position: "absolute",
          bottom: 50,
          left: 16,
          zIndex: 1000,
        }}
      >
        <LegendPanel />
      </div>
    </div>
  );
}
