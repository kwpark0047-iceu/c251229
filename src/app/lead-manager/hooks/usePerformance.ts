/**
 * 디바운스 훅
 * 검색 입력 성능 최적화
 */

import { useState, useEffect, useCallback } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * 쓰로틀 훅
 * 스크롤 이벤트 성능 최적화
 */

export function useThrottle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): T {
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const [lastExecTime, setLastExecTime] = useState<number>(0);

  return useCallback(
    ((...args: Parameters<T>) => {
      const currentTime = Date.now();

      if (currentTime - lastExecTime > delay) {
        func(...args);
        setLastExecTime(currentTime);
      } else {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        const newTimeoutId = setTimeout(() => {
          func(...args);
          setLastExecTime(Date.now());
        }, delay - (currentTime - lastExecTime));
        setTimeoutId(newTimeoutId);
      }
    }) as T,
    [func, delay, lastExecTime, timeoutId]
  );
}

/**
 * 메모이제이션 훅
 * 계산 비용이 높은 함수 결과 캐싱
 */

export function useMemoize<T extends (...args: any[]) => any>(
  func: T,
  getKey?: (...args: Parameters<T>) => string
): T {
  const cache = useRef<Map<string, ReturnType<T>>>(new Map());

  return useCallback(
    ((...args: Parameters<T>): ReturnType<T> => {
      const key = getKey ? getKey(...args) : JSON.stringify(args);
      
      if (cache.current.has(key)) {
        return cache.current.get(key)!;
      }

      const result = func(...args);
      cache.current.set(key, result);
      
      // 캐시 크기 제한 (100개)
      if (cache.current.size > 100) {
        const firstKey = cache.current.keys().next().value;
        cache.current.delete(firstKey);
      }

      return result;
    }) as T,
    [func, getKey]
  );
}

/**
 * 가상화 훅
 * 대용량 리스트 가상화
 */

export function useVirtualization<T>({
  items,
  itemHeight,
  containerHeight,
  overscan = 5,
}: {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}) {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );

    return { startIndex, endIndex };
  }, [scrollTop, itemHeight, containerHeight, overscan, items.length]);

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex + 1);
  }, [items, visibleRange]);

  const totalHeight = items.length * itemHeight;

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return {
    visibleItems,
    totalHeight,
    startIndex: visibleRange.startIndex,
    endIndex: visibleRange.endIndex,
    handleScroll,
  };
}

/**
 * 비동기 데이터 로딩 훅
 */

export function useAsyncData<T>(
  fetcher: () => Promise<T>,
  dependencies: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await fetcher();
        if (!cancelled) {
          setData(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err as Error);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, dependencies);

  return { data, loading, error, refetch: () => fetchData() };
}

/**
 * 배치 처리 훅
 * 대량 데이터 처리 시 성능 최적화
 */

export function useBatchProcessor<T>(
  processor: (batch: T[]) => Promise<void>,
  batchSize: number = 50,
  delay: number = 100
) {
  const [queue, setQueue] = useState<T[]>([]);
  const [processing, setProcessing] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const addToQueue = useCallback((item: T) => {
    setQueue(prev => [...prev, item]);
  }, []);

  useEffect(() => {
    if (queue.length >= batchSize || (queue.length > 0 && !processing)) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(async () => {
        if (queue.length === 0) return;

        setProcessing(true);
        const batch = queue.slice(0, batchSize);
        setQueue(prev => prev.slice(batchSize));

        try {
          await processor(batch);
        } catch (error) {
          console.error('Batch processing error:', error);
        } finally {
          setProcessing(false);
        }
      }, delay);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [queue, batchSize, delay, processing, processor]);

  return { addToQueue, processing, queueSize: queue.length };
}

/**
 * 메모리 관리 훅
 * 대용량 데이터 메모리 최적화
 */

export function useMemoryManagement<T>(
  data: T[],
  maxItems: number = 1000
) {
  const [visibleData, setVisibleData] = useState<T[]>([]);

  useEffect(() => {
    if (data.length <= maxItems) {
      setVisibleData(data);
    } else {
      // 가장 최근 데이터 유지
      setVisibleData(data.slice(-maxItems));
    }
  }, [data, maxItems]);

  return visibleData;
}

/**
 * 프리로딩 훅
 * 데이터 미리 로드
 */

export function usePreloader<T>(
  fetcher: (id: string) => Promise<T>,
  preloadIds: string[]
) {
  const [preloadedData, setPreloadedData] = useState<Map<string, T>>(new Map());
  const [preloading, setPreloading] = useState<Set<string>>(new Set());

  const preload = useCallback(async (id: string) => {
    if (preloadedData.has(id) || preloading.has(id)) {
      return;
    }

    setPreloading(prev => new Set(prev).add(id));

    try {
      const data = await fetcher(id);
      setPreloadedData(prev => new Map(prev).set(id, data));
    } catch (error) {
      console.error(`Preload failed for id ${id}:`, error);
    } finally {
      setPreloading(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  }, [fetcher, preloadedData, preloading]);

  useEffect(() => {
    preloadIds.forEach(id => {
      preload(id);
    });
  }, [preloadIds, preload]);

  const getPreloaded = useCallback((id: string) => {
    return preloadedData.get(id);
  }, [preloadedData]);

  return { getPreloaded, preload, isPreloading: (id: string) => preloading.has(id) };
}
