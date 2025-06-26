// Moose-Tabs Background Service Worker
// This service worker manages tab hierarchy tracking for the Chrome extension

console.log('Moose-Tabs background service worker loaded');

// Import TabTree class
importScripts('TabTree.js');

// Global tab hierarchy manager
let tabHierarchy = new TabTree();

// Track active sidebar instances
let activeSidebars = new Set();

// Extension installation handler
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('Moose-Tabs extension installed:', details.reason);
  
  if (details.reason === 'install') {
    console.log('Extension installed for the first time');
    
    // Initialize with existing tabs
    await initializeExistingTabs();
  }
});

// Keep service worker alive and handle various startup scenarios
chrome.runtime.onStartup.addListener(async () => {
  console.log('Browser startup detected');
  
  // Re-initialize tab hierarchy on startup
  tabHierarchy = new TabTree();
  await initializeExistingTabs();
});

// Handle service worker wakeup (when Chrome reactivates a suspended service worker)
// This is crucial for preventing "No tabs available" issues
if (typeof chrome !== 'undefined' && chrome.runtime) {
  // This code runs when the service worker script is loaded/reloaded
  console.log('Service worker loaded/reloaded - checking if initialization needed');
  
  // Small delay to ensure Chrome API is ready
  setTimeout(async () => {
    try {
      if (!tabHierarchy || tabHierarchy.constructor.name !== 'TabTree') {
        console.log('TabTree not initialized, creating new instance');
        tabHierarchy = new TabTree();
      }
      
      // Always check if we need to initialize when service worker starts
      await ensureHierarchyInitialized();
    } catch (error) {
      console.error('Error during service worker startup initialization:', error);
    }
  }, 100);
}

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
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  console.log('Message received:', request);
  
  try {
    switch (request.action) {
      case 'getTabHierarchy':
      case 'getHierarchy':
        // Check if hierarchy is empty and re-initialize if needed
        const requestedWindowId = request.windowId;
        let hierarchy = getHierarchy(requestedWindowId);
        
        // If hierarchy is empty, try to re-initialize from existing tabs
        if (hierarchy.length === 0) {
          console.log('Hierarchy is empty, re-initializing from existing tabs');
          await initializeExistingTabs();
          hierarchy = getHierarchy(requestedWindowId);
        }
        
        sendResponse({ 
          success: true, 
          hierarchy: hierarchy,
          windowId: requestedWindowId || 'all',
          timestamp: Date.now()
        });
        break;
      case 'getTab':
        const tab = getTab(request.tabId);
        sendResponse({ 
          success: true, 
          tab: tab 
        });
        break;
      case 'sidebarActive':
        console.log('Sidebar became active');
        activeSidebars.add(sender);
        
        // Ensure hierarchy is initialized before sending to sidebar
        await ensureHierarchyInitialized();
        
        // Send immediate hierarchy update to newly active sidebar with all windows
        const currentHierarchy = getHierarchy(null); // null = all windows
        setTimeout(() => {
          notifySpecificSidebar(sender, currentHierarchy);
        }, 100);
        sendResponse({ success: true });
        break;
      case 'sidebarInactive':
        console.log('Sidebar became inactive');
        activeSidebars.delete(sender);
        sendResponse({ success: true });
        break;
      case 'refreshHierarchy':
        console.log('Force refresh hierarchy requested');
        // Immediately notify all sidebars with current hierarchy
        const refreshedHierarchy = getHierarchy(null); // null = all windows
        setTimeout(() => {
          notifyHierarchyChange();
        }, 50); // Small delay to ensure any pending updates are processed
        sendResponse({ 
          success: true, 
          hierarchy: refreshedHierarchy,
          timestamp: Date.now()
        });
        break;
      case 'closeTab':
        console.log('Closing tab:', request.tabId);
        try {
          await chrome.tabs.remove(request.tabId);
          sendResponse({ success: true });
        } catch (error) {
          console.error('Failed to close tab:', error);
          sendResponse({ success: false, error: error.message });
        }
        break;
      case 'switchToTab':
        console.log('Switching to tab:', request.tabId);
        try {
          const tab = await chrome.tabs.get(request.tabId);
          await chrome.tabs.update(request.tabId, { active: true });
          await chrome.windows.update(tab.windowId, { focused: true });
          sendResponse({ success: true });
        } catch (error) {
          console.error('Failed to switch to tab:', error);
          sendResponse({ success: false, error: error.message });
        }
        break;
      case 'updateParentRelationship':
        console.log('Updating parent relationship:', request.tabId, '->', request.parentId);
        try {
          // Use the TabTree's internal method to update parent relationship
          tabHierarchy._updateParentRelationship(request.tabId, request.parentId);
          
          // Notify all sidebars of the hierarchy change
          await notifyHierarchyChange();
          
          sendResponse({ success: true });
        } catch (error) {
          console.error('Failed to update parent relationship:', error);
          sendResponse({ success: false, error: error.message });
        }
        break;
      case 'getTabParent':
        console.log('Getting parent for tab:', request.tabId);
        try {
          const tab = tabHierarchy.getTab(request.tabId);
          const parentId = tab ? tab.parentId : null;
          
          sendResponse({ 
            success: true, 
            parentId: parentId,
            tabId: request.tabId
          });
        } catch (error) {
          console.error('Failed to get tab parent:', error);
          sendResponse({ success: false, error: error.message });
        }
        break;
      default:
        sendResponse({ 
          success: false, 
          error: 'Unknown action: ' + request.action 
        });
    }
  } catch (error) {
    console.error('Error handling message:', error);
    sendResponse({ 
      success: false, 
      error: error.message 
    });
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
 * Handle tab movement with full window synchronization
 * @param {number} tabId - Tab ID
 * @param {Object} moveInfo - Movement info
 */
async function handleTabMoved(tabId, moveInfo) {
  try {
    if (typeof tabId !== 'number' || !moveInfo) {
      console.error('Invalid parameters for tab move:', tabId, moveInfo);
      return;
    }

    console.log(`Processing tab move: ${tabId} from index ${moveInfo.fromIndex} to ${moveInfo.toIndex} in window ${moveInfo.windowId}`);
    
    // When a tab is moved, ALL tab indices in that window may have changed
    // We need to refresh all tabs in the affected window to get accurate indices
    try {
      const allTabsInWindow = await chrome.tabs.query({ windowId: moveInfo.windowId });
      
      console.log(`Refreshing indices for all ${allTabsInWindow.length} tabs in window ${moveInfo.windowId}`);
      
      // Update all tabs in the window with their current indices
      for (const tab of allTabsInWindow) {
        updateTab(tab.id, {
          index: tab.index,
          windowId: tab.windowId,
          title: tab.title,
          url: tab.url
        });
      }
      
      console.log(`Tab move synchronized - ${tabId} now at index ${moveInfo.toIndex}`);
    } catch (tabError) {
      console.error(`Failed to refresh window tabs after move:`, tabError);
      
      // Fallback to basic update of just the moved tab
      updateTab(tabId, { 
        index: moveInfo.toIndex,
        windowId: moveInfo.windowId 
      });
    }
    
    // Force an immediate notification to ensure UI updates quickly
    setTimeout(() => {
      notifyHierarchyChange();
    }, 25); // Very short delay to ensure the update is processed
    
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
    
    // Clear existing hierarchy to start fresh
    tabHierarchy = new TabTree();
    
    // Get all tabs from all windows
    const tabs = await chrome.tabs.query({});
    console.log(`Found ${tabs.length} existing tabs`);
    
    if (tabs.length === 0) {
      console.log('No tabs found during initialization');
      return;
    }
    
    // Sort tabs by creation order (approximate using index and window)
    tabs.sort((a, b) => {
      if (a.windowId !== b.windowId) {
        return a.windowId - b.windowId;
      }
      return a.index - b.index;
    });
    
    // Add tabs to hierarchy with detailed logging (silent mode to avoid notification spam)
    let addedCount = 0;
    for (const tab of tabs) {
      try {
        console.log(`Adding tab ${tab.id}: "${tab.title}" at index ${tab.index} (${tab.url})`);
        addTab(tab, true); // silent = true during initialization
        addedCount++;
      } catch (tabError) {
        console.error(`Failed to add tab ${tab.id}:`, tabError);
      }
    }
    
    console.log(`Tab hierarchy initialized with ${addedCount}/${tabs.length} tabs`);
    
    // Log hierarchy summary
    const hierarchy = getHierarchy();
    console.log(`Final hierarchy has ${hierarchy.length} root tabs`);
    
    // Force a notification to any listening sidebars
    setTimeout(() => {
      notifyHierarchyChange();
    }, 500);
    
  } catch (error) {
    console.error('Failed to initialize existing tabs:', error);
  }
}

/**
 * Check if tab hierarchy needs initialization and do it if necessary
 */
async function ensureHierarchyInitialized() {
  try {
    // Check if we have any tabs in our hierarchy
    const currentHierarchy = getHierarchy();
    
    // Get actual browser tabs to compare
    const browserTabs = await chrome.tabs.query({});
    
    // If we have no hierarchy but browser has tabs, we need to initialize
    if (currentHierarchy.length === 0 && browserTabs.length > 0) {
      console.log('Hierarchy is empty but browser has tabs - initializing');
      await initializeExistingTabs();
      return true;
    }
    
    // If hierarchy count doesn't match browser tab count, we might need to re-sync
    const hierarchyTabCount = countTabsInHierarchy(currentHierarchy);
    if (hierarchyTabCount !== browserTabs.length) {
      console.log(`Tab count mismatch: hierarchy has ${hierarchyTabCount}, browser has ${browserTabs.length} - re-initializing`);
      await initializeExistingTabs();
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking hierarchy initialization:', error);
    return false;
  }
}

/**
 * Count total tabs in hierarchy (including children)
 */
function countTabsInHierarchy(hierarchy) {
  let count = 0;
  for (const tab of hierarchy) {
    count += 1; // Count the tab itself
    if (tab.children && tab.children.length > 0) {
      count += countTabsInHierarchy(tab.children);
    }
  }
  return count;
}

/**
 * Add a tab to the hierarchy
 * @param {Object} tab - Chrome tab object
 * @param {boolean} silent - Skip notifications (for bulk operations)
 */
function addTab(tab, silent = false) {
  try {
    console.log(`Adding tab ${tab.id} to hierarchy`);
    tabHierarchy.addTab(tab);
    
    // Notify UI of hierarchy change (debounced) unless silent
    if (!silent) {
      debounceNotifyHierarchyChange();
    }
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
    if (updates.url || updates.title || updates.windowId || updates.index !== undefined || updates.openerTabId !== undefined) {
      debounceNotifyHierarchyChange();
    }
  } catch (error) {
    console.error('Failed to update tab in hierarchy:', error);
  }
}

/**
 * Get tab hierarchy
 * @param {number|null} windowId - Optional window ID filter (null = all windows)
 * @returns {Array} Hierarchy structure
 */
function getHierarchy(windowId = null) {
  try {
    const hierarchy = tabHierarchy.getHierarchy(windowId);
    const windowDesc = windowId ? `window ${windowId}` : 'all windows';
    console.log(`Retrieved hierarchy for ${windowDesc}:`, hierarchy.length, 'root tabs');
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
 * Notify specific sidebar of hierarchy changes
 */
async function notifySpecificSidebar(sender, hierarchy) {
  try {
    const message = {
      action: 'hierarchyUpdated',
      hierarchy: hierarchy,
      timestamp: Date.now()
    };
    
    // Send message to specific sender (sidebar)
    chrome.tabs.sendMessage(sender.tab?.id || 0, message).catch(() => {
      // If tab message fails, try runtime message
      chrome.runtime.sendMessage(message).catch(() => {
        console.log('Failed to send message to sidebar');
      });
    });
  } catch (error) {
    console.log('Error sending message to specific sidebar:', error);
  }
}

/**
 * Notify UI components of hierarchy changes with enhanced error handling
 * Ensures all sidebars receive the complete multi-window hierarchy
 */
async function notifyHierarchyChange() {
  try {
    console.log(`Notifying hierarchy change to ${activeSidebars.size} active sidebars`);
    
    if (activeSidebars.size === 0) {
      console.log('No active sidebars to notify');
      return;
    }
    
    // Get complete hierarchy from all windows for multi-window sync
    const hierarchy = getHierarchy(null); // null = all windows
    
    // Create a copy of activeSidebars to avoid modification during iteration
    const sidebarsCopy = new Set(activeSidebars);
    
    for (const sender of sidebarsCopy) {
      try {
        await notifySpecificSidebar(sender, hierarchy);
      } catch (messageError) {
        console.log('Failed to notify sidebar, removing from active list');
        activeSidebars.delete(sender);
      }
    }
    
    // Also try broadcasting via runtime message as fallback
    try {
      const message = {
        action: 'hierarchyUpdated',
        hierarchy: hierarchy,
        timestamp: Date.now()
      };
      
      chrome.runtime.sendMessage(message).catch(() => {
        // Ignore errors - this is just a fallback
      });
    } catch (error) {
      // Ignore broadcast errors
    }
  } catch (error) {
    console.error('Failed to notify hierarchy change:', error);
  }
}

/**
 * Enhanced debounced notification to handle rapid changes
 */
let notificationDebounceTimer = null;
const NOTIFICATION_DEBOUNCE_MS = 50; // Reduced debounce for faster updates

function debounceNotifyHierarchyChange() {
  if (notificationDebounceTimer) {
    clearTimeout(notificationDebounceTimer);
  }
  
  notificationDebounceTimer = setTimeout(() => {
    notifyHierarchyChange();
    notificationDebounceTimer = null;
  }, NOTIFICATION_DEBOUNCE_MS);
}