import React, { useState, useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import TabTreeComponent from './components/TabTreeComponent';

function App() {
  const [tabHierarchy, setTabHierarchy] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
          setError(response?.error || 'Failed to fetch tab hierarchy');
        }
      } catch (err) {
        if (isActive) {
          setError('Error communicating with background script: ' + err.message);
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

  if (loading) {
    return (
      <div data-testid="sidebar-container" className="sidebar-container">
        <h1>🐃 Moose Tabs</h1>
        <div className="loading">Loading tab hierarchy...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div data-testid="sidebar-container" className="sidebar-container">
        <h1>🐃 Moose Tabs</h1>
        <div className="error">Error: {error}</div>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return (
    <div data-testid="sidebar-container" className="sidebar-container">
      <h1>🐃 Moose Tabs</h1>
      <DndProvider backend={HTML5Backend}>
        <TabTreeComponent tabHierarchy={tabHierarchy} />
      </DndProvider>
    </div>
  );
}

export default App;