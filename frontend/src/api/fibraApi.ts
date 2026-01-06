// src/api/fibraApi.ts
const API_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";

async function getJson(path: string) {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) {
    throw new Error(`Error ${res.status} en ${path}`);
  }
  return res.json();
}

export function fetchFibra() {
  return getJson("/api/fibra");
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
