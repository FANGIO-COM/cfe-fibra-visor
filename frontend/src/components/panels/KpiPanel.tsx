// src/components/panels/KpiPanel.tsx
import type { Kpis } from "../../hooks/useFibraData";

export function KpiPanel({ kpis }: { kpis: Kpis }) {
  return (
  <div className="bg-black/90 text-white shadow rounded-lg p-4 text-sm min-w-[260px] space-y-4">

    {/* Header */}
    <div>
      <h2 className="text-lg font-semibold text-purple-400">
        Resumen
      </h2>
    </div>

    {/* Fibra óptica */}
    <section className="space-y-2">
      <h3 className="text-base font-semibold">
        Fibra óptica construida
      </h3>

      <div className="flex items-center gap-2">
        <span className="text-purple-400">◉</span>
        <span className="font-semibold">
          {kpis.km_construido.toFixed(3)} km
        </span>
      </div>

      <div className="text-purple-300 text-xs">
        Meta <span className="ml-1">{kpis.total_km.toFixed(3)} km</span>
      </div>

      <div className="text-xs text-gray-300">
        Porcentaje de avance
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-white/20 rounded overflow-hidden">
        <div
          className="h-full bg-purple-500 rounded"
          style={{ width: `${kpis.porcentaje_construido}%` }}
        />
      </div>

      <span className="text-xs">
        {kpis.porcentaje_construido} %
      </span>
    </section>

    {/* Sitios conectados */}
    <section className="space-y-2 pt-2 border-t border-white/10">
      <h3 className="text-base font-semibold">
        Sitios conectados
      </h3>

      <div className="flex items-center gap-2">
        <span className="text-purple-400">🌐</span>
        <span className="font-semibold">
          {kpis.sitios.toLocaleString()} sitios
        </span>
      </div>
    </section>

    {/* Dispositivos / HITs */}
    <section className="space-y-2 pt-2 border-t border-white/10">
      <h3 className="text-base font-semibold">
        Dispositivos conectados
      </h3>

      <div className="flex items-center gap-2">
        <span className="text-purple-400">📱</span>
        <span className="font-semibold">
          {kpis.hits.toLocaleString()}
        </span>
      </div>
    </section>

  </div>
);
}