import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

// Loads data whenever the screen gains focus (or `deps` change) and exposes reload().
// Late responses from older requests are ignored so fast typing in search boxes stays correct.
export function useFocusData(fetcher, deps = [], initial = null) {
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const runId = useRef(0);

  const reload = useCallback(async () => {
    const id = ++runId.current;
    try {
      const result = await fetcherRef.current();
      if (id === runId.current) {
        setData(result);
        setError(null);
      }
    } catch (e) {
      if (id === runId.current) setError(e?.message || 'Something went wrong while loading.');
    } finally {
      if (id === runId.current) setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload, ...deps])
  );

  return { data, loading, error, reload, setData };
}
