// src/api/fibraApi.ts
const API_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";

async function getJson(path: string) {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) {
    throw new Error(await res.text());
  }
  return res.json();
}

export function fetchHits() {
  return getJson("/api/hits");
}

export function fetchSitios() {
  return getJson("/api/sitios");
}

export function fetchKpis() {
  return getJson("/api/kpis");
}

export type UploadLayerType = "hit" | "sitio";

export type UploadResult = {
  layerId: string;
  status?: string;
  dataUrl: string;
  featureCount?: number;
  type?: UploadLayerType;
};

export async function uploadLayer(file: File, layerType: UploadLayerType) {
  const form = new FormData();
  // IMPORTANT: send the File directly so filename+extension is preserved
  form.append("file", file);

  const res = await fetch(`${API_URL}/api/layers/upload?layerType=${layerType}`, {
    method: "POST",
    body: form,
    // DO NOT set Content-Type manually
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  const info = (await res.json()) as UploadResult;
  return info;
}

export async function fetchUploadedLayerData(dataUrl: string) {
  const res = await fetch(`${API_URL}${dataUrl}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
