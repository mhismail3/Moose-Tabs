import { useDrag, useDrop } from 'react-dnd';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useTabAnimations } from './useTabAnimations';
import { useDropZone } from '../context/DropZoneContext';

export function useDragDrop(tab, hasChildren, onTabMove, allTabsInWindow = null, level = 0) {
  // Track if a drop just completed to prevent flash of invalid state
  const [dropCompleted, setDropCompleted] = useState(false);
  // Track drop zone type based on mouse position
  const [dropZoneType, setDropZoneType] = useState(null); // null, 'sibling', 'child'
  
  // Ref to track the drop target element
  const dropTargetRef = useRef(null);

  // Animation management
  const { startAnimation } = useTabAnimations();
  
  // Centralized drop zone management
  const { 
    setDropTarget, 
    clearDropTarget, 
    clearAllDropTargets, 
    isActiveDropTarget, 
    getDropTargetInfo 
  } = useDropZone();

  // Calculate drop zone type based on mouse position
  const calculateDropZoneType = useCallback((clientX, targetElement) => {
    if (!targetElement) return null;
    
    const rect = targetElement.getBoundingClientRect();
    const relativeX = clientX - rect.left;
    const width = rect.width;
    
    // Use 60% as the threshold - left 60% is sibling, right 40% is child
    const threshold = width * 0.6;
    
    return relativeX < threshold ? 'sibling' : 'child';
  }, []);

  // Synchronous check for pinned tab drop validity
  function isValidPinnedTabDropSync(draggedTabId, targetTabId) {
    if (!allTabsInWindow) return true; // fallback for legacy usage
    const draggedTab = allTabsInWindow.find(t => t.id === draggedTabId);
    const targetTab = allTabsInWindow.find(t => t.id === targetTabId);
    if (!draggedTab || !targetTab) return false;
    
    // Ensure allTabsInWindow is sorted by index (should be from TabTreeComponent)
    const pinnedTabs = allTabsInWindow.filter(t => t.pinned);
    const unpinnedTabs = allTabsInWindow.filter(t => !t.pinned);
    
    if (draggedTab.pinned) {
      // Can only drop after another pinned tab (not after unpinned)
      return targetTab.pinned;
    } else {
      // If dragged tab is not pinned
      if (targetTab.pinned) {
        // Can only drop after the last pinned tab (by index)
        if (pinnedTabs.length === 0) return false;
        // Find the last pinned tab by index
        const lastPinnedTab = pinnedTabs.reduce((latest, t) => t.index > latest.index ? t : latest, pinnedTabs[0]);
        return targetTab.id === lastPinnedTab.id;
      } else {
        // Can drop after any unpinned tab
        return true;
      }
    }
  }

  // Check if dropping a tab on another would create a circular dependency
  const wouldCreateCircularDependency = (draggedTabId, targetTabId) => {
    const findInHierarchy = (tabList, searchId) => {
      for (const t of tabList) {
        if (t.id === searchId) return t;
        if (t.children) {
          const found = findInHierarchy(t.children, searchId);
          if (found) return found;
        }
      }
      return null;
    };

    // If we're dropping on ourselves, that's a no-op
    if (draggedTabId === targetTabId) return true;

    // Check if target is a descendant of dragged tab
    const draggedTab = findInHierarchy([tab], draggedTabId);
    if (!draggedTab) return false;

    const isDescendant = (parent, searchId) => {
      if (!parent.children) return false;
      for (const child of parent.children) {
        if (child.id === searchId) return true;
        if (isDescendant(child, searchId)) return true;
      }
      return false;
    };

    return isDescendant(draggedTab, targetTabId);
  };

  // Get all descendant tabs recursively
  const getAllDescendants = (parentTab) => {
    let descendants = [];
    if (parentTab.children && parentTab.children.length > 0) {
      for (const child of parentTab.children) {
        descendants.push(child);
        descendants.push(...getAllDescendants(child));
      }
    }
    return descendants;
  };

  // Find the index after the target tab and all its descendants
  const getInsertIndexAfterFamily = async (targetTab, allTabsInWindow) => {
    // Get the hierarchy to find all descendants
    const hierarchyResponse = await chrome.runtime.sendMessage({ action: 'getTabHierarchy' });
    
    if (!hierarchyResponse || !hierarchyResponse.success) {
      return targetTab.index + 1;
    }
    
    // Find the target tab in the hierarchy
    const findTabInHierarchy = (tabs, targetId) => {
      for (const t of tabs) {
        if (t.id === targetId) return t;
        if (t.children) {
          const found = findTabInHierarchy(t.children, targetId);
          if (found) return found;
        }
      }
      return null;
    };
    
    const targetTabWithHierarchy = findTabInHierarchy(hierarchyResponse.hierarchy, targetTab.id);
    if (!targetTabWithHierarchy) {
      return targetTab.index + 1;
    }
    
    // Get all descendants
    const descendants = getAllDescendants(targetTabWithHierarchy);
    
    if (descendants.length === 0) {
      return targetTab.index + 1;
    }
    
    // Find the highest index among target and its descendants
    let maxIndex = targetTab.index;
    for (const descendant of descendants) {
      const browserTab = allTabsInWindow.find(t => t.id === descendant.id);
      if (browserTab && browserTab.index > maxIndex) {
        maxIndex = browserTab.index;
      }
    }
    
    return maxIndex + 1;
  };

  // Handle tab move operation with enhanced position support
  const handleTabMove = async (draggedTabId, targetTab, position = 'after') => {
    try {
      // Prevent circular dependencies
      if (wouldCreateCircularDependency(draggedTabId, targetTab.id)) {
        console.log('Prevented circular dependency');
        return;
      }

      // Get current real browser tab information to ensure we have accurate indices
      const [currentTargetTab, currentDraggedTab, allTabsInWindow] = await Promise.all([
        chrome.tabs.get(targetTab.id),
        chrome.tabs.get(draggedTabId),
        chrome.tabs.query({ windowId: targetTab.windowId })
      ]);

      console.log(`Target tab current index: ${currentTargetTab.index}, Dragged tab current index: ${currentDraggedTab.index}, Total tabs in window: ${allTabsInWindow.length}`);
      console.log(`Drop position: ${position}`);

      // Get the complete hierarchy for this tab to find all descendants
      const hierarchyResponse = await chrome.runtime.sendMessage({ action: 'getTabHierarchy' });
      let draggedTabWithHierarchy = null;
      
      if (hierarchyResponse && hierarchyResponse.success) {
        // Find the dragged tab in the hierarchy
        const findTabInHierarchy = (tabs, targetId) => {
          for (const t of tabs) {
            if (t.id === targetId) return t;
            if (t.children) {
              const found = findTabInHierarchy(t.children, targetId);
              if (found) return found;
            }
          }
          return null;
        };
        draggedTabWithHierarchy = findTabInHierarchy(hierarchyResponse.hierarchy, draggedTabId);
      }

      // Get all tabs that need to be moved (parent + all descendants)
      const tabsToMove = [draggedTabId];
      if (draggedTabWithHierarchy) {
        const descendants = getAllDescendants(draggedTabWithHierarchy);
        tabsToMove.push(...descendants.map(d => d.id));
      }

      console.log(`Moving tab group: ${tabsToMove.join(', ')}`);

      let targetIndex;
      let parentTabId = null;

      if (position === 'child') {
        // Moving as a child - position right after target
        targetIndex = currentTargetTab.index + 1;
        parentTabId = targetTab.id;
        console.log(`Moving as child of tab ${targetTab.id}`);
      } else {
        // Moving as sibling - position after target and all its descendants
        targetIndex = await getInsertIndexAfterFamily(currentTargetTab, allTabsInWindow);
        console.log(`Moving as sibling after tab family, target index: ${targetIndex}`);
      }

      // Check if we're moving the tabs down (after target) or up (before target)
      const firstTabIndex = allTabsInWindow.find(t => t.id === tabsToMove[0])?.index;
      const isMovingDown = firstTabIndex < targetIndex;

      // For single tab moves, we need to handle downward vs upward movement differently
      if (tabsToMove.length === 1) {
        let finalIndex = targetIndex;
        
        // When moving DOWN, we need to account for the fact that removing the dragged tab
        // shifts the indices of tabs below it down by 1
        if (isMovingDown) {
          finalIndex = targetIndex - 1;
        }
        
        const moveParams = {
          index: finalIndex,
          windowId: targetTab.windowId
        };
        
        console.log(`Moving single tab ${tabsToMove[0]} to index ${moveParams.index} in window ${moveParams.windowId} (${isMovingDown ? 'down' : 'up'}, targetIndex was ${targetIndex})`);
        await chrome.tabs.move(tabsToMove[0], moveParams);
      } else {
        // For multi-tab moves (with children), we need the more complex logic
        if (isMovingDown) {
          // When moving DOWN: tabs are currently before target
          // We need to account for the fact that removing tabs shifts indices
          const draggedTabsBeforeTarget = tabsToMove.filter(tabId => {
            const tab = allTabsInWindow.find(t => t.id === tabId);
            return tab && tab.index < targetIndex;
          }).length;
          
          const adjustedTargetIndex = targetIndex - draggedTabsBeforeTarget;
          
          // Move tabs in reverse order (children first, then parent) to avoid index shifting issues
          console.log(`Moving tab group down to index ${adjustedTargetIndex}`);
          for (let i = tabsToMove.length - 1; i >= 0; i--) {
            const tabId = tabsToMove[i];
            const moveParams = {
              index: adjustedTargetIndex + i,
              windowId: targetTab.windowId
            };
            
            console.log(`Moving tab ${tabId} to index ${moveParams.index} in window ${moveParams.windowId}`);
            await chrome.tabs.move(tabId, moveParams);
          }
        } else {
          // When moving UP: tabs are currently after target
          // No index adjustment needed, move tabs sequentially
          console.log(`Moving tab group up to index ${targetIndex}`);
          for (let i = 0; i < tabsToMove.length; i++) {
            const tabId = tabsToMove[i];
            const moveParams = {
              index: targetIndex + i,
              windowId: targetTab.windowId
            };
            
            console.log(`Moving tab ${tabId} to index ${moveParams.index} in window ${moveParams.windowId}`);
            await chrome.tabs.move(tabId, moveParams);
          }
        }
      }

      // Update hierarchy relationships in the background
      if (position === 'child') {
        console.log(`Setting parent relationship: ${draggedTabId} -> parent: ${parentTabId}`);
        await chrome.runtime.sendMessage({
          action: 'updateParentRelationship',
          tabId: draggedTabId,
          parentId: parentTabId
        });
      } else {
        // For sibling drops, we need to determine the appropriate parent
        // If dropping after a child, inherit the same parent
        // If dropping after a parent, become a sibling with no parent
        let newParentId = null;
        
        // Get target tab's parent relationship
        const targetHierarchyResponse = await chrome.runtime.sendMessage({ 
          action: 'getTabParent', 
          tabId: targetTab.id 
        });
        
        if (targetHierarchyResponse && targetHierarchyResponse.success && targetHierarchyResponse.parentId) {
          newParentId = targetHierarchyResponse.parentId;
        }
        
        console.log(`Setting sibling relationship: ${draggedTabId} -> parent: ${newParentId || 'none'}`);
        await chrome.runtime.sendMessage({
          action: 'updateParentRelationship',
          tabId: draggedTabId,
          parentId: newParentId
        });
      }
      
      // Calculate which tabs get displaced and need animation
      const draggedTabIndices = tabsToMove.map(tabId => {
        return allTabsInWindow.find(t => t.id === tabId)?.index;
      }).filter(index => index !== undefined);
      
      const minDraggedIndex = Math.min(...draggedTabIndices);
      const maxDraggedIndex = Math.max(...draggedTabIndices);
      
      // Find tabs that will be displaced
      const displacedTabs = [];
      
      if (isMovingDown) {
        // Moving down: tabs between original position and target shift UP
        for (const browserTab of allTabsInWindow) {
          const tabIndex = browserTab.index;
          if (tabIndex > maxDraggedIndex && tabIndex < targetIndex) {
            displacedTabs.push(browserTab.id);
          }
        }
      } else {
        // Moving up: tabs between target and original position shift DOWN  
        for (const browserTab of allTabsInWindow) {
          const tabIndex = browserTab.index;
          if (tabIndex >= targetIndex && tabIndex < minDraggedIndex) {
            displacedTabs.push(browserTab.id);
          }
        }
      }
      
      console.log(`Displaced tabs: ${displacedTabs.join(', ')}`);
      
      // Small delay to ensure UI has settled after drop target styles are removed
      setTimeout(() => {
        // Trigger animations for the moved tabs
        const direction = isMovingDown ? 'down' : 'up';
        startAnimation(tabsToMove, direction);
        
        // Trigger animations for displaced tabs (they move in opposite direction)
        if (displacedTabs.length > 0) {
          const displacedDirection = isMovingDown ? 'up' : 'down';
          startAnimation(displacedTabs, displacedDirection, true); // true = isDisplaced
        }
      }, 20); // Reduced delay for more immediate and smooth response
      
      // Force refresh of the hierarchy after the move operation completes
      // This ensures the sidebar UI reflects the new tab order immediately
      setTimeout(async () => {
        try {
          await chrome.runtime.sendMessage({ action: 'refreshHierarchy' });
        } catch (error) {
          console.log('Failed to refresh hierarchy after move:', error);
        }
      }, 150); // Small delay to ensure the move operation is fully processed
      
    } catch (error) {
      console.error('Failed to move tab:', error);
      console.error('Error details:', error);
    }
  };

  // Drag source configuration
  const [{ isDragging }, drag] = useDrag({
    type: 'tab',
    item: { tabId: tab.id, type: 'tab' },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  // Drop target configuration with centralized state management
  const [{ isOver, canDrop, draggedItem }, drop] = useDrop({
    accept: 'tab',
    drop: (item, monitor) => {
      if (monitor.didDrop()) return; // Already handled by a child
      const draggedTabId = item.tabId;
      setDropCompleted(true);
      clearAllDropTargets(); // Clear all drop targets immediately
      setTimeout(() => setDropCompleted(false), 200);
      
      // Use the dropZoneType to determine position
      const position = dropZoneType === 'child' ? 'child' : 'sibling';
      console.log(`Dropping with position: ${position}, dropZoneType: ${dropZoneType}`);
      handleTabMove(draggedTabId, tab, position);
    },
    hover: (item, monitor) => {
      // Only process hover if this tab can accept the drop
      const canAcceptDrop = !wouldCreateCircularDependency(item.tabId, tab.id) && 
                           isValidPinnedTabDropSync(item.tabId, tab.id);
      
      if (!canAcceptDrop) {
        // Set this as active drop target with invalid state
        setDropTarget(tab.id, level, null, false, true);
        setDropZoneType(null);
        return;
      }

      // Track mouse position for drop zone type calculation
      const clientOffset = monitor.getClientOffset();
      if (clientOffset && dropTargetRef.current) {
        const newDropZoneType = calculateDropZoneType(clientOffset.x, dropTargetRef.current);
        setDropZoneType(newDropZoneType);
        
        // Update centralized drop target state
        setDropTarget(tab.id, level, newDropZoneType, true, false);
      }
    },
    canDrop: (item) => {
      return !wouldCreateCircularDependency(item.tabId, tab.id) && isValidPinnedTabDropSync(item.tabId, tab.id);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver({ shallow: true }),
      canDrop: monitor.canDrop(),
      draggedItem: monitor.getItem(),
    }),
  });

  // Clear drop target when not hovering
  useEffect(() => {
    if (!isOver) {
      clearDropTarget(tab.id);
      setDropZoneType(null);
    }
  }, [isOver, clearDropTarget, tab.id]);

  // Clear all drop targets when dragging ends
  useEffect(() => {
    if (!draggedItem) {
      clearAllDropTargets();
      setDropZoneType(null);
    }
  }, [draggedItem, clearAllDropTargets]);

  // Combine drag and drop refs with the target ref
  const dragDropRef = useCallback((node) => {
    dropTargetRef.current = node;
    drag(drop(node));
  }, [drag, drop]);

  // Get centralized drop target info for this tab
  const dropTargetInfo = getDropTargetInfo(tab.id);
  const isThisTabActiveDropTarget = isActiveDropTarget(tab.id);
  
  return {
    isDragging,
    isOver: isThisTabActiveDropTarget, // Only true for the active drop target
    canDrop: isThisTabActiveDropTarget && dropTargetInfo?.canDrop && !dropCompleted,
    showInvalid: isThisTabActiveDropTarget && dropTargetInfo?.showInvalid,
    dropZoneType: isThisTabActiveDropTarget ? dropTargetInfo?.dropZoneType : null,
    dragDropRef,
    handleTabMove
  };
}