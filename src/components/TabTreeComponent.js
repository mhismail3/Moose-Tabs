import React, { useState, useMemo, useEffect } from 'react';
import TabItem from './TabItem';
import { getMessage } from '../utils/i18n';
import { DropZoneProvider } from './context/DropZoneContext';
import { TutorialProvider, useTutorial } from './tutorial/TutorialContext';
import TutorialOverlay from './tutorial/TutorialOverlay';
import AIOrganizePanel from './AIOrganizePanel';
import AIActionsPanel from './AIActionsPanel';
import { useSettings } from '../contexts/SettingsContext';
import './TabTree.css';

// Inner component that uses tutorial context
function TabTreeContent({ tabHierarchy = [] }) {
  const { settings } = useSettings();
  const [searchTerm, setSearchTerm] = useState('');
  const [customWindowNames, setCustomWindowNames] = useState({});
  const [editingWindowId, setEditingWindowId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [showAIActionsPanel, setShowAIActionsPanel] = useState(false);
  
  // Check if AI is enabled
  const aiEnabled = settings?.ai?.enabled ?? false;
  
  // Get search settings with fallback defaults
  const caseSensitive = settings?.search?.caseSensitive ?? false;
  const searchInUrls = settings?.search?.searchInUrls ?? true;
  
  // Get appearance settings with fallback defaults
  const viewDensity = settings?.appearance?.viewDensity ?? 'normal';
  const reducedMotion = settings?.appearance?.reducedMotion ?? false;
  
  // Get accessibility settings with fallback defaults
  const highContrast = settings?.accessibility?.highContrast ?? false;
  
  // Tutorial context
  const { 
    isActive: tutorialActive, 
    currentStep,
    nextStep, 
    previousStep, 
    skipTutorial 
  } = useTutorial();

  const handleClearSearch = () => {
    setSearchTerm('');
  };

  // Handle tutorial keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Only handle tutorial shortcuts when tutorial is active
      if (!tutorialActive) return;
      
      // Don't interfere with input fields
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          skipTutorial();
          break;
        case 'ArrowRight':
          e.preventDefault();
          nextStep();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (currentStep > 0) {
            previousStep();
          }
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [tutorialActive, currentStep, nextStep, previousStep, skipTutorial]);

  // Load custom window names from Chrome storage on mount
  useEffect(() => {
    const loadWindowNames = async () => {
      try {
        const result = await chrome.storage.local.get(['customWindowNames']);
        if (result.customWindowNames) {
          setCustomWindowNames(result.customWindowNames);
        }
      } catch (error) {
        console.log('Failed to load custom window names:', error);
      }
    };
    
    if (typeof chrome !== 'undefined' && chrome.storage) {
      loadWindowNames();
    }
  }, []);

  // Save custom window names to Chrome storage
  const saveWindowNames = async (windowNames) => {
    try {
      await chrome.storage.local.set({ customWindowNames: windowNames });
    } catch (error) {
      console.log('Failed to save custom window names:', error);
    }
  };

  // Handle double-click to start editing
  const handleWindowLabelDoubleClick = (windowId) => {
    const currentName = customWindowNames[windowId] || `Window ${windowId}`;
    setEditingWindowId(windowId);
    setEditingName(currentName);
  };

  // Handle saving the edited name
  const handleSaveWindowName = async () => {
    if (editingWindowId && editingName.trim()) {
      const newCustomNames = {
        ...customWindowNames,
        [editingWindowId]: editingName.trim()
      };
      setCustomWindowNames(newCustomNames);
      await saveWindowNames(newCustomNames);
    }
    setEditingWindowId(null);
    setEditingName('');
  };

  // Handle canceling the edit
  const handleCancelEdit = () => {
    setEditingWindowId(null);
    setEditingName('');
  };

  // Handle key press in edit input
  const handleEditKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSaveWindowName();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  // Get display name for a window
  const getWindowDisplayName = (windowId) => {
    return customWindowNames[windowId] || `Window ${windowId}`;
  };

  // Fuzzy matching function
  const fuzzyMatch = (text, search) => {
    if (!search) return true;
    
    // Use case-sensitive or case-insensitive matching based on setting
    const searchText = caseSensitive ? search : search.toLowerCase();
    const targetText = caseSensitive ? text : text.toLowerCase();
    
    // Simple fuzzy matching: check if all characters of search exist in order in text
    let searchIndex = 0;
    for (let i = 0; i < targetText.length && searchIndex < searchText.length; i++) {
      if (targetText[i] === searchText[searchIndex]) {
        searchIndex++;
      }
    }
    return searchIndex === searchText.length;
  };

  // Recursively filter tabs based on search term
  const filterTabs = (tabs) => {
    if (!searchTerm.trim()) return tabs;
    
    return tabs.reduce((filtered, tab) => {
      const matchesTitle = fuzzyMatch(tab.title || '', searchTerm);
      const matchesUrl = searchInUrls ? fuzzyMatch(tab.url || '', searchTerm) : false;
      
      if (matchesTitle || matchesUrl) {
        // If parent matches, include all children
        filtered.push(tab);
      } else if (tab.children && tab.children.length > 0) {
        // Check if any children match
        const filteredChildren = filterTabs(tab.children);
        if (filteredChildren.length > 0) {
          // Include parent with filtered children
          filtered.push({
            ...tab,
            children: filteredChildren
          });
        }
      }
      
      return filtered;
    }, []);
  };

  const filteredHierarchy = useMemo(() => filterTabs(tabHierarchy), [tabHierarchy, searchTerm, caseSensitive, searchInUrls]);

  // Helper to count all tabs in a hierarchy (including children)
  const countAllTabsInHierarchy = (tabs) => {
    let count = 0;
    for (const tab of tabs) {
      count += 1; // Count the tab itself
      if (tab.children && tab.children.length > 0) {
        count += countAllTabsInHierarchy(tab.children); // Count children recursively
      }
    }
    return count;
  };

  // Group tabs by window ID and count all tabs per window
  const groupedByWindows = useMemo(() => {
    if (!filteredHierarchy.length) return [];
    
    const windows = new Map();
    
    // Group root tabs by window ID
    filteredHierarchy.forEach(tab => {
      const windowId = tab.windowId;
      if (!windows.has(windowId)) {
        windows.set(windowId, []);
      }
      windows.get(windowId).push(tab);
    });
    
    // Convert to array and sort by window ID for consistent ordering
    return Array.from(windows.entries())
      .sort(([a], [b]) => a - b)
      .map(([windowId, tabs]) => ({
        windowId,
        tabs: tabs.sort((a, b) => (a.index || 0) - (b.index || 0)),
        totalTabCount: countAllTabsInHierarchy(tabs) // Count all tabs including children
      }));
  }, [filteredHierarchy]);

  // Helper to flatten the hierarchy into a flat array of all tabs
  const flattenTabs = (tabs) => {
    let flat = [];
    for (const tab of tabs) {
      flat.push(tab);
      if (tab.children && tab.children.length > 0) {
        flat = flat.concat(flattenTabs(tab.children));
      }
    }
    return flat;
  };
  // Sort by index to match browser order
  const allTabsInWindow = useMemo(() => {
    const flat = flattenTabs(tabHierarchy);
    return flat.slice().sort((a, b) => (a.index || 0) - (b.index || 0));
  }, [tabHierarchy]);

  return (
    <DropZoneProvider>
      <div data-testid="tab-tree-container" className="tab-tree">
        
        <div className="search-bar-container">
          <div className="search-input-wrapper">
            <div className="search-input-container">
              <input
                type="text"
                className="search-bar"
                placeholder="Search tabs"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Search tabs"
              />
              <button
                className={`search-clear-btn ${searchTerm.trim() ? 'visible' : ''}`}
                onClick={handleClearSearch}
                aria-label="Clear search"
                type="button"
              >
                ×
              </button>
            </div>
            {aiEnabled && (
              <>
                <button
                  className="ai-organize-btn"
                  onClick={() => setShowAIPanel(true)}
                  title="Organize tabs with AI"
                  aria-label="Organize tabs with AI"
                >
                  🤖
                </button>
                <button
                  className="ai-actions-btn"
                  onClick={() => setShowAIActionsPanel(true)}
                  title="AI Actions"
                  aria-label="AI Actions on tabs"
                >
                  ✨
                </button>
              </>
            )}
          </div>
        </div>
        
        {(!tabHierarchy || tabHierarchy.length === 0) ? (
          <div className="empty-state">{getMessage('no_tabs_available', [], 'No tabs available')}</div>
        ) : (
          <div 
            className={`tab-tree-content view-density-${viewDensity} ${reducedMotion ? 'reduced-motion' : ''} ${highContrast ? 'high-contrast' : ''}`}
            role="tree"
            aria-label={getMessage('tree_aria_label', [], 'Tab hierarchy tree')}
          >
            {groupedByWindows.length === 0 && searchTerm.trim() ? (
              <div className="empty-state">No tabs match your search</div>
            ) : (
              groupedByWindows.map((windowGroup, windowIndex) => (
                <div key={windowGroup.windowId} className="window-group">
                  <div 
                    className={`window-label ${editingWindowId === windowGroup.windowId ? 'editing' : ''}`}
                    onDoubleClick={() => handleWindowLabelDoubleClick(windowGroup.windowId)}
                    title="Double-click to edit window name"
                  >
                    {editingWindowId === windowGroup.windowId ? (
                      <div className="window-label-edit">
                        <input
                          type="text"
                          className="window-name-input"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={handleEditKeyPress}
                          onBlur={handleSaveWindowName}
                          autoFocus
                          maxLength={50}
                          placeholder="Enter window name"
                        />
                        <span className="window-tab-count">({windowGroup.totalTabCount} tab{windowGroup.totalTabCount !== 1 ? 's' : ''})</span>
                      </div>
                    ) : (
                      <>
                        <span className="window-name">
                          {getWindowDisplayName(windowGroup.windowId)}
                        </span>
                        <span className="window-tab-count">({windowGroup.totalTabCount} tab{windowGroup.totalTabCount !== 1 ? 's' : ''})</span>
                      </>
                    )}
                  </div>
                  <div className="window-tabs" role="group" aria-label={`Window ${windowGroup.windowId} tabs`}>
                    {windowGroup.tabs.map((tab, tabIndex) => (
                      <TabItem 
                        key={tab.id} 
                        tab={tab} 
                        level={0} 
                        isFirst={windowIndex === 0 && tabIndex === 0}
                        totalSiblings={windowGroup.tabs.length}
                        positionInSet={tabIndex + 1}
                        allTabsInWindow={allTabsInWindow}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
      
      {/* AI Organization Panel */}
      {showAIPanel && (
        <AIOrganizePanel
          tabs={tabHierarchy}
          onClose={() => setShowAIPanel(false)}
        />
      )}
      
      {/* AI Actions Panel */}
      {showAIActionsPanel && (
        <AIActionsPanel
          tabs={tabHierarchy}
          onClose={() => setShowAIActionsPanel(false)}
        />
      )}
      
      {/* Tutorial Overlay */}
      <TutorialOverlay />
    </DropZoneProvider>
  );
}

// Main component wrapper with tutorial provider
function TabTreeComponent({ tabHierarchy = [] }) {
  return (
    <TutorialProvider>
      <TabTreeContent tabHierarchy={tabHierarchy} />
    </TutorialProvider>
  );
}

export default TabTreeComponent;