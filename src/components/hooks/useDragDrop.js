import { useDrag, useDrop } from 'react-dnd';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTabAnimations } from './useTabAnimations';
import { useDropZone } from '../context/DropZoneContext';

/**
 * Optimized drag and drop hook
 * Key optimizations:
 * - Uses local data instead of fetching from background
 * - Batches tab moves using chrome.tabs.move with arrays
 * - Minimizes async operations and message passing
 * - Skips redundant hierarchy refreshes
 */
export function useDragDrop(tab, hasChildren, onTabMove, allTabsInWindow = null, level = 0) {
  const [dropCompleted, setDropCompleted] = useState(false);
  const [dropZoneType, setDropZoneType] = useState(null);
  const dropTargetRef = useRef(null);
  const { startAnimation } = useTabAnimations();
  
  const { 
    setDropTarget, 
    clearDropTarget, 
    clearAllDropTargets, 
    isActiveDropTarget, 
    getDropTargetInfo 
  } = useDropZone();

  // Build a map of tab IDs to their data for O(1) lookups
  const tabIndexMap = useMemo(() => {
    if (!allTabsInWindow) return new Map();
    return new Map(allTabsInWindow.map(t => [t.id, t]));
  }, [allTabsInWindow]);

  // Calculate drop zone type based on mouse position
  const calculateDropZoneType = useCallback((clientX, targetElement) => {
    if (!targetElement) return null;
    const rect = targetElement.getBoundingClientRect();
    const relativeX = clientX - rect.left;
    return relativeX < rect.width * 0.6 ? 'sibling' : 'child';
  }, []);

  // Synchronous pinned tab validation using local data
  const isValidPinnedTabDropSync = useCallback((draggedTabId, targetTabId) => {
    if (!tabIndexMap.size) return true;
    
    const draggedTab = tabIndexMap.get(draggedTabId);
    const targetTab = tabIndexMap.get(targetTabId);
    if (!draggedTab || !targetTab) return false;
    
    if (draggedTab.pinned) {
      return targetTab.pinned;
    } else if (targetTab.pinned) {
      // Find last pinned tab
      let lastPinnedId = null;
      let lastPinnedIndex = -1;
      tabIndexMap.forEach((t, id) => {
        if (t.pinned && t.index > lastPinnedIndex) {
          lastPinnedIndex = t.index;
          lastPinnedId = id;
        }
      });
      return targetTabId === lastPinnedId;
    }
    return true;
  }, [tabIndexMap]);

  // Get all descendant tab IDs from local hierarchy data (synchronous)
  // Uses depth-first traversal to maintain hierarchy order
  // CRITICAL: This order is preserved when moving tabs - DO NOT SORT BY INDEX
  const getDescendantIds = useCallback((parentTab) => {
    const ids = [];
    const traverse = (t) => {
      if (t.children && Array.isArray(t.children)) {
        for (const child of t.children) {
          if (child && typeof child.id === 'number') {
            ids.push(child.id);
            traverse(child);
          }
        }
      }
    };
    traverse(parentTab);
    return ids;
  }, []);

  // Find a tab in the local hierarchy - searches through tree structure
  // Note: allTabsInWindow is flattened but each tab still has its children property
  const findTabInHierarchy = useCallback((tabList, searchId) => {
    if (!tabList || !Array.isArray(tabList)) return null;
    
    for (const t of tabList) {
      if (!t) continue;
      if (t.id === searchId) {
        // Found it - return the tab with its children intact
        return t;
      }
      // Also search in children (in case we're given a hierarchical list)
      if (t.children && Array.isArray(t.children) && t.children.length > 0) {
        const found = findTabInHierarchy(t.children, searchId);
        if (found) return found;
      }
    }
    return null;
  }, []);

  // Check circular dependency using local data (synchronous)
  // Must find the DRAGGED tab in the hierarchy to get its descendants
  const wouldCreateCircularDependency = useCallback((draggedTabId, targetTabId) => {
    if (draggedTabId === targetTabId) return true;
    
    // Find the dragged tab in the full hierarchy to get its descendants
    const draggedTab = findTabInHierarchy(allTabsInWindow || [], draggedTabId);
    if (!draggedTab) return false;
    
    // Check if target is a descendant of the dragged tab
    const descendantIds = getDescendantIds(draggedTab);
    return descendantIds.includes(targetTabId);
  }, [allTabsInWindow, findTabInHierarchy, getDescendantIds]);

  // Robust tab move handler - sends to background for atomic operation with fresh Chrome data
  // Key principle: The hierarchy order from descendantIds is the SOURCE OF TRUTH
  const handleTabMove = useCallback((draggedTabId, targetTab, position = 'sibling') => {
    // Validate inputs
    if (!draggedTabId || !targetTab || !targetTab.id) {
      console.error('Invalid move parameters:', { draggedTabId, targetTab });
      return;
    }
    
    if (wouldCreateCircularDependency(draggedTabId, targetTab.id)) {
      console.log('Prevented circular dependency');
      return;
    }

    // Get descendant IDs from local hierarchy
    // CRITICAL: This must use hierarchy order (depth-first), NOT Chrome index order
    // The background script will preserve this order when moving tabs
    const draggedWithHierarchy = findTabInHierarchy(allTabsInWindow || [], draggedTabId) || 
                                  { id: draggedTabId, children: [] };
    const descendantIds = getDescendantIds(draggedWithHierarchy);
    
    // DEBUG: Log complete information about the move
    console.log('========== FRONTEND MOVE REQUEST ==========');
    console.log('Dragged tab:', draggedTabId);
    console.log('Dragged tab found in hierarchy:', draggedWithHierarchy ? 'YES' : 'NO');
    if (draggedWithHierarchy) {
      console.log('Dragged tab children:', draggedWithHierarchy.children?.map(c => c.id));
    }
    console.log('Target tab:', targetTab.id, 'at index', targetTab.index);
    console.log('Position:', position);
    console.log('Descendant IDs (hierarchy order):', descendantIds);
    console.log('===========================================');

    // Send to background for atomic move operation
    // Background will use fresh Chrome data for index calculations
    // but will preserve the hierarchy order we send
    chrome.runtime.sendMessage({
      action: 'moveTabsWithHierarchy',
      draggedTabId,
      targetTabId: targetTab.id,
      position,
      descendantIds
    }).catch(err => console.error('Move message failed:', err));

    // Trigger animations immediately (non-blocking)
    const draggedInfo = tabIndexMap.get(draggedTabId);
    const targetInfo = tabIndexMap.get(targetTab.id);
    const isMovingDown = (draggedInfo?.index || 0) < (targetInfo?.index || 0);
    const direction = isMovingDown ? 'down' : 'up';
    
    const tabIdsToAnimate = [draggedTabId, ...descendantIds];
    requestAnimationFrame(() => {
      startAnimation(tabIdsToAnimate, direction);
    });

  }, [
    wouldCreateCircularDependency, 
    tabIndexMap, 
    allTabsInWindow,
    findTabInHierarchy,
    getDescendantIds, 
    startAnimation
  ]);

  // Drag source
  const [{ isDragging }, drag] = useDrag({
    type: 'tab',
    item: () => ({ tabId: tab.id, type: 'tab' }),
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  // Drop target
  const [{ isOver, draggedItem }, drop] = useDrop({
    accept: 'tab',
    drop: (item, monitor) => {
      if (monitor.didDrop()) return;
      
      setDropCompleted(true);
      clearAllDropTargets();
      setTimeout(() => setDropCompleted(false), 150);
      
      const position = dropZoneType === 'child' ? 'child' : 'sibling';
      handleTabMove(item.tabId, tab, position);
    },
    hover: (item, monitor) => {
      const canAccept = !wouldCreateCircularDependency(item.tabId, tab.id) && 
                        isValidPinnedTabDropSync(item.tabId, tab.id);
      
      if (!canAccept) {
        setDropTarget(tab.id, level, null, false, true);
        setDropZoneType(null);
        return;
      }

      const clientOffset = monitor.getClientOffset();
      if (clientOffset && dropTargetRef.current) {
        const zone = calculateDropZoneType(clientOffset.x, dropTargetRef.current);
        setDropZoneType(zone);
        setDropTarget(tab.id, level, zone, true, false);
      }
    },
    canDrop: (item) => {
      return !wouldCreateCircularDependency(item.tabId, tab.id) && 
             isValidPinnedTabDropSync(item.tabId, tab.id);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver({ shallow: true }),
      draggedItem: monitor.getItem(),
    }),
  });

  // Cleanup effects
  useEffect(() => {
    if (!isOver) {
      clearDropTarget(tab.id);
      setDropZoneType(null);
    }
  }, [isOver, clearDropTarget, tab.id]);

  useEffect(() => {
    if (!draggedItem) {
      clearAllDropTargets();
      setDropZoneType(null);
    }
  }, [draggedItem, clearAllDropTargets]);

  // Combine refs
  const dragDropRef = useCallback((node) => {
    dropTargetRef.current = node;
    drag(drop(node));
  }, [drag, drop]);

  const dropTargetInfo = getDropTargetInfo(tab.id);
  const isThisTabActiveDropTarget = isActiveDropTarget(tab.id);
  
  return {
    isDragging,
    isOver: isThisTabActiveDropTarget,
    canDrop: isThisTabActiveDropTarget && dropTargetInfo?.canDrop && !dropCompleted,
    showInvalid: isThisTabActiveDropTarget && dropTargetInfo?.showInvalid,
    dropZoneType: isThisTabActiveDropTarget ? dropTargetInfo?.dropZoneType : null,
    dragDropRef,
    handleTabMove
  };
}
