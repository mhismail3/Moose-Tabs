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

// Tab event listeners with enhanced hierarchy tracking and error handling
chrome.tabs.onCreated.addListener(async (tab) => {
  console.log('Tab created:', tab.id, tab.url, 'opener:', tab.openerTabId);
  
  try {
    // Enhanced parent detection logic
    await handleTabCreated(tab);
  } catch (error) {
    console.error('Error handling tab creation:', error);
  }
});

chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
  console.log('Tab removed:', tabId, 'windowClosing:', removeInfo.isWindowClosing);
  
  try {
    await handleTabRemoved(tabId, removeInfo);
  } catch (error) {
    console.error('Error handling tab removal:', error);
  }
});

chrome.tabs.onMoved.addListener(async (tabId, moveInfo) => {
  console.log('Tab moved:', tabId, 'from index', moveInfo.fromIndex, 'to', moveInfo.toIndex, 'in window', moveInfo.windowId);
  
  try {
    await handleTabMoved(tabId, moveInfo);
  } catch (error) {
    console.error('Error handling tab move:', error);
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Only handle significant updates that affect hierarchy or display
  if (changeInfo.url || changeInfo.title || changeInfo.status === 'complete') {
    console.log('Tab updated:', tabId, 'changes:', Object.keys(changeInfo));
    
    try {
      await handleTabUpdated(tabId, changeInfo, tab);
    } catch (error) {
      console.error('Error handling tab update:', error);
    }
  }
});

chrome.tabs.onAttached.addListener(async (tabId, attachInfo) => {
  console.log('Tab attached to window:', tabId, 'new window:', attachInfo.newWindowId, 'position:', attachInfo.newPosition);
  
  try {
    await handleTabAttached(tabId, attachInfo);
  } catch (error) {
    console.error('Error handling tab attachment:', error);
  }
});

chrome.tabs.onDetached.addListener(async (tabId, detachInfo) => {
  console.log('Tab detached from window:', tabId, 'old window:', detachInfo.oldWindowId, 'position:', detachInfo.oldPosition);
  
  try {
    await handleTabDetached(tabId, detachInfo);
  } catch (error) {
    console.error('Error handling tab detachment:', error);
  }
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

// Enhanced Tab Event Handlers

/**
 * Handle tab creation with enhanced parent detection
 * @param {Object} tab - Chrome tab object
 */
async function handleTabCreated(tab) {
  try {
    // Validate tab data
    if (!tab || typeof tab.id !== 'number') {
      console.error('Invalid tab data received:', tab);
      return;
    }

    console.log(`Processing tab creation: ${tab.id}`);
    
    // Enhanced tab object with better parent detection
    const enhancedTab = { ...tab };
    
    // Validate opener relationship
    if (tab.openerTabId) {
      const openerExists = tabHierarchy.getTab(tab.openerTabId);
      if (!openerExists) {
        console.log(`Opener tab ${tab.openerTabId} not found, orphaning tab ${tab.id}`);
        enhancedTab.openerTabId = null;
      } else {
        console.log(`Valid opener relationship: ${tab.id} -> ${tab.openerTabId}`);
      }
    }
    
    // Add to hierarchy
    addTab(enhancedTab);
  } catch (error) {
    console.error('Error in handleTabCreated:', error);
  }
}

/**
 * Handle tab removal with cleanup
 * @param {number} tabId - Tab ID
 * @param {Object} removeInfo - Removal info
 */
async function handleTabRemoved(tabId, removeInfo) {
  try {
    if (typeof tabId !== 'number') {
      console.error('Invalid tabId for removal:', tabId);
      return;
    }

    console.log(`Processing tab removal: ${tabId}, window closing: ${removeInfo?.isWindowClosing}`);
    
    const tab = tabHierarchy.getTab(tabId);
    if (tab) {
      const childCount = tabHierarchy.getChildren(tabId).length;
      if (childCount > 0) {
        console.log(`Removing parent tab ${tabId} with ${childCount} children - children will be orphaned`);
      }
    }
    
    removeTab(tabId);
  } catch (error) {
    console.error('Error in handleTabRemoved:', error);
  }
}

/**
 * Handle tab movement with index updates
 * @param {number} tabId - Tab ID
 * @param {Object} moveInfo - Movement info
 */
async function handleTabMoved(tabId, moveInfo) {
  try {
    if (typeof tabId !== 'number' || !moveInfo) {
      console.error('Invalid parameters for tab move:', tabId, moveInfo);
      return;
    }

    console.log(`Processing tab move: ${tabId} to index ${moveInfo.toIndex} in window ${moveInfo.windowId}`);
    
    // Update tab position
    updateTab(tabId, { 
      index: moveInfo.toIndex,
      windowId: moveInfo.windowId 
    });
  } catch (error) {
    console.error('Error in handleTabMoved:', error);
  }
}

/**
 * Handle tab updates with selective processing
 * @param {number} tabId - Tab ID
 * @param {Object} changeInfo - Change info
 * @param {Object} tab - Complete tab object
 */
async function handleTabUpdated(tabId, changeInfo, tab) {
  try {
    if (typeof tabId !== 'number' || !changeInfo || !tab) {
      console.error('Invalid parameters for tab update:', tabId, changeInfo, tab);
      return;
    }

    console.log(`Processing tab update: ${tabId}`, changeInfo);
    
    // Only update for significant changes
    const significantChanges = {};
    
    if (changeInfo.url) {
      significantChanges.url = changeInfo.url;
    }
    
    if (changeInfo.title) {
      significantChanges.title = changeInfo.title;
    }
    
    // Handle status changes for potential parent detection improvements
    if (changeInfo.status === 'complete' && tab.openerTabId) {
      // Re-validate opener relationship on completion
      const openerExists = tabHierarchy.getTab(tab.openerTabId);
      if (openerExists && tabHierarchy.getTab(tabId).parentId !== tab.openerTabId) {
        console.log(`Updating parent relationship for ${tabId} to ${tab.openerTabId} on completion`);
        significantChanges.openerTabId = tab.openerTabId;
      }
    }
    
    if (Object.keys(significantChanges).length > 0) {
      updateTab(tabId, significantChanges);
    }
  } catch (error) {
    console.error('Error in handleTabUpdated:', error);
  }
}

/**
 * Handle tab attachment to new window
 * @param {number} tabId - Tab ID
 * @param {Object} attachInfo - Attachment info
 */
async function handleTabAttached(tabId, attachInfo) {
  try {
    if (typeof tabId !== 'number' || !attachInfo) {
      console.error('Invalid parameters for tab attachment:', tabId, attachInfo);
      return;
    }

    console.log(`Processing tab attachment: ${tabId} to window ${attachInfo.newWindowId} at position ${attachInfo.newPosition}`);
    
    // Update window and position
    updateTab(tabId, {
      windowId: attachInfo.newWindowId,
      index: attachInfo.newPosition
    });
  } catch (error) {
    console.error('Error in handleTabAttached:', error);
  }
}

/**
 * Handle tab detachment from window
 * @param {number} tabId - Tab ID
 * @param {Object} detachInfo - Detachment info
 */
async function handleTabDetached(tabId, detachInfo) {
  try {
    if (typeof tabId !== 'number' || !detachInfo) {
      console.error('Invalid parameters for tab detachment:', tabId, detachInfo);
      return;
    }

    console.log(`Processing tab detachment: ${tabId} from window ${detachInfo.oldWindowId}`);
    
    // Tab is being moved to a new window
    // The onAttached event will handle the final positioning
    // We could potentially update the tab here if needed, but usually onAttached handles it
  } catch (error) {
    console.error('Error in handleTabDetached:', error);
  }
}

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
    
    // Notify UI of hierarchy change (debounced)
    debounceNotifyHierarchyChange();
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
    
    // Notify UI of hierarchy change (debounced)
    debounceNotifyHierarchyChange();
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
    
    // Notify UI of hierarchy change if significant update (debounced)
    if (updates.url || updates.title || updates.windowId || updates.openerTabId !== undefined) {
      debounceNotifyHierarchyChange();
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
 * Notify UI components of hierarchy changes with enhanced error handling
 */
async function notifyHierarchyChange() {
  try {
    // Get all windows to send updates to all open sidebars
    const windows = await chrome.windows.getAll();
    console.log(`Notifying hierarchy change to ${windows.length} windows`);
    
    for (const window of windows) {
      try {
        const hierarchy = getHierarchy(window.id);
        
        // Send message to any listening UI in this window
        const message = {
          action: 'hierarchyUpdated',
          windowId: window.id,
          hierarchy: hierarchy,
          timestamp: Date.now()
        };
        
        await chrome.runtime.sendMessage(message);
        console.log(`Hierarchy update sent to window ${window.id}`);
      } catch (messageError) {
        // Ignore errors if no UI is listening (this is expected)
        console.log(`No listener for window ${window.id} (expected if sidebar not open)`);
      }
    }
  } catch (error) {
    console.error('Failed to notify hierarchy change:', error);
  }
}

/**
 * Enhanced debounced notification to handle rapid changes
 */
let notificationDebounceTimer = null;
const NOTIFICATION_DEBOUNCE_MS = 100;

function debounceNotifyHierarchyChange() {
  if (notificationDebounceTimer) {
    clearTimeout(notificationDebounceTimer);
  }
  
  notificationDebounceTimer = setTimeout(() => {
    notifyHierarchyChange();
    notificationDebounceTimer = null;
  }, NOTIFICATION_DEBOUNCE_MS);
}