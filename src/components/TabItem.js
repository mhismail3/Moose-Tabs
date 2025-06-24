import React, { useState } from 'react';
import { getTabItemAriaLabel, getMessage } from '../utils/i18n';
import { useDragDrop } from './hooks/useDragDrop';
import { useKeyboardNavigation } from './hooks/useKeyboardNavigation';
import './TabTree.css';

function TabItem({ tab, level = 0, isFirst = false, totalSiblings = 1, positionInSet = 1 }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const hasChildren = tab.children && tab.children.length > 0;

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const handleCloseTab = (e) => {
    e.stopPropagation();
    // Send message to background script to close the tab
    chrome.runtime.sendMessage({
      action: 'closeTab',
      tabId: tab.id
    });
  };

  const getFaviconUrl = (url) => {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?sz=16&domain=${domain}`;
    } catch (e) {
      return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTggMTZBOCA4IDAgMSAxIDggMEE4IDggMCAwIDEgOCAxNloiIGZpbGw9IiNGM0Y0RjYiLz4KPHA+PC9wPgo8L3N2Zz4K'; // Default favicon
    }
  };

  // Extract complex logic into focused hooks
  const { isDragging, isOver, canDrop, dragDropRef } = useDragDrop(tab, hasChildren);
  const { handleKeyDown } = useKeyboardNavigation(hasChildren, isExpanded, setIsExpanded);

  return (
    <div className="tab-item">
      <div 
        ref={dragDropRef}
        data-testid={`tab-content-${tab.id}`}
        className={`tab-content tab-level-${level} ${isDragging ? 'dragging' : ''} ${isOver && canDrop ? 'drop-target' : ''} ${isOver && !canDrop ? 'drop-invalid' : ''}`}
        style={{ 
          marginLeft: `${level * 20}px`,
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
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
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
        <img 
          src={getFaviconUrl(tab.url)} 
          alt=""
          className="tab-favicon"
          onError={(e) => {
            e.target.style.display = 'none';
          }}
        />
        <div className="tab-info">
          <div className="tab-title">{tab.title}</div>
          <div className="tab-url">{tab.url}</div>
        </div>
        {isHovered && (
          <button
            className="tab-close-btn"
            onClick={handleCloseTab}
            aria-label={`Close ${tab.title}`}
            data-testid={`close-btn-${tab.id}`}
          >
            ×
          </button>
        )}
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