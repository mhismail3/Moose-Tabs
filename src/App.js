import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import TabTreeComponent from './components/TabTreeComponent';
import { initializeEnhancedTheme } from './utils/enhancedThemeDetection';
import { getMessage } from './utils/i18n';
import { SettingsProvider } from './contexts/SettingsContext';
import ErrorBoundary from './utils/errorBoundary';
import { initializeLogger, logger } from './utils/logger';

function AppContent() {
  const [tabHierarchy, setTabHierarchy] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentTheme, setCurrentTheme] = useState('light');
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  
  // Port connection ref
  const portRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 5;

  // Initialize logger
  useEffect(() => {
    initializeLogger().then(() => {
      logger.info('Moose Tabs sidebar initialized');
    });
  }, []);

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

  // Handle messages from background script port
  const handlePortMessage = useCallback((message) => {
    console.log('Received port message:', message.type);
    
    switch (message.type) {
      case 'hierarchyUpdated':
        setTabHierarchy(message.hierarchy || []);
        setLoading(false);
        setError(null);
        break;
        
      case 'hierarchyResponse':
        setTabHierarchy(message.hierarchy || []);
        setLoading(false);
        setError(null);
        break;
        
      case 'error':
        console.error('Background error:', message.error);
        setError(message.error);
        break;
        
      default:
        console.log('Unknown message type:', message.type);
    }
  }, []);

  // Connect to background script via port
  const connectToBackground = useCallback(() => {
    try {
      // Clean up existing connection
      if (portRef.current) {
        try {
          portRef.current.disconnect();
        } catch (e) {
          // Ignore disconnect errors
        }
      }

      console.log('Connecting to background via port...');
      const port = chrome.runtime.connect({ name: 'sidebar' });
      portRef.current = port;
      setConnectionStatus('connected');
      reconnectAttemptsRef.current = 0;

      port.onMessage.addListener(handlePortMessage);

      port.onDisconnect.addListener(() => {
        console.log('Port disconnected');
        portRef.current = null;
        setConnectionStatus('disconnected');
        
        // Attempt to reconnect
        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
          console.log(`Attempting reconnect in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connectToBackground();
          }, delay);
        } else {
          setError('Lost connection to background. Please reload the extension.');
        }
      });

      return port;
    } catch (error) {
      console.error('Failed to connect to background:', error);
      setError('Failed to connect to background script');
      setConnectionStatus('error');
      return null;
    }
  }, [handlePortMessage]);

  // Fallback fetch via message passing
  const fetchTabHierarchy = useCallback(async () => {
    try {
      setError(null);
      
      const response = await chrome.runtime.sendMessage({
        action: 'getTabHierarchy'
      });
      
      if (response && response.success) {
        console.log('App.js received hierarchy via message:', response.hierarchy?.length, 'tabs');
        setTabHierarchy(response.hierarchy || []);
        return true;
      } else {
        throw new Error(response?.error || 'Failed to fetch hierarchy');
      }
    } catch (err) {
      console.error('Fetch hierarchy error:', err);
      return false;
    }
  }, []);

  // Main connection and data management
  useEffect(() => {
    let isActive = true;
    let pollInterval = null;

    const setup = async () => {
      // Try port connection first
      const port = connectToBackground();
      
      if (!port) {
        // Fallback to message-based communication
        console.log('Port connection failed, using fallback');
        const success = await fetchTabHierarchy();
        if (!success) {
          setError(getMessage('error_communication', [], 'Failed to fetch tab hierarchy'));
        }
      }

      setLoading(false);

      // Set up fallback polling for updates (in case port messages don't work)
      pollInterval = setInterval(async () => {
        if (isActive && connectionStatus !== 'connected') {
          await fetchTabHierarchy();
        }
      }, 5000); // Poll every 5 seconds as fallback
    };

    // Listen for messages (backup for when port doesn't work)
    const handleRuntimeMessage = (message, sender, sendResponse) => {
      if (message.type === 'hierarchyUpdated' || message.action === 'hierarchyUpdated') {
        console.log('Received hierarchy via runtime message');
        setTabHierarchy(message.hierarchy || []);
        if (sendResponse) {
          sendResponse({ received: true });
        }
      }
    };

    chrome.runtime.onMessage.addListener(handleRuntimeMessage);

    setup();

    // Cleanup
    return () => {
      isActive = false;
      
      if (pollInterval) {
        clearInterval(pollInterval);
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      if (portRef.current) {
        try {
          portRef.current.disconnect();
        } catch (e) {
          // Ignore
        }
        portRef.current = null;
      }
      
      chrome.runtime.onMessage.removeListener(handleRuntimeMessage);
    };
  }, [connectToBackground, fetchTabHierarchy, connectionStatus]);

  // Handle refresh request
  const handleRefresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Try to request refresh from background
      await chrome.runtime.sendMessage({ action: 'refreshHierarchy' });
      
      // If port is connected, it will receive the update
      // Otherwise, fetch directly
      if (connectionStatus !== 'connected') {
        await fetchTabHierarchy();
      }
    } catch (err) {
      console.error('Refresh failed:', err);
      await fetchTabHierarchy();
    }
    
    setLoading(false);
  }, [connectionStatus, fetchTabHierarchy]);

  return (
    <SettingsProvider>
      <div data-testid="sidebar-container" className="sidebar-container">
        {loading ? (
          <div className="loading">{getMessage('loading_text', [], 'Loading tab hierarchy...')}</div>
        ) : error ? (
          <div className="error-container">
            <div className="error">Error: {error}</div>
            <button onClick={handleRefresh}>
              {getMessage('error_retry_button', [], 'Retry')}
            </button>
          </div>
        ) : tabHierarchy.length === 0 ? (
          <div className="no-tabs">
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
    </SettingsProvider>
  );
}

// Main App component with error boundary
function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

export default App;
