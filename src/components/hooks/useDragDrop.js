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
  const getDescendantIds = useCallback((parentTab) => {
    const ids = [];
    const traverse = (t) => {
      if (t.children) {
        for (const child of t.children) {
          ids.push(child.id);
          traverse(child);
        }
      }
    };
    traverse(parentTab);
    return ids;
  }, []);

  // Check circular dependency using local data (synchronous)
  const wouldCreateCircularDependency = useCallback((draggedTabId, targetTabId) => {
    if (draggedTabId === targetTabId) return true;
    
    // Check if target is a descendant of the dragged tab
    const descendantIds = getDescendantIds(tab);
    return descendantIds.includes(targetTabId);
  }, [tab, getDescendantIds]);

  // Find a tab in the local hierarchy
  const findTabInHierarchy = useCallback((tabList, searchId) => {
    for (const t of tabList) {
      if (t.id === searchId) return t;
      if (t.children) {
        const found = findTabInHierarchy(t.children, searchId);
        if (found) return found;
      }
    }
    return null;
  }, []);

  // Calculate target index for sibling drop (after target and all its descendants)
  const calculateSiblingIndex = useCallback((targetTab) => {
    const targetInfo = tabIndexMap.get(targetTab.id);
    if (!targetInfo) return 0;
    
    let maxIndex = targetInfo.index;
    
    // Find max index among target's descendants using local hierarchy
    const descendants = getDescendantIds(targetTab);
    for (const descId of descendants) {
      const descInfo = tabIndexMap.get(descId);
      if (descInfo && descInfo.index > maxIndex) {
        maxIndex = descInfo.index;
      }
    }
    
    return maxIndex + 1;
  }, [tabIndexMap, getDescendantIds]);

  // Optimized tab move handler
  const handleTabMove = useCallback(async (draggedTabId, targetTab, position = 'sibling') => {
    if (wouldCreateCircularDependency(draggedTabId, targetTab.id)) {
      console.log('Prevented circular dependency');
      return;
    }

    const draggedInfo = tabIndexMap.get(draggedTabId);
    const targetInfo = tabIndexMap.get(targetTab.id);
    
    if (!draggedInfo || !targetInfo) {
      console.error('Tab info not found in local data');
      return;
    }

    try {
      // Get all tabs to move (dragged + descendants) from local hierarchy
      // First find the dragged tab in the hierarchy to get its children
      const draggedWithHierarchy = findTabInHierarchy([tab], draggedTabId) || 
                                    { id: draggedTabId, children: [] };
      
      const tabIdsToMove = [draggedTabId, ...getDescendantIds(draggedWithHierarchy)];
      
      // Calculate target index
      let targetIndex;
      let newParentId = null;

      if (position === 'child') {
        targetIndex = targetInfo.index + 1;
        newParentId = targetTab.id;
      } else {
        targetIndex = calculateSiblingIndex(targetTab);
        newParentId = targetTab.parentId ?? null;
      }

      // Determine move direction
      const currentIndex = draggedInfo.index;
      const isMovingDown = currentIndex < targetIndex;

      // Adjust target index for Chrome's move behavior
      if (isMovingDown) {
        // When moving down, account for indices shifting when tabs are removed
        const tabsBeingMovedBeforeTarget = tabIdsToMove.filter(id => {
          const info = tabIndexMap.get(id);
          return info && info.index < targetIndex;
        }).length;
        targetIndex = targetIndex - tabsBeingMovedBeforeTarget;
      }

      // BATCH MOVE: Move all tabs at once using Chrome's array support
      // This is MUCH faster than sequential moves
      if (tabIdsToMove.length === 1) {
        await chrome.tabs.move(tabIdsToMove[0], { 
          index: targetIndex, 
          windowId: targetInfo.windowId 
        });
      } else {
        // Chrome.tabs.move supports array of tab IDs - moves them in order
        await chrome.tabs.move(tabIdsToMove, { 
          index: targetIndex, 
          windowId: targetInfo.windowId 
        });
      }

      // Update hierarchy relationship (single message)
      chrome.runtime.sendMessage({
        action: 'updateParentRelationship',
        tabId: draggedTabId,
        parentId: newParentId
      }).catch(err => console.log('Parent update message failed:', err));

      // Trigger animations (non-blocking)
      const direction = isMovingDown ? 'down' : 'up';
      requestAnimationFrame(() => {
        startAnimation(tabIdsToMove, direction);
      });

    } catch (error) {
      console.error('Tab move failed:', error);
    }
  }, [
    wouldCreateCircularDependency, 
    tabIndexMap, 
    tab,
    findTabInHierarchy,
    getDescendantIds, 
    calculateSiblingIndex,
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
