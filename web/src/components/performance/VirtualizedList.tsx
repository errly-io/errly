/**
 * High-Performance Virtualized List Component
 * 
 * Optimized for rendering large datasets with minimal memory footprint
 */

import React, {
  memo,
  useMemo,
  useCallback,
  useRef,
  CSSProperties,
} from 'react';
import { useVirtualScroll, useThrottle } from '@/lib/performance/hooks';
import { performanceMonitor } from '@/lib/performance/monitor';

export interface VirtualizedListProps<T> {
  items: T[];
  itemHeight: number;
  height: number;
  width?: number | string;
  renderItem: (item: T, index: number) => React.ReactNode;
  getItemKey?: (item: T, index: number) => string | number;
  overscan?: number;
  className?: string;
  onScroll?: (scrollTop: number) => void;
  loadMore?: () => void;
  hasMore?: boolean;
  loading?: boolean;
  emptyComponent?: React.ReactNode;
  loadingComponent?: React.ReactNode;
}

function VirtualizedListComponent<T>({
  items,
  itemHeight,
  height,
  width = '100%',
  renderItem,
  getItemKey = (_, index) => index,
  overscan = 5,
  className = '',
  onScroll,
  loadMore,
  hasMore = false,
  loading = false,
  emptyComponent,
  loadingComponent,
}: VirtualizedListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const _scrollElementRef = useRef<HTMLDivElement>(null);
  const renderCountRef = useRef(0);

  const {
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll: virtualScroll,
    visibleRange,
  } = useVirtualScroll({
    items,
    itemHeight,
    containerHeight: height,
    overscan,
  });

  // Throttled scroll handler
  const handleScroll = useThrottle(
    useCallback((event: React.UIEvent<HTMLDivElement>) => {
      virtualScroll(event);
      onScroll?.(event.currentTarget.scrollTop);
      
      // Check if we need to load more items
      if (loadMore && hasMore && !loading) {
        const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
        const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;
        
        if (scrollPercentage > 0.8) { // Load more when 80% scrolled
          loadMore();
        }
      }
    }, [virtualScroll, onScroll, loadMore, hasMore, loading]),
    16 // ~60fps
  );

  // Memoized visible items with performance tracking
  const renderedItems = useMemo(() => {
    const startTime = performance.now();
    renderCountRef.current++;
    
    const items = visibleItems.map((item, index) => {
      const actualIndex = visibleRange.startIndex + index;
      const key = getItemKey(item, actualIndex);
      
      return (
        <div
          key={key}
          style={{
            position: 'absolute',
            top: actualIndex * itemHeight,
            left: 0,
            right: 0,
            height: itemHeight,
          }}
        >
          {renderItem(item, actualIndex)}
        </div>
      );
    });
    
    // Record render performance
    performanceMonitor.recordMetric({
      name: 'virtualized-list-render',
      value: performance.now() - startTime,
      unit: 'ms',
      timestamp: Date.now(),
      category: 'render',
      tags: {
        itemCount: visibleItems.length.toString(),
        totalItems: items.length.toString(),
        renderCount: renderCountRef.current.toString(),
      },
    });
    
    return items;
  }, [visibleItems, visibleRange.startIndex, itemHeight, getItemKey, renderItem]);

  // Container styles
  const containerStyle: CSSProperties = {
    height,
    width,
    overflow: 'auto',
    position: 'relative',
  };

  const innerStyle: CSSProperties = {
    height: totalHeight,
    position: 'relative',
  };

  const viewportStyle: CSSProperties = {
    transform: `translateY(${offsetY}px)`,
    position: 'relative',
  };

  // Empty state
  if (items.length === 0 && !loading) {
    return (
      <div style={containerStyle} className={`virtualized-list ${className}`}>
        {emptyComponent || (
          <div className="virtualized-list-empty">
            <p>No items to display</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={containerStyle}
      className={`virtualized-list ${className}`}
      onScroll={handleScroll}
    >
      <div style={innerStyle}>
        <div style={viewportStyle}>
          {renderedItems}
        </div>
        
        {/* Loading indicator */}
        {loading && (
          <div 
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 50,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {loadingComponent || (
              <div className="virtualized-list-loading">
                <div className="spinner" />
                <span>Loading more...</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Memoized component to prevent unnecessary re-renders
export const VirtualizedList = memo(VirtualizedListComponent) as <T>(
  props: VirtualizedListProps<T>
) => React.ReactElement;

// Grid virtualization component
export interface VirtualizedGridProps<T> {
  items: T[];
  itemWidth: number;
  itemHeight: number;
  height: number;
  width: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  getItemKey?: (item: T, index: number) => string | number;
  gap?: number;
  className?: string;
}

function VirtualizedGridComponent<T>({
  items,
  itemWidth,
  itemHeight,
  height,
  width,
  renderItem,
  getItemKey = (_, index) => index,
  gap = 0,
  className = '',
}: VirtualizedGridProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Calculate grid dimensions
  const columnsPerRow = Math.floor((width + gap) / (itemWidth + gap));
  const rowCount = Math.ceil(items.length / columnsPerRow);
  const totalHeight = rowCount * (itemHeight + gap) - gap;
  
  const [scrollTop, setScrollTop] = React.useState(0);
  
  // Calculate visible range
  const { startRow, endRow: _endRow, visibleItems } = useMemo(() => {
    const startRow = Math.max(0, Math.floor(scrollTop / (itemHeight + gap)) - 1);
    const endRow = Math.min(
      rowCount - 1,
      Math.ceil((scrollTop + height) / (itemHeight + gap)) + 1
    );
    
    const startIndex = startRow * columnsPerRow;
    const endIndex = Math.min(items.length - 1, (endRow + 1) * columnsPerRow - 1);
    
    const visibleItems = items.slice(startIndex, endIndex + 1);
    
    return { startRow, endRow, visibleItems };
  }, [scrollTop, itemHeight, gap, height, rowCount, columnsPerRow, items]);
  
  const handleScroll = useThrottle((event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, 16);
  
  // Render visible items
  const renderedItems = useMemo(() => {
    return visibleItems.map((item, index) => {
      const actualIndex = startRow * columnsPerRow + index;
      const row = Math.floor(actualIndex / columnsPerRow);
      const col = actualIndex % columnsPerRow;
      const key = getItemKey(item, actualIndex);
      
      return (
        <div
          key={key}
          style={{
            position: 'absolute',
            left: col * (itemWidth + gap),
            top: row * (itemHeight + gap),
            width: itemWidth,
            height: itemHeight,
          }}
        >
          {renderItem(item, actualIndex)}
        </div>
      );
    });
  }, [visibleItems, startRow, columnsPerRow, itemWidth, itemHeight, gap, getItemKey, renderItem]);
  
  return (
    <div
      ref={containerRef}
      style={{
        height,
        width,
        overflow: 'auto',
        position: 'relative',
      }}
      className={`virtualized-grid ${className}`}
      onScroll={handleScroll}
    >
      <div
        style={{
          height: totalHeight,
          position: 'relative',
        }}
      >
        {renderedItems}
      </div>
    </div>
  );
}

export const VirtualizedGrid = memo(VirtualizedGridComponent) as <T>(
  props: VirtualizedGridProps<T>
) => React.ReactElement;

// Performance-optimized table component
export interface VirtualizedTableProps<T> {
  data: T[];
  columns: Array<{
    key: keyof T;
    header: string;
    width?: number;
    render?: (value: T[keyof T], item: T, index: number) => React.ReactNode;
  }>;
  rowHeight: number;
  height: number;
  width?: number | string;
  className?: string;
  onRowClick?: (item: T, index: number) => void;
  sortBy?: keyof T;
  sortDirection?: 'asc' | 'desc';
  onSort?: (column: keyof T) => void;
}

function VirtualizedTableComponent<T extends Record<string, unknown>>({
  data,
  columns,
  rowHeight,
  height,
  width = '100%',
  className = '',
  onRowClick,
  sortBy,
  sortDirection,
  onSort,
}: VirtualizedTableProps<T>) {
  const headerHeight = 40;
  const listHeight = height - headerHeight;
  
  const renderRow = useCallback((item: T, index: number) => {
    return (
      <div
        className={`virtualized-table-row ${onRowClick ? 'clickable' : ''}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          height: rowHeight,
          borderBottom: '1px solid #eee',
          cursor: onRowClick ? 'pointer' : 'default',
        }}
        onClick={() => onRowClick?.(item, index)}
      >
        {columns.map((column, _colIndex) => (
          <div
            key={String(column.key)}
            style={{
              flex: column.width ? `0 0 ${column.width}px` : 1,
              padding: '0 8px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {column.render 
              ? column.render(item[column.key], item, index)
              : String(item[column.key] || '')
            }
          </div>
        ))}
      </div>
    );
  }, [columns, rowHeight, onRowClick]);
  
  return (
    <div className={`virtualized-table ${className}`} style={{ width }}>
      {/* Header */}
      <div
        className="virtualized-table-header"
        style={{
          display: 'flex',
          height: headerHeight,
          backgroundColor: '#f5f5f5',
          borderBottom: '2px solid #ddd',
          fontWeight: 'bold',
        }}
      >
        {columns.map((column) => (
          <div
            key={String(column.key)}
            style={{
              flex: column.width ? `0 0 ${column.width}px` : 1,
              padding: '0 8px',
              display: 'flex',
              alignItems: 'center',
              cursor: onSort ? 'pointer' : 'default',
            }}
            onClick={() => onSort?.(column.key)}
          >
            {column.header}
            {sortBy === column.key && (
              <span style={{ marginLeft: 4 }}>
                {sortDirection === 'asc' ? '↑' : '↓'}
              </span>
            )}
          </div>
        ))}
      </div>
      
      {/* Virtualized rows */}
      <VirtualizedList
        items={data}
        itemHeight={rowHeight}
        height={listHeight}
        renderItem={renderRow}
        getItemKey={(item, index) => `row-${index}`}
      />
    </div>
  );
}

export const VirtualizedTable = memo(VirtualizedTableComponent) as <T extends Record<string, unknown>>(
  props: VirtualizedTableProps<T>
) => React.ReactElement;
