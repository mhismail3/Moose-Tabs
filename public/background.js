// Moose-Tabs Background Service Worker
// This service worker manages tab hierarchy tracking for the Chrome extension

console.log('Moose-Tabs background service worker loaded');

// Import TabTree class
importScripts('TabTree.js');

// Global tab hierarchy manager
let tabHierarchy = new TabTree();

// Extension installation handler
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('Moose-Tabs extension installed:', details.reason);
  
  if (details.reason === 'install') {
    console.log('Extension installed for the first time');
    
    // Initialize with existing tabs
    await initializeExistingTabs();
  }
});

// Keep service worker alive
chrome.runtime.onStartup.addListener(async () => {
  console.log('Browser startup detected');
  
  // Re-initialize tab hierarchy on startup
  tabHierarchy = new TabTree();
  await initializeExistingTabs();
});

// Tab event listeners with hierarchy tracking
chrome.tabs.onCreated.addListener((tab) => {
  console.log('Tab created:', tab.id, tab.url);
  addTab(tab);
});

chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  console.log('Tab removed:', tabId, removeInfo);
  removeTab(tabId);
});

chrome.tabs.onMoved.addListener((tabId, moveInfo) => {
  console.log('Tab moved:', tabId, moveInfo);
  updateTab(tabId, { index: moveInfo.toIndex, windowId: moveInfo.windowId });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url || changeInfo.title) {
    console.log('Tab updated:', tabId, changeInfo);
    updateTab(tabId, changeInfo);
  }
});

chrome.tabs.onAttached.addListener((tabId, attachInfo) => {
  console.log('Tab attached to window:', tabId, attachInfo);
  updateTab(tabId, { windowId: attachInfo.newWindowId, index: attachInfo.newPosition });
});

chrome.tabs.onDetached.addListener((tabId, detachInfo) => {
  console.log('Tab detached from window:', tabId, detachInfo);
  // Tab will be attached to a new window, so we'll handle it in onAttached
});

// Extension action click handler (opens side panel)
chrome.action.onClicked.addListener(async (tab) => {
  console.log('Extension action clicked');
  
  try {
    // Open side panel for the current window
    await chrome.sidePanel.open({ windowId: tab.windowId });
  } catch (error) {
    console.error('Failed to open side panel:', error);
  }
});

// Message handler for communication with UI
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received:', request);
  
  switch (request.action) {
    case 'getHierarchy':
      sendResponse({ hierarchy: getHierarchy(request.windowId) });
      break;
    case 'getTab':
      sendResponse({ tab: getTab(request.tabId) });
      break;
    default:
      sendResponse({ error: 'Unknown action' });
  }
  
  return true; // Keep message channel open for async response
});

// Core tab hierarchy functions

/**
 * Initialize tab hierarchy with existing tabs
 */
async function initializeExistingTabs() {
  try {
    console.log('Initializing existing tabs...');
    
    // Get all tabs from all windows
    const tabs = await chrome.tabs.query({});
    console.log(`Found ${tabs.length} existing tabs`);
    
    // Sort tabs by creation order (approximate using index)
    tabs.sort((a, b) => {
      if (a.windowId !== b.windowId) {
        return a.windowId - b.windowId;
      }
      return a.index - b.index;
    });
    
    // Add tabs to hierarchy
    for (const tab of tabs) {
      addTab(tab);
    }
    
    console.log('Tab hierarchy initialized');
  } catch (error) {
    console.error('Failed to initialize existing tabs:', error);
  }
}

/**
 * Add a tab to the hierarchy
 * @param {Object} tab - Chrome tab object
 */
function addTab(tab) {
  try {
    console.log(`Adding tab ${tab.id} to hierarchy`);
    tabHierarchy.addTab(tab);
    
    // Notify UI of hierarchy change
    notifyHierarchyChange();
  } catch (error) {
    console.error('Failed to add tab to hierarchy:', error);
  }
}

/**
 * Remove a tab from the hierarchy
 * @param {number} tabId - Tab ID to remove
 */
function removeTab(tabId) {
  try {
    console.log(`Removing tab ${tabId} from hierarchy`);
    tabHierarchy.removeTab(tabId);
    
    // Notify UI of hierarchy change
    notifyHierarchyChange();
  } catch (error) {
    console.error('Failed to remove tab from hierarchy:', error);
  }
}

/**
 * Update a tab in the hierarchy
 * @param {number} tabId - Tab ID to update
 * @param {Object} updates - Properties to update
 */
function updateTab(tabId, updates) {
  try {
    console.log(`Updating tab ${tabId} in hierarchy:`, updates);
    tabHierarchy.updateTab(tabId, updates);
    
    // Notify UI of hierarchy change if significant update
    if (updates.url || updates.title || updates.windowId) {
      notifyHierarchyChange();
    }
  } catch (error) {
    console.error('Failed to update tab in hierarchy:', error);
  }
}

/**
 * Get tab hierarchy
 * @param {number} windowId - Optional window ID filter
 * @returns {Array} Hierarchy structure
 */
function getHierarchy(windowId = null) {
  try {
    const hierarchy = tabHierarchy.getHierarchy(windowId);
    console.log(`Retrieved hierarchy for window ${windowId}:`, hierarchy.length, 'root tabs');
    return hierarchy;
  } catch (error) {
    console.error('Failed to get hierarchy:', error);
    return [];
  }
}

/**
 * Get a specific tab
 * @param {number} tabId - Tab ID
 * @returns {Object|null} Tab object or null
 */
function getTab(tabId) {
  try {
    const tab = tabHierarchy.getTab(tabId);
    console.log(`Retrieved tab ${tabId}:`, tab ? 'found' : 'not found');
    return tab || null;
  } catch (error) {
    console.error('Failed to get tab:', error);
    return null;
  }
}

/**
 * Notify UI components of hierarchy changes
 */
async function notifyHierarchyChange() {
  try {
    // Get all windows to send updates to all open sidebars
    const windows = await chrome.windows.getAll();
    
    for (const window of windows) {
      const hierarchy = getHierarchy(window.id);
      
      // Send message to any listening UI in this window
      chrome.runtime.sendMessage({
        action: 'hierarchyUpdated',
        windowId: window.id,
        hierarchy: hierarchy
      }).catch(() => {
        // Ignore errors if no UI is listening
      });
    }
  } catch (error) {
    console.error('Failed to notify hierarchy change:', error);
  }
}