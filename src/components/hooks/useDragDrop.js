import { useDrag, useDrop } from 'react-dnd';

export function useDragDrop(tab, hasChildren, onTabMove) {
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

      let moveParams = {};
      let targetIndex = currentTargetTab.index + 1; // Default: move after target

      // Adjust target index if dragged tab is currently before the target tab
      // When a tab is moved, it's first removed from its current position, 
      // causing all tabs after it to shift down by one index
      if (currentDraggedTab.index < currentTargetTab.index) {
        // If dragged tab is before target, target will shift down by 1 after removal
        // So we want to move to target's current index (which becomes target's new index + 1)
        targetIndex = currentTargetTab.index;
      }

      if (position === 'child') {
        // Moving as a child - position after target (since we don't have true parent-child in browser)
        moveParams.index = targetIndex;
        moveParams.windowId = targetTab.windowId;
      } else {
        // Moving as sibling - position after target  
        moveParams.index = targetIndex;
        moveParams.windowId = targetTab.windowId;
      }

      console.log(`Moving tab ${draggedTabId} to index ${moveParams.index} in window ${moveParams.windowId}`);
      await chrome.tabs.move(draggedTabId, moveParams);
      
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

  // Combine drag and drop refs
  const dragDropRef = (node) => {
    drag(drop(node));
  };

  return {
    isDragging,
    isOver,
    canDrop,
    dragDropRef,
    handleTabMove
  };
}