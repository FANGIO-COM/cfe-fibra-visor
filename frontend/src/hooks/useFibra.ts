// src/hooks/useFibra.ts
import { useCallback, useState } from "react";

export type FibraFC = GeoJSON.FeatureCollection;

export function useFibra() {
  const [fibra, setFibra] = useState<FibraFC | null>(null);

  const clear = useCallback(() => {
    setFibra(null);
  }, []);

  return { fibra, setFibra, clear };
}
