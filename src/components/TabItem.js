import React, { useState } from 'react';
import { getTabItemAriaLabel, getMessage } from '../utils/i18n';
import { useDragDrop } from './hooks/useDragDrop';
import { useKeyboardNavigation } from './hooks/useKeyboardNavigation';
import { useTabAnimations } from './hooks/useTabAnimations';
import './TabTree.css';

function TabItem({ tab, level = 0, isFirst = false, totalSiblings = 1, positionInSet = 1, allTabsInWindow }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const hasChildren = tab.children && tab.children.length > 0;
  
  // Animation management
  const { subscribe, isAnimating } = useTabAnimations();
  
  // Subscribe to animation state changes
  React.useEffect(() => {
    return subscribe();
  }, [subscribe]);

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

  const handleTabClick = (e) => {
    // Don't trigger if clicking on expand/collapse button or close button
    if (e.target.closest('.expand-collapse-btn') || e.target.closest('.tab-close-btn')) {
      return;
    }
    
    // Switch to this tab
    chrome.runtime.sendMessage({
      action: 'switchToTab',
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
  const { isDragging, isOver, canDrop, showInvalid, dropZoneType, dragDropRef } = useDragDrop(tab, hasChildren, undefined, allTabsInWindow, level);
  const { handleKeyDown } = useKeyboardNavigation(hasChildren, isExpanded, setIsExpanded);

  return (
    <div 
      className={`tab-item ${isOver && canDrop ? 'drop-zone-active' : ''} ${showInvalid ? 'drop-zone-invalid' : ''} ${dropZoneType === 'child' ? `drop-zone-child drop-zone-child-level-${level}` : ''} ${dropZoneType === 'sibling' ? `drop-zone-sibling drop-zone-sibling-level-${level}` : ''}`}
      ref={dragDropRef}
    >
      <div 
        data-testid={`tab-content-${tab.id}`}
        className={`tab-content tab-level-${level} ${isDragging ? 'dragging' : ''} ${isOver && canDrop ? 'drop-target' : ''} ${showInvalid ? 'drop-invalid' : ''} ${isAnimating(tab.id, 'up') ? 'moving-up' : ''} ${isAnimating(tab.id, 'down') ? 'moving-down' : ''} ${isAnimating(tab.id, 'displaced-up') ? 'displaced-up' : ''} ${isAnimating(tab.id, 'displaced-down') ? 'displaced-down' : ''} ${dropZoneType === 'child' ? `drop-target-child drop-target-child-level-${level}` : ''} ${dropZoneType === 'sibling' ? 'drop-target-sibling' : ''}`}
        style={{ 
          marginLeft: level === 0 ? 0 : 0,
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
        onClick={handleTabClick}
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
            // Replace with fallback favicon instead of hiding
            e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTggMTZBOCA4IDAgMSExIDggMEE4IDggMCAwIDEgOCAxNloiIGZpbGw9IiNGM0Y0RjYiLz4KPGNpcmNsZSBjeD0iOCIgY3k9IjgiIHI9IjIiIGZpbGw9IiM2Mzc0ODEiLz4KPC9zdmc+';
            e.target.onError = null; // Prevent infinite error loop
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
              allTabsInWindow={allTabsInWindow}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default TabItem;