import React, { useState, useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import TabTreeComponent from './components/TabTreeComponent';
import { initializeEnhancedTheme } from './utils/enhancedThemeDetection';
import { getMessage } from './utils/i18n';
import { SettingsProvider } from './contexts/SettingsContext';

function App() {
  const [tabHierarchy, setTabHierarchy] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentTheme, setCurrentTheme] = useState('light');

  // Initialize enhanced theme detection with settings support
  useEffect(() => {
    let cleanupTheme;
    
    const initTheme = async () => {
      try {
        cleanupTheme = await initializeEnhancedTheme((theme) => {
          setCurrentTheme(theme);
          console.log(`App theme updated to: ${theme}`);
        });
      } catch (error) {
        console.error('Failed to initialize enhanced theme:', error);
        // Fallback to basic theme detection
        const { initializeTheme } = await import('./utils/themeDetection');
        cleanupTheme = initializeTheme((theme) => {
          setCurrentTheme(theme);
          console.log(`App theme updated to: ${theme} (fallback)`);
        });
      }
    };
    
    initTheme();

    return () => {
      if (cleanupTheme) {
        cleanupTheme();
      }
    };
  }, []);

  // Tab hierarchy management
  useEffect(() => {
    let pollInterval;
    let isActive = true;
    
    // Function to fetch tab hierarchy from background script
    const fetchTabHierarchy = async () => {
      try {
        if (!isActive) return;
        
        setError(null);
        
        // Send message to background script to get tab hierarchy
        const response = await chrome.runtime.sendMessage({
          action: 'getTabHierarchy'
        });
        
        if (response && response.success) {
          console.log('App.js received hierarchy:', response.hierarchy);
          setTabHierarchy(response.hierarchy || []);
        } else {
          setError(response?.error || getMessage('error_communication', [], 'Failed to fetch tab hierarchy'));
        }
      } catch (err) {
        if (isActive) {
          setError(getMessage('error_communication', [], 'Error communicating with background script') + ': ' + err.message);
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    // Initial fetch
    fetchTabHierarchy();

    // Set up polling for regular updates (fallback if message passing fails)
    pollInterval = setInterval(() => {
      if (isActive) {
        fetchTabHierarchy();
      }
    }, 1000); // Poll every 1 second for more responsive updates

    // Listen for updates from background script (primary update mechanism)
    const handleMessage = (message, _sender, sendResponse) => {
      console.log('Sidebar received message:', message);
      if (message.action === 'hierarchyUpdated' && isActive) {
        console.log('App.js real-time hierarchy update:', message.hierarchy);
        setTabHierarchy(message.hierarchy || []);
        if (sendResponse) {
          sendResponse({received: true});
        }
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);

    // Notify background script that sidebar is active
    chrome.runtime.sendMessage({
      action: 'sidebarActive',
      timestamp: Date.now()
    }).catch(err => console.log('Failed to notify sidebar active:', err));

    // Cleanup on unmount
    return () => {
      isActive = false;
      if (pollInterval) {
        clearInterval(pollInterval);
      }
      chrome.runtime.onMessage.removeListener(handleMessage);
      
      // Notify background script that sidebar is inactive
      chrome.runtime.sendMessage({
        action: 'sidebarInactive',
        timestamp: Date.now()
      }).catch(err => console.log('Failed to notify sidebar inactive:', err));
    };
  }, []);

  return (
    <SettingsProvider>
      <div data-testid="sidebar-container" className="sidebar-container">
        {loading ? (
          <div className="loading">{getMessage('loading_text', [], 'Loading tab hierarchy...')}</div>
        ) : error ? (
          <>
            <div className="error">Error: {error}</div>
            <button onClick={() => window.location.reload()}>{getMessage('error_retry_button', [], 'Retry')}</button>
          </>
        ) : tabHierarchy.length === 0 ? (
          <div className="no-tabs">
            <p>{getMessage('no_tabs_available', [], 'No tabs available')}</p>
            <button onClick={() => window.location.reload()}>
              {getMessage('refresh_button', [], 'Refresh')}
            </button>
          </div>
        ) : (
          <DndProvider backend={HTML5Backend}>
            <TabTreeComponent tabHierarchy={tabHierarchy} />
          </DndProvider>
        )}
      </div>
    </SettingsProvider>
  );
}

export default App;