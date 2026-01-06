// src/components/panels/LegendPanel.tsx
const COLOR_LINEAS = "#D33682";

export function LegendPanel() {
  return (
    <div
      style={{
        backgroundColor: "rgba(255,255,255,0.9)",
        color: "#111",
        padding: "0.5rem 0.75rem",
        borderRadius: "0.5rem",
        boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
        fontSize: "0.8rem",
        minWidth: "180px",
      }}
    >
      <div
        style={{
          fontWeight: 600,
          marginBottom: "0.35rem",
        }}
      >
        Simbología (estado)
      </div>

      {/* Construido */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: 4 }}>
        <svg width="40" height="6" style={{ marginRight: 8 }}>
          <line
            x1="0"
            y1="3"
            x2="40"
            y2="3"
            stroke={COLOR_LINEAS}
            strokeWidth="3"
          />
        </svg>
        <span>Construido</span>
      </div>

      {/* Planeado */}
      <div style={{ display: "flex", alignItems: "center" }}>
        <svg width="40" height="6" style={{ marginRight: 8 }}>
          <line
            x1="0"
            y1="3"
            x2="40"
            y2="3"
            stroke={COLOR_LINEAS}
            strokeWidth="3"
            strokeDasharray="6,4"
          />
        </svg>
        <span>Planeado</span>
      </div>
    </div>
  );
}
