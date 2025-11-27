import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import TabTreeComponent from './components/TabTreeComponent';
import { initializeEnhancedTheme } from './utils/enhancedThemeDetection';
import { getMessage } from './utils/i18n';
import { SettingsProvider } from './contexts/SettingsContext';
import './index.css';
import './styles/popup.css';

function PopupApp() {
  const [tabHierarchy, setTabHierarchy] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentTheme, setCurrentTheme] = useState('light');
  
  // Port connection
  const portRef = useRef(null);

  // Initialize theme
  useEffect(() => {
    let cleanupTheme;
    
    const initTheme = async () => {
      try {
        cleanupTheme = await initializeEnhancedTheme((theme) => {
          setCurrentTheme(theme);
        });
      } catch (error) {
        console.error('Failed to initialize theme:', error);
        const { initializeTheme } = await import('./utils/themeDetection');
        cleanupTheme = initializeTheme((theme) => {
          setCurrentTheme(theme);
        });
      }
    };
    
    initTheme();

    return () => {
      if (cleanupTheme) cleanupTheme();
    };
  }, []);

  // Handle messages from background
  const handleMessage = useCallback((message) => {
    if (message.type === 'hierarchyUpdated' || message.type === 'hierarchyResponse') {
      setTabHierarchy(message.hierarchy || []);
      setLoading(false);
      setError(null);
    } else if (message.type === 'error') {
      setError(message.error);
    }
  }, []);

  // Connect and fetch data
  useEffect(() => {
    let isActive = true;

    const setup = async () => {
      try {
        // Connect via port
        const port = chrome.runtime.connect({ name: 'sidebar' });
        portRef.current = port;

        port.onMessage.addListener(handleMessage);

        port.onDisconnect.addListener(() => {
          portRef.current = null;
          if (isActive) {
            // Try message fallback
            fetchViaMessage();
          }
        });

      } catch (error) {
        console.error('Port connection failed:', error);
        // Fallback to message-based fetch
        await fetchViaMessage();
      }
    };

    const fetchViaMessage = async () => {
      try {
        const response = await chrome.runtime.sendMessage({
          action: 'getTabHierarchy'
        });
        
        if (response?.success) {
          setTabHierarchy(response.hierarchy || []);
        } else {
          setError(response?.error || 'Failed to load tabs');
        }
      } catch (err) {
        setError('Failed to communicate with extension');
      }
      setLoading(false);
    };

    // Listen for runtime messages too
    const messageListener = (message) => {
      if (message.type === 'hierarchyUpdated' || message.action === 'hierarchyUpdated') {
        setTabHierarchy(message.hierarchy || []);
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);
    setup();

    return () => {
      isActive = false;
      chrome.runtime.onMessage.removeListener(messageListener);
      if (portRef.current) {
        try {
          portRef.current.disconnect();
        } catch (e) {
          // Ignore
        }
      }
    };
  }, [handleMessage]);

  // Handle refresh
  const handleRefresh = async () => {
    setLoading(true);
    try {
      await chrome.runtime.sendMessage({ action: 'refreshHierarchy' });
    } catch (err) {
      console.error('Refresh failed:', err);
    }
    setLoading(false);
  };

  // Handle opening in sidebar
  const handleOpenSidebar = async () => {
    try {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (activeTab) {
        await chrome.sidePanel.open({ windowId: activeTab.windowId });
        window.close(); // Close the popup
      }
    } catch (error) {
      console.error('Failed to open sidebar:', error);
    }
  };

  return (
    <SettingsProvider>
      <div className="popup-container">
        {/* Popup header */}
        <div className="popup-header">
          <div className="popup-title">
            <img src="icons/icon48.png" alt="Moose Tabs" className="popup-logo-img" />
            <span>Moose Tabs</span>
          </div>
          <div className="popup-actions">
            <button 
              className="popup-sidebar-btn" 
              onClick={handleOpenSidebar}
              title="Pin to Sidebar"
              aria-label="Pin to sidebar"
            >
              <span className="sidebar-btn-icon">◫</span>
              <span className="sidebar-btn-text">Pin to Sidebar</span>
            </button>
          </div>
        </div>

        {/* Content area */}
        <div className="popup-content">
          {loading ? (
            <div className="popup-loading-state">
              <div className="popup-spinner"></div>
              <span>{getMessage('loading_text', [], 'Loading...')}</span>
            </div>
          ) : error ? (
            <div className="popup-error-state">
              <p>{error}</p>
              <button onClick={handleRefresh}>
                {getMessage('error_retry_button', [], 'Retry')}
              </button>
            </div>
          ) : tabHierarchy.length === 0 ? (
            <div className="popup-empty-state">
              <p>{getMessage('no_tabs_available', [], 'No tabs available')}</p>
              <button onClick={handleRefresh}>
                {getMessage('refresh_button', [], 'Refresh')}
              </button>
            </div>
          ) : (
            <DndProvider backend={HTML5Backend}>
              <TabTreeComponent tabHierarchy={tabHierarchy} />
            </DndProvider>
          )}
        </div>

        {/* Footer */}
        <div className="popup-footer">
          <span className="popup-tab-count">
            {tabHierarchy.length > 0 ? `${countAllTabs(tabHierarchy)} tabs` : ''}
          </span>
        </div>
      </div>
    </SettingsProvider>
  );
}

// Helper to count all tabs including nested children
function countAllTabs(tabs) {
  let count = 0;
  for (const tab of tabs) {
    count++;
    if (tab.children && tab.children.length > 0) {
      count += countAllTabs(tab.children);
    }
  }
  return count;
}

export default PopupApp;



