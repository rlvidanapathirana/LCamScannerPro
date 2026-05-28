/**
 * useScannedPages.js
 * In-memory page store — RAM only, zero persistence.
 * Each page: { id, dataUrl, filter, ocrText, annotations, label }
 */
import { useState, useCallback } from 'react';

let _idCounter = 0;
const newId = () => `page-${++_idCounter}-${Date.now()}`;

export function useScannedPages() {
  const [pages, setPages]             = useState([]);
  const [activePageId, setActivePageId] = useState(null);

  const activePage = pages.find(p => p.id === activePageId) || null;

  /** Add one or more items (strings or objects) as new pages */
  const addPages = useCallback((items, extra = {}) => {
    const newPages = (Array.isArray(items) ? items : [items]).map(item => {
      const isObj = typeof item === 'object';
      const url = isObj ? item.dataUrl : item;
      return {
        id:              newId(),
        dataUrl:         url,
        originalDataUrl: isObj ? (item.originalDataUrl || url) : (extra.originalDataUrl || url),
        cropCorners:     isObj ? (item.cropCorners || null) : (extra.cropCorners || null),
        filter:          isObj ? (item.filter || 'magicColor') : (extra.filter || 'original'),
        ocrText:         '',
        annotations:     [],
        label:           isObj ? (item.label || extra.label || '') : (extra.label || ''),
      };
    });
    setPages(prev => {
      const updated = [...prev, ...newPages];
      return updated;
    });
    // Auto-select last added
    setActivePageId(newPages[newPages.length - 1].id);
    return newPages.map(p => p.id);
  }, []);

  /** Replace a page's dataUrl (e.g. after annotation or filter bake) */
  const updatePage = useCallback((id, patch) => {
    setPages(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p));
  }, []);

  /** Remove a page by id */
  const removePage = useCallback((id) => {
    setPages(prev => {
      const next = prev.filter(p => p.id !== id);
      setActivePageId(ap => {
        if (ap === id) return next.length ? next[next.length - 1].id : null;
        return ap;
      });
      return next;
    });
  }, []);

  /** Reorder pages (drag-and-drop) */
  const reorderPages = useCallback((fromIdx, toIdx) => {
    setPages(prev => {
      const arr = [...prev];
      const [moved] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, moved);
      return arr;
    });
  }, []);

  /** Clear all pages */
  const clearAll = useCallback(() => {
    setPages([]);
    setActivePageId(null);
  }, []);

  /** Duplicate a page */
  const duplicatePage = useCallback((id) => {
    setPages(prev => {
      const idx = prev.findIndex(p => p.id === id);
      if (idx === -1) return prev;
      const copy = { ...prev[idx], id: newId() };
      const arr  = [...prev];
      arr.splice(idx + 1, 0, copy);
      setActivePageId(copy.id);
      return arr;
    });
  }, []);

  return {
    pages,
    activePage,
    activePageId,
    setActivePageId,
    addPages,
    updatePage,
    removePage,
    reorderPages,
    clearAll,
    duplicatePage,
  };
}
