# Smart Infinite Scroll Implementation Guide

This document explains the improved infinite scroll implementation that provides better UX by:

1. ✅ **Loading 20 items initially** (configurable)
2. ✅ **Preloading next batch when user scrolls to 50%** (not at the bottom)
3. ✅ **Showing loader only at the bottom** (not covering content)
4. ✅ **Smooth, non-intrusive loading experience**

## Architecture

### Components

1. **`useSmartInfiniteScroll` Hook** (`frontend/src/hooks/useSmartInfiniteScroll.ts`)
   - Reusable hook that handles intersection observer logic
   - Triggers loading at configurable threshold (default 50%)
   - Returns trigger ref and loading state

2. **`InfiniteScrollLoader` Component** (`frontend/src/components/ui/InfiniteScrollLoader.tsx`)
   - Reusable bottom loader UI
   - Shows three states: loading, all loaded, ready to load
   - Customizable messages and styling

### How It Works

```
Items loaded: [1, 2, 3, ... 20]
                      ↑
                   Trigger at item 10 (50%)
                   When user scrolls here, load next 20

After loading: [1, 2, 3, ... 20, 21, 22, ... 40]
                                  ↑
                               New trigger at item 20 (50% of 40)
```

## Usage Example

### Basic Implementation

```tsx
import { useSmartInfiniteScroll } from '@/hooks/useSmartInfiniteScroll';
import { InfiniteScrollLoader } from '@/components/ui/InfiniteScrollLoader';

function MyList() {
  const [items, setItems] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Your data fetching logic
  const { data, loading, hasMore } = useYourDataHook({
    page: currentPage,
    limit: 20,
  });

  // Smart infinite scroll hook
  const { triggerRef, isLoadingMore, isTriggerItem } = useSmartInfiniteScroll({
    enabled: true,
    hasMore: hasMore,
    isLoading: loading,
    onLoadMore: () => setCurrentPage(prev => prev + 1),
    triggerThreshold: 0.5, // Load at 50% point
  });

  return (
    <div>
      {items.map((item, index) => {
        const shouldBeTrigger = isTriggerItem(index, items.length);
        
        return (
          <div 
            key={item.id}
            ref={shouldBeTrigger ? triggerRef : null}
          >
            {item.name}
          </div>
        );
      })}
      
      <InfiniteScrollLoader
        isLoading={isLoadingMore}
        hasMore={hasMore}
        itemCount={items.length}
        itemType="items"
      />
    </div>
  );
}
```

### Table Implementation (like ContactList)

```tsx
import { useSmartInfiniteScroll } from '@/hooks/useSmartInfiniteScroll';
import { InfiniteScrollLoader } from '@/components/ui/InfiniteScrollLoader';

function MyTable() {
  // ... your state and data fetching logic
  
  const { triggerRef, isLoadingMore, isTriggerItem } = useSmartInfiniteScroll({
    enabled: enableInfiniteScroll,
    hasMore: hasMore,
    isLoading: loading,
    onLoadMore: () => setCurrentPage(prev => prev + 1),
    triggerThreshold: 0.5,
  });

  return (
    <Table>
      <TableBody>
        {items.map((item, index) => {
          const shouldBeTrigger = isTriggerItem(index, items.length);
          
          return (
            <TableRow 
              key={item.id}
              ref={shouldBeTrigger ? (triggerRef as any) : null}
            >
              {/* Your table cells */}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
    
    <InfiniteScrollLoader
      isLoading={isLoadingMore}
      hasMore={hasMore}
      itemCount={items.length}
      itemType="records"
    />
  );
}
```

## Hook API

### `useSmartInfiniteScroll(options)`

**Options:**
- `enabled` (boolean): Whether infinite scroll is enabled. Default: `true`
- `hasMore` (boolean): Whether there are more items to load. **Required**
- `isLoading` (boolean): Whether data is currently loading. **Required**
- `onLoadMore` (function): Callback to load more data. **Required**
- `triggerThreshold` (number): Percentage (0-1) at which to trigger. Default: `0.5` (50%)
- `rootMargin` (string): IntersectionObserver root margin. Default: `'100px'`
- `intersectionThreshold` (number): IntersectionObserver threshold. Default: `0.1`

