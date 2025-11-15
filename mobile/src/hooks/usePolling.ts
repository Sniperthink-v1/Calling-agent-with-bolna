import { useEffect, useRef, useState } from 'react';

interface UsePollingOptions {
  interval?: number;
  enabled?: boolean;
  onError?: (error: any) => void;
}

/**
 * Custom hook for polling data at regular intervals
 */
export const usePolling = <T,>(
  fetchFn: () => Promise<T>,
  options: UsePollingOptions = {}
): {
  data: T | null;
  loading: boolean;
  error: any;
  refresh: () => Promise<void>;
} => {
  const {
    interval = 5000, // Default 5 seconds
    enabled = true,
    onError,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<any>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  const fetchData = async () => {
    if (!isMountedRef.current) return;

    try {
      setLoading(true);
      setError(null);
      const result = await fetchFn();
      
      if (isMountedRef.current) {
        setData(result);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err);
        onError?.(err);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    isMountedRef.current = true;

    if (enabled) {
      // Fetch immediately
      fetchData();

      // Then set up polling
      intervalRef.current = setInterval(fetchData, interval);
    }

    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [interval, enabled]);

  return {
    data,
    loading,
    error,
    refresh: fetchData,
  };
};
