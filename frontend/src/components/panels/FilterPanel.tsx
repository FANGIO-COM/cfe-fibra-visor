// src/components/panels/FilterPanel.tsx
import type { FeatureCollection } from "geojson";
import type { Filtros } from "../../hooks/useFibraData";

function uniqueSorted(values: (string | null | undefined)[]) {
  const set = new Set(
    values
      .map((v) => (v == null ? "" : String(v)))
      .map((v) => v.trim())
      .filter((v) => v !== "")
  );
  return Array.from(set).sort();
}

export function FilterPanel({
  fibra,
  filtros,
  onChange,
}: {
  fibra: FeatureCollection;
  filtros: Filtros;
  onChange: (f: Filtros) => void;
}) {
  const propsList = fibra.features.map((f) => (f.properties ?? {}) as any);

  const estados = uniqueSorted(propsList.map((p) => p.estado?.toLowerCase()));
  const tecs = uniqueSorted(propsList.map((p) => p.tec));
  const zonas = uniqueSorted(propsList.map((p) => p.zona));

  const handleChange = (field: keyof Filtros, value: string) => {
    onChange({ ...filtros, [field]: value });
  };

  return (
    <div className="bg-white/90 shadow rounded-lg p-3 text-sm min-w-[220px] space-y-2">
      <h2 className="font-semibold mb-1">Filtros</h2>

      <div className="flex flex-col">
        <label className="text-xs font-medium mb-1">Estado</label>
        <select
          className="border rounded px-2 py-1 text-xs"
          value={filtros.estado}
          onChange={(e) => handleChange("estado", e.target.value)}
        >
          <option value="">(Todos)</option>
          {estados.map((est) => (
            <option key={est} value={est}>
              {est}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col">
        <label className="text-xs font-medium mb-1">Tecnología</label>
        <select
          className="border rounded px-2 py-1 text-xs"
          value={filtros.tec}
          onChange={(e) => handleChange("tec", e.target.value)}
        >
          <option value="">(Todas)</option>
          {tecs.map((tec) => (
            <option key={tec} value={tec}>
              {tec}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col">
        <label className="text-xs font-medium mb-1">Zona</label>
        <select
          className="border rounded px-2 py-1 text-xs"
          value={filtros.zona}
          onChange={(e) => handleChange("zona", e.target.value)}
        >
          <option value="">(Todas)</option>
          {zonas.map((zona) => (
            <option key={zona} value={zona}>
              {zona}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
