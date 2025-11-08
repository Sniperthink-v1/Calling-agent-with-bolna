import React from 'react';
import { Loader2 } from 'lucide-react';

interface InfiniteScrollLoaderProps {
  /**
   * Whether more data is being loaded
   */
  isLoading: boolean;
  
  /**
   * Whether there are more items to load
   */
  hasMore: boolean;
  
  /**
   * Total number of items currently loaded
   */
  itemCount?: number;
  
  /**
   * Custom loading message
   */
  loadingMessage?: string;
  
  /**
   * Custom all loaded message
   */
  allLoadedMessage?: string;
  
  /**
   * Whether to show initial loading state (when no items are loaded yet)
   */
  isInitialLoad?: boolean;
  
  /**
   * Item type name for messages (e.g., "contacts", "campaigns")
   */
  itemType?: string;
}

/**
 * Bottom loader component for infinite scroll that only shows at the bottom
 * of the list without covering the loaded content.
 * 
 * Shows three states:
 * 1. Loading more: spinner with message
 * 2. All loaded: success message with count
 * 3. Ready to load: subtle hint to scroll
 */
export const InfiniteScrollLoader: React.FC<InfiniteScrollLoaderProps> = ({
  isLoading,
  hasMore,
  itemCount,
  loadingMessage,
  allLoadedMessage,
  isInitialLoad = false,
  itemType = 'items',
}) => {
  // Don't show loader during initial load
  if (isInitialLoad) {
    return null;
  }

  // Loading more state
  if (isLoading && hasMore) {
    return (
      <div className="border-t border-gray-100">
        <div className="flex items-center justify-center gap-2 py-4 bg-gray-50/50">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span className="text-sm text-gray-600 font-medium">
            {loadingMessage || `Loading more ${itemType}...`}
          </span>
        </div>
      </div>
    );
  }

  // All items loaded state
  if (!hasMore && itemCount && itemCount > 0) {
    return (
      <div className="border-t border-gray-100">
        <div className="text-center py-4 bg-gray-50/30">
          <p className="text-sm text-gray-500">
            {allLoadedMessage || (
              <>
                ✓ All {itemCount} {itemType} loaded
              </>
            )}
          </p>
        </div>
      </div>
    );
  }

  // Ready to load more state
  if (hasMore && !isLoading && itemCount && itemCount > 0) {
    return (
      <div className="border-t border-gray-100">
        <div className="text-center py-3">
          <p className="text-xs text-gray-400">
            Scroll to load more...
          </p>
        </div>
      </div>
    );
  }

  return null;
};
