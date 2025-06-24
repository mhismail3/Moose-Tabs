import { useDrag, useDrop } from 'react-dnd';
import { useState, useEffect } from 'react';

export function useDragDrop(tab, hasChildren, onTabMove) {
  // Debounced isOver state to prevent jittery behavior
  const [debouncedIsOver, setDebouncedIsOver] = useState(false);
  // Track if a drop just completed to prevent flash of invalid state
  const [dropCompleted, setDropCompleted] = useState(false);
  // Track if we should show invalid state (with debouncing)
  const [showInvalid, setShowInvalid] = useState(false);
  
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

  // Handle tab move operation
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

      let targetIndex = currentTargetTab.index + 1; // Default: move after target

      // Check if we're moving the tabs down (after target) or up (before target)
      const firstTabIndex = allTabsInWindow.find(t => t.id === tabsToMove[0])?.index;
      const isMovingDown = firstTabIndex < currentTargetTab.index;

      if (position === 'child') {
        // Moving as a child - position after target (since we don't have true parent-child in browser)
        targetIndex = currentTargetTab.index + 1;
      }

      if (isMovingDown) {
        // When moving DOWN: tabs are currently before target
        // We need to account for the fact that removing tabs shifts indices
        const draggedTabsBeforeTarget = tabsToMove.filter(tabId => {
          const tab = allTabsInWindow.find(t => t.id === tabId);
          return tab && tab.index < currentTargetTab.index;
        }).length;
        
        targetIndex = currentTargetTab.index - draggedTabsBeforeTarget + 1;
        
        // Move tabs in reverse order (children first, then parent) to avoid index shifting issues
        console.log(`Moving tab group down to index ${targetIndex}`);
        for (let i = tabsToMove.length - 1; i >= 0; i--) {
          const tabId = tabsToMove[i];
          const moveParams = {
            index: targetIndex + i,
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

  // Drop target configuration
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: 'tab',
    drop: (item, monitor) => {
      if (monitor.didDrop()) return; // Already handled by a child
      
      const draggedTabId = item.tabId;
      
      // Mark that a drop completed successfully to prevent red flash
      setDropCompleted(true);
      setTimeout(() => setDropCompleted(false), 200);
      
      // Determine drop position based on where exactly the drop occurred
      // For now, default to making it a child if target has children, sibling otherwise
      const position = hasChildren ? 'child' : 'after';
      handleTabMove(draggedTabId, tab, position);
    },
    canDrop: (item) => {
      return !wouldCreateCircularDependency(item.tabId, tab.id);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver({ shallow: true }),
      canDrop: monitor.canDrop(),
    }),
  });

  // Debounce isOver state to prevent jittery behavior when hovering near edges
  useEffect(() => {
    let timeoutId;
    
    if (isOver && canDrop) {
      // Immediately set to true when hovering starts
      setDebouncedIsOver(true);
      setShowInvalid(false); // Clear any invalid state
    } else {
      // Add delay when hovering stops to prevent rapid toggling
      timeoutId = setTimeout(() => {
        setDebouncedIsOver(false);
      }, 100); // 100ms delay
    }
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isOver, canDrop]);

  // Handle invalid state with debouncing to prevent red flash after drops
  useEffect(() => {
    let timeoutId;
    
    if (isOver && !canDrop && !dropCompleted) {
      // Show invalid state immediately, but only if not just after a drop
      timeoutId = setTimeout(() => {
        setShowInvalid(true);
      }, 50); // Small delay to prevent flash
    } else {
      // Hide invalid state immediately
      setShowInvalid(false);
    }
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isOver, canDrop, dropCompleted]);

  // Combine drag and drop refs
  const dragDropRef = (node) => {
    drag(drop(node));
  };

  return {
    isDragging,
    isOver: debouncedIsOver,
    canDrop: canDrop && !dropCompleted,
    showInvalid,
    dragDropRef,
    handleTabMove
  };
}