**Returns:**
- `triggerRef`: Ref to attach to the trigger element
- `isLoadingMore`: Boolean indicating if more data is loading
- `isTriggerItem(index, totalItems)`: Function to check if item should be trigger

## Component API

### `<InfiniteScrollLoader />`

**Props:**
- `isLoading` (boolean): Whether more data is being loaded. **Required**
- `hasMore` (boolean): Whether there are more items to load. **Required**
- `itemCount` (number): Total number of items currently loaded
- `itemType` (string): Item type name for messages. Default: `'items'`
- `loadingMessage` (string): Custom loading message
- `allLoadedMessage` (string): Custom all loaded message
- `isInitialLoad` (boolean): Whether this is the initial load. Default: `false`

## Configuration

### Adjusting the Trigger Point

Change when loading is triggered:

```tsx
// Load at 25% (earlier)
triggerThreshold: 0.25

// Load at 75% (later)
triggerThreshold: 0.75

// Load at 50% (recommended)
triggerThreshold: 0.5
```

### Adjusting Load Amount

Change the number of items loaded per batch:

```tsx
const ITEMS_PER_PAGE = 20; // Load 20 items at a time

// In your data fetching:
const contactsOptions = {
  limit: ITEMS_PER_PAGE,
  offset: (currentPage - 1) * ITEMS_PER_PAGE,
};
```

### Custom Loader Messages

```tsx
<InfiniteScrollLoader
  isLoading={isLoadingMore}
  hasMore={hasMore}
  itemCount={items.length}
  itemType="contacts"
  loadingMessage="Fetching more contacts..."
  allLoadedMessage="All contacts have been loaded"
/>
```

## Benefits

### User Experience
- ✅ **Seamless scrolling**: No jarring "loading" screens covering content
- ✅ **Predictive loading**: Next batch loads before user reaches the end
- ✅ **Visual feedback**: Clear, unobtrusive loader at bottom
- ✅ **Progress indicator**: Shows total items loaded

### Performance
- ✅ **Efficient loading**: Only loads when needed
- ✅ **Optimized batching**: Configurable batch sizes
- ✅ **Smart triggering**: Intersection Observer for minimal overhead

### Developer Experience
- ✅ **Reusable components**: Use in any list/table
- ✅ **Configurable**: Adjust thresholds and messages
- ✅ **Type-safe**: Full TypeScript support
- ✅ **Easy to integrate**: Drop-in replacement for existing pagination

## Migration from Old Infinite Scroll

### Before (Old Approach)
```tsx
// Loading triggered at bottom
// Loader covered whole screen
// Manual observer management
const observerTarget = useRef(null);
useEffect(() => {
  const observer = new IntersectionObserver(...);
  // Complex manual setup
}, []);
```

### After (New Approach)
```tsx
// Loading triggered at 50%
// Loader only at bottom
// Automated hook
const { triggerRef, isLoadingMore, isTriggerItem } = useSmartInfiniteScroll({
  hasMore,
  isLoading: loading,
  onLoadMore: () => setPage(p => p + 1),
});
```

## Testing

Test scenarios to verify:
1. ✅ Initial load shows 20 items
2. ✅ Scrolling to item 10 triggers next load
3. ✅ Loader appears only at bottom
4. ✅ No duplicate items loaded
5. ✅ "All loaded" message when no more items
6. ✅ Search resets scroll state
7. ✅ Filters work with infinite scroll

## Best Practices

1. **Set appropriate initial page size**: 20 items provides good balance
2. **Use 50% threshold**: Gives users smooth experience
3. **Show clear feedback**: Use the InfiniteScrollLoader component
4. **Handle edge cases**: Empty states, errors, no more items
5. **Reset on search/filter**: Clear accumulated items on new search
6. **Deduplicate items**: Check for existing IDs before appending

## Example: Contact List Implementation

See `frontend/src/components/contacts/ContactList.tsx` for a complete working example.

Key features:
- 20 items per page
- Triggers at 50% scroll point
- Bottom-only loader
- Search resets scroll
- Filter compatible
- Bulk selection support
