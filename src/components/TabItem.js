import React, { useState } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import './TabItem.css';

function TabItem({ tab, level = 0 }) {
  const [isExpanded, setIsExpanded] = useState(true);

  const hasChildren = tab.children && tab.children.length > 0;

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
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

      let moveParams = {};

      if (position === 'child') {
        // Moving as a child - position after last child or after parent
        if (targetTab.children && targetTab.children.length > 0) {
          const lastChild = targetTab.children[targetTab.children.length - 1];
          moveParams.index = (lastChild.index || 0) + 1;
        } else {
          moveParams.index = (targetTab.index || 0) + 1;
        }
        
        // If moving to different window
        if (targetTab.windowId !== undefined) {
          moveParams.windowId = targetTab.windowId;
        }
      } else {
        // Moving as sibling - position after target
        moveParams.index = (targetTab.index || 0) + 1;
        
        // If moving to different window
        if (targetTab.windowId !== undefined) {
          moveParams.windowId = targetTab.windowId;
        }
      }

      console.log(`Moving tab ${draggedTabId}:`, moveParams);
      await chrome.tabs.move(draggedTabId, moveParams);
    } catch (error) {
      console.error('Failed to move tab:', error);
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
        tabIndex={0}
        role="button"
        aria-label={`Tab: ${tab.title}. Press Enter to select, drag to reorder.`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            // Could implement keyboard-based reordering here
          }
        }}
      >
        {hasChildren && (
          <button
            data-testid={`expand-collapse-btn-${tab.id}`}
            className={`expand-collapse-btn${level > 0 ? ' nested' : ''}`}
            onClick={toggleExpanded}
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
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
        <div className="tab-children">
          {tab.children.map(child => (
            <TabItem 
              key={child.id} 
              tab={child} 
              level={level + 1} 
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default TabItem;