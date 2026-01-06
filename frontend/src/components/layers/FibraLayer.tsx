// src/components/layers/FibraLayer.tsx
import { GeoJSON } from "react-leaflet";
import type { Feature, FeatureCollection } from "geojson";
import type { Filtros } from "../../hooks/useFibraData";
import L from "leaflet";

const COLOR_LINEAS = "#D33682";

const DASH_BY_STATE: Record<string, string | undefined> = {
  construido: undefined,
  en_obra: "10,6",
  planeado: "6,4",
};

export function FibraLayer({
  fibra,
  filtros,
}: {
  fibra: FeatureCollection;
  filtros: Filtros;
}) {
  // 1) Filtrado por estado / tecnología / zona
  const filtered: FeatureCollection = {
    ...fibra,
    features: fibra.features.filter((f: Feature) => {
      const p: any = f.properties ?? {};

      if (
        filtros.estado &&
        String(p.estado).toLowerCase() !== filtros.estado
      ) {
        return false;
      }
      if (filtros.tec && String(p.tec) !== filtros.tec) {
        return false;
      }
      if (filtros.zona && String(p.zona) !== filtros.zona) {
        return false;
      }
      return true;
    }),
  };

  // 2) Limpieza de coordenadas: si vienen como [x, y, z] -> [x, y]
  const prepareData = (fc: FeatureCollection): FeatureCollection => {
    const cleanFeatures = fc.features.map((f) => {
      const g: any = f.geometry;
      if (!g) return f;

      const dropZ = (coords: any): any => {
        if (!Array.isArray(coords)) return coords;

        // Caso base: [x, y, z] o [x, y]
        if (typeof coords[0] === "number") {
          const [x, y] = coords;
          return [x, y]; // ignoramos z/m si existen
        }

        // Recursivo para arrays anidados (LineString, MultiLineString)
        return coords.map(dropZ);
      };

      return {
        ...f,
        geometry: {
          ...g,
          coordinates: dropZ(g.coordinates),
        },
      };
    });

    return {
      type: "FeatureCollection",
      features: cleanFeatures,
    };
  };

  const styleFn = (feature: Feature): L.PathOptions => {
    const p: any = feature.properties ?? {};
    const est = String(p.estado ?? "").toLowerCase();
    const dash = DASH_BY_STATE[est];

    return {
      color: COLOR_LINEAS,
      weight: est === "planeado" ? 3 : 4,
      opacity: 0.9,
      dashArray: dash,
    };
  };

  const data2D = prepareData(filtered);

  return (
    <GeoJSON
      data={data2D as any}
      style={styleFn}
      onEachFeature={(feature, layer) => {
        const p: any = feature.properties ?? {};
        const id = p.id ?? "-";
        const origen = p.origen ?? "-";
        const long_km =
          typeof p.long_km === "number" ? p.long_km.toFixed(3) : p.long_km;

        const contenido = `
          <b>ID:</b> ${id}<br/>
          <b>Origen:</b> ${origen}<br/>
          <b>KM:</b> ${long_km ?? "-"}
        `;
        layer.bindTooltip(contenido, { sticky: true });
      }}
    />
  );
}
