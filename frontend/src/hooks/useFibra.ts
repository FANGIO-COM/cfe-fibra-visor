// src/hooks/useFibra.ts
import { useEffect, useState } from "react";

export function useFibra() {
  const [fibra, setFibra] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch("http://localhost:8000/api/fibra");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setFibra(data);
      } catch (e: any) {
        setError(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { fibra, loading, error };
}
