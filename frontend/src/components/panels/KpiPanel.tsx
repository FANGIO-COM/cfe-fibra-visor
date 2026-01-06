// src/components/panels/KpiPanel.tsx
import type { Kpis } from "../../hooks/useFibraData";

export function KpiPanel({ kpis }: { kpis: Kpis }) {
  return (
    <div className="bg-white/90 shadow rounded-lg p-3 text-sm min-w-[240px]">
      <h2 className="font-semibold mb-2">Resumen de red</h2>
      <div className="space-y-1">
        <div>
          <span className="font-medium">Total km: </span>
          {kpis.total_km.toFixed(3)}
        </div>
        <div>
          <span className="font-medium">Km construidos: </span>
          {kpis.km_construido.toFixed(3)}
        </div>
        <div>
          <span className="font-medium">% construido: </span>
          {kpis.porcentaje_construido}%
        </div>
        <div>
          <span className="font-medium">HITs: </span>
          {kpis.hits}
        </div>
        <div>
          <span className="font-medium">Sitios: </span>
          {kpis.sitios}
        </div>
      </div>
    </div>
  );
}
