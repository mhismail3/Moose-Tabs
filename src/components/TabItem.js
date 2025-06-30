import React, { useState } from 'react';
import { getTabItemAriaLabel, getMessage } from '../utils/i18n';
import { useDragDrop } from './hooks/useDragDrop';
import { useKeyboardNavigation } from './hooks/useKeyboardNavigation';
import { useTabAnimations } from './hooks/useTabAnimations';
import { useSettings } from '../contexts/SettingsContext';
import './TabTree.css';

function TabItem({ tab, level = 0, isFirst = false, totalSiblings = 1, positionInSet = 1, allTabsInWindow }) {
  const { settings } = useSettings();
  
  // Get tab management settings with fallback defaults
  const defaultExpandState = settings?.tabManagement?.defaultExpandState ?? 'expanded';
  const confirmTabClose = settings?.tabManagement?.confirmTabClose ?? false;
  const initialExpandState = defaultExpandState === 'expanded';
  
  const [isExpanded, setIsExpanded] = useState(initialExpandState);
  const [isHovered, setIsHovered] = useState(false);
  const [savedExpandedState, setSavedExpandedState] = useState(null);
  const [isDragCollapsed, setIsDragCollapsed] = useState(false);
  const hasChildren = tab.children && tab.children.length > 0;
  
  // Get appearance settings with fallback defaults
  const showTabUrls = settings?.appearance?.showTabUrls ?? true;
  const showFavicons = settings?.appearance?.showFavicons ?? true;
  
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
    
    // Show confirmation dialog if enabled
    if (confirmTabClose) {
      const confirmed = window.confirm(`Close tab "${tab.title}"?`);
      if (!confirmed) {
        return;
      }
    }
    
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

  // Create custom drag image for better visual preview
  const createCustomDragImage = React.useCallback((sourceElement) => {
    // Get computed styles from the source element to resolve CSS variables
    const computedStyles = window.getComputedStyle(document.documentElement);
    const bgOverlay = computedStyles.getPropertyValue('--color-bg-overlay').trim() || 'rgba(255, 255, 255, 0.95)';
    const colorBorder = computedStyles.getPropertyValue('--color-border').trim() || 'rgba(229, 231, 235, 1)';
    const radiusLg = computedStyles.getPropertyValue('--radius-lg').trim() || '12px';
    const spaceSm = computedStyles.getPropertyValue('--space-sm').trim() || '8px';
    const spaceMd = computedStyles.getPropertyValue('--space-md').trim() || '12px';
    
    const dragPreview = document.createElement('div');
    dragPreview.style.cssText = `
      position: absolute;
      top: -2000px;
      left: -2000px;
      pointer-events: none;
      z-index: 9999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    
    // Clone only the tab-content element (not children)
    const tabContent = sourceElement.querySelector('.tab-content');
    if (!tabContent) return dragPreview;
    
    const clonedElement = tabContent.cloneNode(true);
    
    // Apply styles using resolved CSS variables
    clonedElement.style.cssText = `
      display: flex;
      align-items: center;
      background: ${bgOverlay};
      border: 1px solid ${colorBorder};
      border-radius: ${radiusLg};
      padding: ${spaceSm} ${spaceMd};
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
      transform: rotate(-2deg);
      opacity: 0.95;
      position: relative;
      max-width: 300px;
      backdrop-filter: blur(12px);
      cursor: grabbing;
      margin: 0;
      white-space: nowrap;
      overflow: hidden;
      z-index: 100;
    `;
    
    // Apply the correct level border color
    const levelClass = Array.from(tabContent.classList).find(cls => cls.startsWith('tab-level-'));
    if (levelClass) {
      const levelNum = levelClass.split('-')[2];
      const accentColors = {
        '0': 'rgba(34, 197, 94, 1)',   // green
        '1': 'rgba(245, 158, 11, 1)',  // yellow
        '2': 'rgba(239, 68, 68, 1)',   // red
        '3': 'rgba(79, 68, 239, 1)',   // blue
      };
      const accentColor = accentColors[levelNum] || 'rgba(104, 134, 190, 1)';
      clonedElement.style.borderLeft = `5px solid ${accentColor}`;
    }
    
    // If has children, add stack effect with resolved colors
    if (hasChildren) {
      // Create first stack layer
      const stackLayer1 = document.createElement('div');
      stackLayer1.style.cssText = `
        position: absolute;
        bottom: -4px;
        left: 3px;
        right: 3px;
        height: 8px;
        background: ${bgOverlay};
        border: 1px solid ${colorBorder};
        border-radius: ${radiusLg};
        opacity: 0.8;
        z-index: -1;
        box-shadow: 0 3px 12px rgba(0, 0, 0, 0.2);
      `;
      
      // Create second stack layer
      const stackLayer2 = document.createElement('div');
      stackLayer2.style.cssText = `
        position: absolute;
        bottom: -8px;
        left: 6px;
        right: 6px;
        height: 8px;
        background: ${bgOverlay};
        border: 1px solid ${colorBorder};
        border-radius: ${radiusLg};
        opacity: 0.6;
        z-index: -2;
        box-shadow: 0 3px 12px rgba(0, 0, 0, 0.15);
      `;
      
      dragPreview.appendChild(stackLayer1);
      dragPreview.appendChild(stackLayer2);
    }
    
    dragPreview.appendChild(clonedElement);
    document.body.appendChild(dragPreview);
    
    return dragPreview;
  }, [hasChildren]);

  // Handle native drag start to set custom drag image
  const handleDragStart = React.useCallback((e) => {
    const customDragImage = createCustomDragImage(e.currentTarget);
    
    // Set the custom drag image with appropriate offset
    // The offset positions the cursor relative to the drag image
    e.dataTransfer.setDragImage(customDragImage, 150, 30);
    
    // Clean up the temporary element after drag starts
    setTimeout(() => {
      if (customDragImage && customDragImage.parentNode) {
        document.body.removeChild(customDragImage);
      }
    }, 10);
  }, [createCustomDragImage]);

  // Save expansion state and collapse children when dragging starts
  React.useEffect(() => {
    if (isDragging && hasChildren && savedExpandedState === null) {
      // Save the current expanded state
      const expandedState = gatherExpandedState(tab);
      setSavedExpandedState(expandedState);
      setIsDragCollapsed(true);
    } else if (!isDragging && savedExpandedState !== null) {
      // Restore the expanded state when dragging ends
      setTimeout(() => {
        restoreExpandedState(tab, savedExpandedState, setIsExpanded);
        setSavedExpandedState(null);
        setIsDragCollapsed(false);
      }, 100); // Small delay to let the drop animation complete
    }
  }, [isDragging, hasChildren, savedExpandedState, tab]);

  // Helper functions for managing expanded state
  const gatherExpandedState = (tabNode) => {
    const state = { [tabNode.id]: isExpanded };
    if (tabNode.children) {
      tabNode.children.forEach(child => {
        // Store the current expansion state - all children are expanded by default
        // This assumes children are expanded; in a full implementation, you'd 
        // need to track individual child expansion states
        state[child.id] = true;
        
        // Recursively gather nested children states
        if (child.children && child.children.length > 0) {
          const childState = gatherExpandedState(child);
          Object.assign(state, childState);
        }
      });
    }
    return state;
  };

  const restoreExpandedState = (tabNode, state, setExpandedFn) => {
    if (state[tabNode.id] !== undefined) {
      setExpandedFn(state[tabNode.id]);
    }
    // Note: For nested children, their expansion state would be restored 
    // when their respective TabItem components mount and check the saved state
  };

  return (
    <div 
      className={`tab-item ${isOver && canDrop ? 'drop-zone-active' : ''} ${showInvalid ? 'drop-zone-invalid' : ''} ${dropZoneType === 'child' ? `drop-zone-child drop-zone-child-level-${level}` : ''} ${dropZoneType === 'sibling' ? `drop-zone-sibling drop-zone-sibling-level-${level}` : ''}`}
      ref={dragDropRef}
    >
      <div 
        data-testid={`tab-content-${tab.id}`}
        className={`tab-content tab-level-${level} ${isDragging ? 'dragging' : ''} ${isDragging && hasChildren ? 'dragging-with-children' : ''} ${isOver && canDrop ? 'drop-target' : ''} ${showInvalid ? 'drop-invalid' : ''} ${isAnimating(tab.id, 'up') ? 'moving-up' : ''} ${isAnimating(tab.id, 'down') ? 'moving-down' : ''} ${isAnimating(tab.id, 'displaced-up') ? 'displaced-up' : ''} ${isAnimating(tab.id, 'displaced-down') ? 'displaced-down' : ''} ${dropZoneType === 'child' ? `drop-target-child drop-target-child-level-${level}` : ''} ${dropZoneType === 'sibling' ? 'drop-target-sibling' : ''}`}
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
        onDragStart={handleDragStart}
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
        {showFavicons && (
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
        )}
        <div className="tab-info">
          <div className="tab-title">{tab.title}</div>
          {showTabUrls && <div className="tab-url">{tab.url}</div>}
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
      {hasChildren && isExpanded && !isDragCollapsed && (
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