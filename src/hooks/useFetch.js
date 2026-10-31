import { useCallback, useEffect, useRef, useState } from 'react';
import { api, errMsg } from '../api/client';

// GET helper: { data, loading, error, reload }. Pass url = null to skip the request.
export function useFetch(url, params) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(Boolean(url));
  const [error, setError] = useState('');
  const key = JSON.stringify(params ?? {});
  const alive = useRef(true);

  const run = useCallback(async () => {
    if (!url) { setData(null); setLoading(false); return; }
    setLoading(true);
    try {
      const res = await api.get(url, { params: JSON.parse(key) });
      if (alive.current) { setData(res.data); setError(''); }
    } catch (e) {
      if (alive.current) setError(errMsg(e));
    } finally {
      if (alive.current) setLoading(false);
    }
  }, [url, key]);

  useEffect(() => {
    alive.current = true;
    run();
    return () => { alive.current = false; };
  }, [run]);

  return { data, loading, error, reload: run };
}
