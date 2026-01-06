// src/hooks/useFibraData.ts
import { useEffect, useState } from "react";
import { fetchFibra, fetchHits, fetchSitios, fetchKpis } from "../api/fibraApi";
import type { FeatureCollection } from "geojson";

export interface Filtros {
  estado: string;
  tec: string;
  zona: string;
}

export interface Kpis {
  total_km: number;
  km_construido: number;
  porcentaje_construido: number;
  hits: number;
  sitios: number;
  detalle_por_estado: { estado: string; km: number; unidad: string }[];
}

export function useFibraData() {
  const [fibra, setFibra] = useState<FeatureCollection | null>(null);
  const [hits, setHits] = useState<FeatureCollection | null>(null);
  const [sitios, setSitios] = useState<FeatureCollection | null>(null);
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [filtros, setFiltros] = useState<Filtros>({
    estado: "",
    tec: "",
    zona: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const [f, h, s, k] = await Promise.all([
          fetchFibra(),
          fetchHits(),
          fetchSitios(),
          fetchKpis(),
        ]);
        setFibra(f);
        setHits(h);
        setSitios(s);
        setKpis(k);
      } catch (e: any) {
        console.error(e);
        setError(e?.message ?? "Error cargando datos");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { fibra, hits, sitios, kpis, filtros, setFiltros, loading, error };
}
