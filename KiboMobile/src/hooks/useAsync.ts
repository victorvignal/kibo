import { useState, useEffect, useCallback, useRef } from 'react';

interface AsyncState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
}

interface UseAsyncOptions<T> {
  /** Call the function immediately on mount */
  immediate?: boolean;
  /** Function to call */
  asyncFn: () => Promise<T>;
  /** Dependencies that trigger a refetch */
  deps?: unknown[];
}

/**
 * useAsync - hook for handling async operations with loading/error states.
 *
 * Usage:
 * const { data, isLoading, error, refetch } = useAsync({
 *   asyncFn: async () => fetchUser(userId),
 *   deps: [userId],
 * });
 */
export function useAsync<T>({
  immediate = true,
  asyncFn,
  deps = [],
}: UseAsyncOptions<T>) {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    isLoading: immediate,
    error: null,
  });

  const mountedRef = useRef(true);
  const fnRef = useRef(asyncFn);
  fnRef.current = asyncFn;

  const execute = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const result = await fnRef.current();
      if (mountedRef.current) {
        setState({ data: result, isLoading: false, error: null });
      }
    } catch (err) {
      if (mountedRef.current) {
        const message = err instanceof Error ? err.message : 'Erro desconhecido';
        setState({ data: null, isLoading: false, error: message });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    mountedRef.current = true;
    if (immediate) {
      execute();
    }
    return () => {
      mountedRef.current = false;
    };
  }, [immediate, execute]);

  return {
    ...state,
    refetch: execute,
  };
}
