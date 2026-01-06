// src/components/layers/PointsLayer.tsx
import { GeoJSON } from "react-leaflet";
import type { FeatureCollection, Feature } from "geojson";
import L from "leaflet";

type Props = {
  hits?: FeatureCollection;
  sitios?: FeatureCollection;
  onHitClick?: (lat: number, lng: number) => void;
  onSitioClick?: (lat: number, lng: number) => void;
};

export function PointsLayer({ hits, sitios, onHitClick, onSitioClick }: Props) {
  // HIT: estrellita rosa / círculo rosa
  const hitLayer =
    hits && hits.features && hits.features.length > 0 ? (
      <GeoJSON
        key="hits"
        data={hits as any}
        pointToLayer={(_feature: Feature, latlng: L.LatLng) => {
          const marker = L.circleMarker(latlng, {
            radius: 7,
            color: "#e91e63",
            fillColor: "#f06292",
            fillOpacity: 0.9,
            weight: 2,
          });

          marker.on("click", () => {
            // Leaflet da lat,lng ya como WGS84
            onHitClick?.(latlng.lat, latlng.lng);
          });

          marker.bindTooltip("HIT", { direction: "top", offset: L.point(0, -8) });
          return marker;
        }}
      />
    ) : null;

  // SITIOS: marcador azul
  const sitioLayer =
    sitios && sitios.features && sitios.features.length > 0 ? (
      <GeoJSON
        key="sitios"
        data={sitios as any}
        pointToLayer={(_feature: Feature, latlng: L.LatLng) => {
          const marker = L.circleMarker(latlng, {
            radius: 6,
            color: "#1565c0",
            fillColor: "#42a5f5",
            fillOpacity: 0.9,
            weight: 2,
          });

          marker.on("click", () => {
            onSitioClick?.(latlng.lat, latlng.lng);
          });

          marker.bindTooltip("SITIO", { direction: "top", offset: L.point(0, -8) });
          return marker;
        }}
      />
    ) : null;

  return (
    <>
      {hitLayer}
      {sitioLayer}
    </>
  );
}
