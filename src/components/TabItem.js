import React, { useState } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { getTabItemAriaLabel, getMessage } from '../utils/i18n';
import './TabItem.css';

function TabItem({ tab, level = 0, isFirst = false, totalSiblings = 1, positionInSet = 1 }) {
  const [isExpanded, setIsExpanded] = useState(true);

  const hasChildren = tab.children && tab.children.length > 0;

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  // Keyboard navigation handlers
  const handleKeyDown = (e) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        focusNextItem(e.target);
        break;
      case 'ArrowUp':
        e.preventDefault();
        focusPreviousItem(e.target);
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (hasChildren && !isExpanded) {
          setIsExpanded(true);
        } else {
          focusNextItem(e.target);
        }
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (hasChildren && isExpanded) {
          setIsExpanded(false);
        } else {
          focusPreviousItem(e.target);
        }
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        // Could implement tab selection here
        break;
      default:
        break;
    }
  };

  // Focus management utilities
  const focusNextItem = (currentElement) => {
    const treeItems = getAllTreeItems();
    const currentIndex = treeItems.indexOf(currentElement);
    const nextIndex = Math.min(currentIndex + 1, treeItems.length - 1);
    if (treeItems[nextIndex]) {
      updateTabIndexes(treeItems, nextIndex);
      treeItems[nextIndex].focus();
    }
  };

  const focusPreviousItem = (currentElement) => {
    const treeItems = getAllTreeItems();
    const currentIndex = treeItems.indexOf(currentElement);
    const prevIndex = Math.max(currentIndex - 1, 0);
    if (treeItems[prevIndex]) {
      updateTabIndexes(treeItems, prevIndex);
      treeItems[prevIndex].focus();
    }
  };

  const getAllTreeItems = () => {
    const tree = document.querySelector('[role="tree"]');
    if (!tree) return [];
    return Array.from(tree.querySelectorAll('[role="treeitem"]'));
  };

  const updateTabIndexes = (treeItems, focusedIndex) => {
    treeItems.forEach((item, index) => {
      item.setAttribute('tabIndex', index === focusedIndex ? '0' : '-1');
    });
  };

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

  return (
    <div className="tab-item">
      <div 
        ref={dragDropRef}
        data-testid={`tab-content-${tab.id}`}
        className={`tab-content tab-level-${level} ${isDragging ? 'dragging' : ''} ${isOver && canDrop ? 'drop-target' : ''} ${isOver && !canDrop ? 'drop-invalid' : ''}`}
        style={{ 
          paddingLeft: `${level * 20}px`,
          opacity: isDragging ? 0.5 : 1
        }}
        draggable={true}
        tabIndex={isFirst ? 0 : -1}
        role="treeitem"
        aria-label={getTabItemAriaLabel(tab.title)}
        aria-expanded={hasChildren ? isExpanded : undefined}
        aria-level={level + 1}
        aria-setsize={totalSiblings}
        aria-posinset={positionInSet}
        onKeyDown={handleKeyDown}
      >
        {hasChildren && (
          <button
            data-testid={`expand-collapse-btn-${tab.id}`}
            className={`expand-collapse-btn${level > 0 ? ' nested' : ''}`}
            onClick={toggleExpanded}
            aria-label={isExpanded ? getMessage('collapse_button_aria', [], 'Collapse') : getMessage('expand_button_aria', [], 'Expand')}
          >
            {isExpanded ? '▼' : '►'}
          </button>
        )}
        <div className="tab-info">
          <div className="tab-title">{tab.title}</div>
          <div className="tab-url">{tab.url}</div>
        </div>
      </div>
      {hasChildren && isExpanded && (
        <div className="tab-children" role="group">
          {tab.children.map((child, index) => (
            <TabItem 
              key={child.id} 
              tab={child} 
              level={level + 1}
              isFirst={false}
              totalSiblings={tab.children.length}
              positionInSet={index + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default TabItem;