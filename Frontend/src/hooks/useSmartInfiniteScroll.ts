import { useState, useEffect, useRef, useCallback } from 'react';

interface UseSmartInfiniteScrollOptions {
  /**
   * Whether infinite scroll is enabled
   */
  enabled?: boolean;
  
  /**
   * Whether there are more items to load
   */
  hasMore: boolean;
  
  /**
   * Whether data is currently loading
   */
  isLoading: boolean;
  
  /**
   * Callback to load more data
   */
  onLoadMore: () => void;
  
  /**
   * Threshold percentage (0-1) at which to trigger loading
   * @default 0.5 (50%)
   */
  triggerThreshold?: number;
  
  /**
   * Root margin for IntersectionObserver
   * @default '100px'
   */
  rootMargin?: string;
  
  /**
   * Intersection threshold for IntersectionObserver
   * @default 0.1
   */
  intersectionThreshold?: number;
}

interface UseSmartInfiniteScrollReturn {
  /**
   * Ref to attach to the trigger element (the row/item at threshold point)
   */
  triggerRef: React.RefObject<HTMLElement>;
  
  /**
   * Whether more data is currently being loaded
   */
  isLoadingMore: boolean;
  
  /**
   * Calculate if an item at given index should be the trigger
   */
  isTriggerItem: (index: number, totalItems: number) => boolean;
}

/**
 * Smart infinite scroll hook that triggers loading at a specific threshold
 * instead of at the end of the list. This provides better UX by preloading
 * data before the user reaches the bottom.
 * 
 * @example
 * ```tsx
 * const { triggerRef, isLoadingMore, isTriggerItem } = useSmartInfiniteScroll({
 *   enabled: true,
 *   hasMore: hasNextPage,
 *   isLoading: loading,
 *   onLoadMore: () => setPage(p => p + 1),
 *   triggerThreshold: 0.5, // Load when user scrolls to 50% of loaded items
 * });
 * 
 * // In your render:
 * items.map((item, index) => (
 *   <div ref={isTriggerItem(index, items.length) ? triggerRef : null}>
 *     {item.name}
 *   </div>
 * ))
 * ```
 */
export const useSmartInfiniteScroll = ({
  enabled = true,
  hasMore,
  isLoading,
  onLoadMore,
  triggerThreshold = 0.5,
  rootMargin = '100px',
  intersectionThreshold = 0.1,
}: UseSmartInfiniteScrollOptions): UseSmartInfiniteScrollReturn => {
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const triggerRef = useRef<HTMLElement>(null);
  
  // Reset loading state when new data arrives
  useEffect(() => {
    if (!isLoading) {
      setIsLoadingMore(false);
    }
  }, [isLoading]);

  // Intersection observer callback
  const handleIntersection = useCallback((entries: IntersectionObserverEntry[]) => {
    const [target] = entries;
    
    if (target.isIntersecting && hasMore && !isLoading && !isLoadingMore && enabled) {
      console.log('🔄 Smart infinite scroll triggered - Loading next batch...');
      setIsLoadingMore(true);
      onLoadMore();
    }
  }, [hasMore, isLoading, isLoadingMore, enabled, onLoadMore]);

  // Set up IntersectionObserver
  useEffect(() => {
    if (!enabled) return;
    
    const element = triggerRef.current;
    const options: IntersectionObserverInit = {
      threshold: intersectionThreshold,
      rootMargin,
    };
    
    const observer = new IntersectionObserver(handleIntersection, options);
    
    if (element) {
      observer.observe(element);
    }
    
    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [handleIntersection, enabled, intersectionThreshold, rootMargin]);

  // Calculate if an item should be the trigger based on threshold
  const isTriggerItem = useCallback((index: number, totalItems: number): boolean => {
    if (!enabled || !hasMore || totalItems === 0) return false;
    
    const triggerIndex = Math.floor(totalItems * triggerThreshold);
    return index === triggerIndex;
  }, [enabled, hasMore, triggerThreshold]);

  return {
    triggerRef: triggerRef as React.RefObject<HTMLElement>,
    isLoadingMore,
    isTriggerItem,
  };
};
