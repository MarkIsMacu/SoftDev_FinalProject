import { useState, useEffect, useCallback, useRef } from 'react';

const useAsync = (asyncFn, immediate = true) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);
  const fnRef = useRef(asyncFn);

  useEffect(() => {
    fnRef.current = asyncFn;
  });

  const execute = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fnRef.current(...args);
      setData(result);
      return result;
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (immediate) {
      // Defer to next microtask so setState isn't called synchronously in the effect body
      Promise.resolve().then(() => execute());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [immediate]);

  return { data, loading, error, execute };
};

export default useAsync;