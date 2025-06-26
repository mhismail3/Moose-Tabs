import React, { createContext, useContext, useState, useCallback } from 'react';

// Context for managing global drop zone state
const DropZoneContext = createContext();

export function DropZoneProvider({ children }) {
  // Global state for the currently active drop target
  const [activeDropTarget, setActiveDropTarget] = useState(null);

  // Set active drop target with priority system (deeper levels take priority)
  const setDropTarget = useCallback((tabId, level, dropZoneType, canDrop, showInvalid = false) => {
    setActiveDropTarget(prev => {
      // If no previous target, set this one
      if (!prev) {
        return { tabId, level, dropZoneType, canDrop, showInvalid };
      }
      
      // If same tab, update the state
      if (prev.tabId === tabId) {
        return { tabId, level, dropZoneType, canDrop, showInvalid };
      }
      
      // Priority system: deeper levels (higher numbers) take priority
      // This ensures child tabs override parent tabs
      if (level >= prev.level) {
        return { tabId, level, dropZoneType, canDrop, showInvalid };
      }
      
      // Keep previous target if it has higher priority
      return prev;
    });
  }, []);

  // Clear drop target (only if it's the current active one)
  const clearDropTarget = useCallback((tabId) => {
    setActiveDropTarget(prev => {
      if (prev && prev.tabId === tabId) {
        return null;
      }
      return prev;
    });
  }, []);

  // Force clear all drop targets (for drag end)
  const clearAllDropTargets = useCallback(() => {
    setActiveDropTarget(null);
  }, []);

  // Check if a specific tab is the active drop target
  const isActiveDropTarget = useCallback((tabId) => {
    return activeDropTarget && activeDropTarget.tabId === tabId;
  }, [activeDropTarget]);

  // Get drop target info for a specific tab
  const getDropTargetInfo = useCallback((tabId) => {
    if (activeDropTarget && activeDropTarget.tabId === tabId) {
      return activeDropTarget;
    }
    return null;
  }, [activeDropTarget]);

  const value = {
    activeDropTarget,
    setDropTarget,
    clearDropTarget,
    clearAllDropTargets,
    isActiveDropTarget,
    getDropTargetInfo
  };

  return (
    <DropZoneContext.Provider value={value}>
      {children}
    </DropZoneContext.Provider>
  );
}

export function useDropZone() {
  const context = useContext(DropZoneContext);
  if (!context) {
    throw new Error('useDropZone must be used within a DropZoneProvider');
  }
  return context;
}