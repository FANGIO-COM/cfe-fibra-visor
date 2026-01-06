// src/utils/measureFibra.ts
import type { FeatureCollection, Feature } from "geojson";
import * as turf from "@turf/turf";

export type LatLng = [number, number]; // [lat, lng]

export interface MeasurePoints {
  hit?: LatLng;
  division?: LatLng;
  final?: LatLng;
}

export interface MeasureResult {
  segHitDiv?: Feature;  // GeoJSON LineString
  segDivFin?: Feature;  // GeoJSON LineString
  kmHitDiv: number;
  kmDivFin: number;
  kmTotal: number;
}

// Leaflet usa [lat, lng]; Turf usa [lng, lat]
function toTurfPoint(p: LatLng) {
  return turf.point([p[1], p[0]]);
}

// Convierte un feature de fibra (LineString o MultiLineString) a una línea Turf
function asLine(f: Feature): any {
  const g: any = f.geometry;
  if (!g) return null;

  if (g.type === "LineString") {
    return turf.lineString(g.coordinates);
  }

  if (g.type === "MultiLineString" && Array.isArray(g.coordinates) && g.coordinates.length > 0) {
    // Usamos el primer subtramo
    return turf.lineString(g.coordinates[0]);
  }

  return null;
}

// Versión React de bestLineForAB del visor original
function bestLineForAB(feats: Feature[], ptA: LatLng, ptB: LatLng): any {
  let best: any = null;
  let bestScore = Infinity;

  for (const f of feats) {
    try {
      const line = asLine(f);
      if (!line) continue;

      const a = turf.nearestPointOnLine(line, toTurfPoint(ptA), { units: "kilometers" });
      const b = turf.nearestPointOnLine(line, toTurfPoint(ptB), { units: "kilometers" });

      const score = (a.properties?.dist ?? 0) + (b.properties?.dist ?? 0);
      if (score < bestScore) {
        bestScore = score;
        best = line;
      }
    } catch {
      // Ignoramos geometrías raras
    }
  }

  return best;
}

// Versión React de sliceAlong del visor original
function sliceAlong(
  line: any,
  ptA: LatLng,
  ptB: LatLng
): { seg: Feature; km: number } | null {
  try {
    const pA = turf.nearestPointOnLine(line, toTurfPoint(ptA), { units: "kilometers" });
    const pB = turf.nearestPointOnLine(line, toTurfPoint(ptB), { units: "kilometers" });
    const seg = turf.lineSlice(pA, pB, line) as Feature;
    const km = turf.length(seg, { units: "kilometers" });
    return { seg, km };
  } catch {
    return null;
  }
}

// Equivalente a "pathOnActiveRoute + fallback recta"
function segmentBetween(
  feats: Feature[],
  ptA: LatLng,
  ptB: LatLng
): { seg: Feature; km: number } {
  // 1) Intentar seguir la mejor línea del conjunto
  const best = bestLineForAB(feats, ptA, ptB);
  if (best) {
    const r = sliceAlong(best, ptA, ptB);
    if (r && r.km > 0) {
      return r;
    }
  }

  // 2) Fallback: recta entre los dos puntos (como en el visor original)
  const seg = turf.lineString(
    [
      [ptA[1], ptA[0]],
      [ptB[1], ptB[0]],
    ],
    {}
  ) as Feature;
  const km = turf.length(seg, { units: "kilometers" });
  return { seg, km };
}

// Función principal, equivalente a "proceed()" del visor
export function computeMeasure(
  fibra: FeatureCollection,
  points: MeasurePoints
): MeasureResult | null {
  const feats = (fibra.features ?? []) as Feature[];

  const { hit, division, final } = points;

  let segHitDiv: Feature | undefined;
  let segDivFin: Feature | undefined;
  let kmHitDiv = 0;
  let kmDivFin = 0;

  // Tramo 1: HIT → División
  if (hit && division) {
    const r1 = segmentBetween(feats, hit, division);
    segHitDiv = r1.seg;
    kmHitDiv = r1.km;
  }

  // Tramo 2: División → Final
  if (division && final) {
    const r2 = segmentBetween(feats, division, final);
    segDivFin = r2.seg;
    kmDivFin = r2.km;
  }

  // Si no hay ningún tramo válido, devolvemos null (no se dibuja nada)
  if (!segHitDiv && !segDivFin) {
    return null;
  }

  return {
    segHitDiv,
    segDivFin,
    kmHitDiv,
    kmDivFin,
    kmTotal: kmHitDiv + kmDivFin,
  };
}
