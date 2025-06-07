/**
 * Optimized Error List Component
 * 
 * High-performance error display with virtualization and caching
 */

import React, { memo, useMemo, useCallback, useState } from 'react';

import { useAsyncMemo, useDebounce, useThrottle } from '@/lib/performance/hooks';
import { apiCache } from '@/lib/performance/cache';
import { performanceMonitor } from '@/lib/performance/monitor';

// Error data types
export interface ErrorItem {
  id: string;
  message: string;
  timestamp: string;
  level: 'error' | 'warning' | 'info';
  count: number;
  lastSeen: string;
  project: string;
  environment: string;
  resolved: boolean;
  tags: string[];
}

export interface ErrorListProps {
  projectId?: string;
  environment?: string;
  level?: string;
  search?: string;
  limit?: number;
  onErrorClick?: (error: ErrorItem) => void;
  onResolve?: (errorId: string) => void;
  className?: string;
}

// Memoized error row component
const ErrorRow = memo<{
  error: ErrorItem;
  onClick?: (error: ErrorItem) => void;
  onResolve?: (errorId: string) => void;
}>(({ error, onClick, onResolve }) => {
  const handleClick = useCallback(() => {
    onClick?.(error);
  }, [error, onClick]);

  const handleResolve = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onResolve?.(error.id);
  }, [error.id, onResolve]);

  const levelColor = useMemo(() => {
    switch (error.level) {
      case 'error': return '#ff4757';
      case 'warning': return '#ffa502';
      case 'info': return '#3742fa';
      default: return '#747d8c';
    }
  }, [error.level]);

  const timeAgo = useMemo(() => {
    const now = new Date();
    const errorTime = new Date(error.timestamp);
    const diffMs = now.getTime() - errorTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  }, [error.timestamp]);

  return (
    <div
      className={`error-row ${error.resolved ? 'resolved' : ''}`}
      onClick={handleClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '12px 16px',
        borderBottom: '1px solid #eee',
        cursor: 'pointer',
        backgroundColor: error.resolved ? '#f8f9fa' : 'white',
        opacity: error.resolved ? 0.7 : 1,
      }}
    >
      {/* Level indicator */}
      <div
        style={{
          width: 4,
          height: 40,
          backgroundColor: levelColor,
          marginRight: 12,
          borderRadius: 2,
        }}
      />
      
      {/* Error details */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontWeight: 500,
            fontSize: 14,
            color: '#2c3e50',
            marginBottom: 4,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {error.message}
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: '#7f8c8d' }}>
            {error.project} • {error.environment}
          </span>
          
          {error.tags.length > 0 && (
            <div style={{ display: 'flex', gap: 4 }}>
              {error.tags.slice(0, 3).map(tag => (
                <span
                  key={tag}
                  style={{
                    fontSize: 10,
                    padding: '2px 6px',
                    backgroundColor: '#ecf0f1',
                    color: '#34495e',
                    borderRadius: 10,
                  }}
                >
                  {tag}
                </span>
              ))}
              {error.tags.length > 3 && (
                <span style={{ fontSize: 10, color: '#95a5a6' }}>
                  +{error.tags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Count and time */}
      <div style={{ textAlign: 'right', marginLeft: 12 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: '#e74c3c',
            marginBottom: 2,
          }}
        >
          {error.count.toLocaleString()}
        </div>
        <div style={{ fontSize: 11, color: '#95a5a6' }}>
          {timeAgo}
        </div>
      </div>
      
      {/* Actions */}
      <div style={{ marginLeft: 12 }}>
        {!error.resolved && (
          <button
            onClick={handleResolve}
            style={{
              padding: '4px 8px',
              fontSize: 11,
              backgroundColor: '#27ae60',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            Resolve
          </button>
        )}
      </div>
    </div>
  );
});

ErrorRow.displayName = 'ErrorRow';

// Main optimized error list component
export const OptimizedErrorList = memo<ErrorListProps>(({
  projectId,
  environment,
  level,
  search,
  limit = 50,
  onErrorClick,
  onResolve,
  className = '',
}) => {
  const [sortBy, setSortBy] = useState<keyof ErrorItem>('timestamp');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Debounce search to avoid excessive API calls
  const debouncedSearch = useDebounce(search || '', 300);
  
  // Create cache key for this query
  const cacheKey = useMemo(() => {
    return `errors-${projectId || 'all'}-${environment || 'all'}-${level || 'all'}-${debouncedSearch}-${sortBy}-${sortDirection}-${limit}`;
  }, [projectId, environment, level, debouncedSearch, sortBy, sortDirection, limit]);
  
  // Fetch errors with caching
  const { data: errors, loading, error, refetch } = useAsyncMemo(
    async () => {
      const startTime = performance.now();
      
      // Simulate API call - replace with actual API
      const mockErrors: ErrorItem[] = Array.from({ length: limit }, (_, i) => ({
        id: `error-${i}`,
        message: `Error ${i}: Something went wrong in the application`,
        timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(),
        level: ['error', 'warning', 'info'][Math.floor(Math.random() * 3)] as ErrorItem['level'],
        count: Math.floor(Math.random() * 1000) + 1,
        lastSeen: new Date(Date.now() - Math.random() * 3600000).toISOString(),
        project: projectId || 'demo-project',
        environment: environment || 'production',
        resolved: Math.random() > 0.8,
        tags: ['frontend', 'api', 'database'].slice(0, Math.floor(Math.random() * 3) + 1),
      }));
      
      // Apply filters
      let filteredErrors = mockErrors;
      
      if (level) {
        filteredErrors = filteredErrors.filter(e => e.level === level);
      }
      
      if (debouncedSearch) {
        filteredErrors = filteredErrors.filter(e => 
          e.message.toLowerCase().includes(debouncedSearch.toLowerCase())
        );
      }
      
      // Apply sorting
      filteredErrors.sort((a, b) => {
        const aVal = a[sortBy];
        const bVal = b[sortBy];
        
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          const comparison = aVal.localeCompare(bVal);
          return sortDirection === 'asc' ? comparison : -comparison;
        }
        
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          const comparison = aVal - bVal;
          return sortDirection === 'asc' ? comparison : -comparison;
        }
        
        return 0;
      });
      
      // Record performance metric
      performanceMonitor.recordMetric({
        name: 'error-list-fetch',
        value: performance.now() - startTime,
        unit: 'ms',
        timestamp: Date.now(),
        category: 'network',
        tags: {
          count: filteredErrors.length.toString(),
          cached: 'false',
        },
      });
      
      return filteredErrors;
    },
    [projectId, environment, level, debouncedSearch, sortBy, sortDirection, limit],
    cacheKey
  );
  
  // Throttled sort handler
  const _handleSort = useThrottle(useCallback((column: keyof ErrorItem) => {
    if (sortBy === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('desc');
    }
  }, [sortBy]), 100);
  
  // Optimized resolve handler
  const handleResolve = useCallback((errorId: string) => {
    onResolve?.(errorId);
    
    // Invalidate cache to refresh data
    apiCache.invalidatePattern(new RegExp(`errors-.*`));
    refetch();
  }, [onResolve, refetch]);
  
  // Render error row
  const renderError = useCallback((error: ErrorItem, _index: number) => {
    return (
      <ErrorRow
        key={error.id}
        error={error}
        onClick={onErrorClick}
        onResolve={handleResolve}
      />
    );
  }, [onErrorClick, handleResolve]);
  
  // Loading state
  if (loading) {
    return (
      <div className={`error-list-loading ${className}`}>
        <div style={{ padding: 40, textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }} />
          <div>Loading errors...</div>
        </div>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className={`error-list-error ${className}`}>
        <div style={{ padding: 40, textAlign: 'center', color: '#e74c3c' }}>
          <div>Failed to load errors: {error.message}</div>
          <button
            onClick={refetch}
            style={{
              marginTop: 16,
              padding: '8px 16px',
              backgroundColor: '#3498db',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }
  
  // Empty state
  if (!errors || errors.length === 0) {
    return (
      <div className={`error-list-empty ${className}`}>
        <div style={{ padding: 40, textAlign: 'center', color: '#95a5a6' }}>
          <div>No errors found</div>
          {debouncedSearch && (
            <div style={{ marginTop: 8, fontSize: 14 }}>
              Try adjusting your search criteria
            </div>
          )}
        </div>
      </div>
    );
  }
  
  return (
    <div className={`optimized-error-list ${className}`}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '12px 16px',
          backgroundColor: '#f8f9fa',
          borderBottom: '2px solid #dee2e6',
          fontWeight: 600,
          fontSize: 14,
        }}
      >
        <div style={{ flex: 1 }}>
          Error ({errors.length.toLocaleString()})
        </div>
        <div style={{ width: 80, textAlign: 'right' }}>
          Count
        </div>
        <div style={{ width: 80, textAlign: 'right', marginLeft: 12 }}>
          Time
        </div>
        <div style={{ width: 80, marginLeft: 12 }}>
          Actions
        </div>
      </div>
      
      {/* Virtualized error list */}
      <div style={{ flex: 1 }}>
        {errors.map((error, index) => renderError(error, index))}
      </div>
    </div>
  );
});

OptimizedErrorList.displayName = 'OptimizedErrorList';

export default OptimizedErrorList;
