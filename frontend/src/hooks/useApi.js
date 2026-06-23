import { useCallback, useEffect, useState } from 'react';
import apiClient from '../api/client';

export function useApi(path, { lazy = false, deps = [] } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(!lazy);
  const [error, setError] = useState(null);

  const load = useCallback(
    async (showSpinner = true) => {
      if (showSpinner) setLoading(true);
      setError(null);
      try {
        const response = await apiClient.get(path);
        setData(response.data);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    },
    [path]
  );

  useEffect(() => {
    if (!lazy) {
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, ...deps]);

  return { data, loading, error, reload: load, setData };
}
