import { useEffect, useRef, useCallback } from 'react';

/**
 * Global trigger to notify all active views that data in DBMS has been updated.
 * Dispatches a lightweight custom browser event.
 * 
 * @param {string} topic - Optional topic identifier (e.g., 'evaluations', 'attendance', 'tasks')
 */
export function triggerDataSync(topic = 'general') {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('ncc:data-updated', {
        detail: { topic, timestamp: Date.now() },
      })
    );
  }
}

/**
 * useDataSync Hook
 * 
 * Establishes real-time synchronization between client actions and page data.
 * Whenever any component creates, updates, or deletes data in the database,
 * this hook automatically calls `onRefresh()` with micro-debouncing to keep the UI in sync.
 * 
 * @param {Function} onRefresh - Callback function to re-fetch or recompute local state
 * @param {Array} deps - Dependency array for the callback
 * @param {number} debounceMs - Debounce window in milliseconds (default: 80ms)
 */
export function useDataSync(onRefresh, deps = [], debounceMs = 80) {
  const timerRef = useRef(null);
  const callbackRef = useRef(onRefresh);

  useEffect(() => {
    callbackRef.current = onRefresh;
  }, [onRefresh]);

  const handleSyncEvent = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      if (typeof callbackRef.current === 'function') {
        callbackRef.current();
      }
    }, debounceMs);
  }, [debounceMs]);

  useEffect(() => {
    window.addEventListener('ncc:data-updated', handleSyncEvent);
    window.addEventListener('ncc:refresh-data', handleSyncEvent);

    return () => {
      window.removeEventListener('ncc:data-updated', handleSyncEvent);
      window.removeEventListener('ncc:refresh-data', handleSyncEvent);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [handleSyncEvent]);

  return { triggerSync: triggerDataSync };
}
