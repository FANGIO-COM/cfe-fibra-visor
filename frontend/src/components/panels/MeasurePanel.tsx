// src/components/panels/MeasurePanel.tsx
import type { MeasurePoints, MeasureResult } from "../../utils/measureFibra";

interface Props {
  points: MeasurePoints;
  result: MeasureResult | null;
  onReset: () => void;
}

export function MeasurePanel({ points, result, onReset }: Props) {
  return (
    <div
      style={{
        background: "white",
        padding: "0.5rem 0.75rem",
        borderRadius: 8,
        boxShadow: "0 0 8px rgba(0,0,0,0.15)",
        fontSize: 12,
        maxWidth: 260,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 4 }}>
        Medición HIT → División → Final
      </div>

      <div>HIT: {points.hit ? "✓ seleccionado" : "—"}</div>
      <div>División: {points.division ? "✓ seleccionada" : "—"}</div>
      <div>Final: {points.final ? "✓ seleccionado" : "—"}</div>

      <hr style={{ margin: "6px 0" }} />

      <div>
        HIT → División:{" "}
        {result ? `${result.kmHitDiv.toFixed(3)} km` : "—"}
      </div>
      <div>
        División → Final:{" "}
        {result ? `${result.kmDivFin.toFixed(3)} km` : "—"}
      </div>
      <div style={{ fontWeight: 600, marginTop: 4 }}>
        Total: {result ? `${result.kmTotal.toFixed(3)} km` : "—"}
      </div>

      <button
        type="button"
        onClick={onReset}
        style={{
          marginTop: 8,
          width: "100%",
          borderRadius: 6,
          border: "1px solid #ccc",
          padding: "4px 0",
          fontSize: 12,
          cursor: "pointer",
          background: "#f6f6f6",
        }}
      >
        Limpiar medición
      </button>
    </div>
  );
}
