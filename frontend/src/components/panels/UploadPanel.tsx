// src/components/panels/UploadPanel.tsx
import { useState } from "react";
import {
  uploadLayer,
  fetchUploadedLayerData,
  type UploadLayerType,
  type UploadResult,
} from "../../api/fibraApi";

export function UploadPanel({
  apiBaseUrl, // kept for compatibility, but we use fibraApi.ts API_URL internally
  onLayerLoaded,
}: {
  apiBaseUrl: string; // not required anymore but you can keep it
  onLayerLoaded: (geojson: GeoJSON.FeatureCollection, info: UploadResult) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [layerType, setLayerType] = useState<UploadLayerType>("hit");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastInfo, setLastInfo] = useState<UploadResult | null>(null);

  async function upload() {
    if (!file) return;
    setBusy(true);
    setError(null);
    setLastInfo(null);

    try {
      // 1) upload
      const info = await uploadLayer(file, layerType);
      setLastInfo(info);

      // 2) fetch geojson data
      const geojson = (await fetchUploadedLayerData(info.dataUrl)) as GeoJSON.FeatureCollection;
      onLayerLoaded(geojson, info);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        width: 320,
        background: "rgba(15,15,15,0.92)",
        color: "white",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 8px 30px rgba(0,0,0,0.35)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "12px 14px",
          fontWeight: 700,
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        Upload
      </div>

      <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
        <select
          value={layerType}
          onChange={(e) => setLayerType(e.target.value as UploadLayerType)}
          style={{
            width: "100%",
            padding: "8px 10px",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(255,255,255,0.08)",
            color: "white",
          }}
          disabled={busy}
        >
          <option value="hit">HITs</option>
          <option value="sitio">Sitios</option>
        </select>

        <input
          type="file"
          accept=".zip,.geojson,.json"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          style={{ width: "100%" }}
          disabled={busy}
        />

        <div style={{ fontSize: 12, opacity: 0.75, lineHeight: 1.3 }}>
          Supported: GeoJSON (.geojson/.json) or Shapefile ZIP (.zip)
        </div>

        <button
          onClick={upload}
          disabled={!file || busy}
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(255,255,255,0.08)",
            color: "white",
            cursor: !file || busy ? "not-allowed" : "pointer",
            opacity: !file || busy ? 0.6 : 1,
          }}
        >
          {busy ? "Uploading..." : `Upload ${layerType === "hit" ? "HITs" : "Sitios"}`}
        </button>

        {lastInfo && (
          <div
            style={{
              fontSize: 13,
              padding: "10px 12px",
              background: "rgba(0,255,170,0.08)",
              border: "1px solid rgba(0,255,170,0.18)",
              borderRadius: 10,
            }}
          >
            Loaded: <b>{lastInfo.layerId}</b>
            {typeof lastInfo.featureCount === "number" ? (
              <div>Features: {lastInfo.featureCount}</div>
            ) : null}
          </div>
        )}

        {error && (
          <div
            style={{
              fontSize: 13,
              padding: "10px 12px",
              background: "rgba(255,0,0,0.10)",
              border: "1px solid rgba(255,0,0,0.22)",
              borderRadius: 10,
              whiteSpace: "pre-wrap",
            }}
          >
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
