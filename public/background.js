// Moose-Tabs Background Service Worker
// This service worker manages tab hierarchy tracking for the Chrome extension

console.log('Moose-Tabs background service worker loaded');

// Import dependencies
importScripts('TabTree.js');
importScripts('tabParity.js');

// Global tab hierarchy manager
let tabHierarchy = new TabTree();

// Port-based connections for reliable sidebar communication
const sidebarPorts = new Map(); // portId -> port
let portIdCounter = 0;

// Parity checker instance
let parityChecker = null;

// Track initialization state
let isInitialized = false;
let initializationPromise = null;

// Flag to skip onMoved broadcasts during programmatic moves
let skipOnMovedBroadcast = false;

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize the extension - load state and set up hierarchy
 */
async function initialize() {
  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    try {
      console.log('Initializing Moose-Tabs...');

      // Enable persistence
      tabHierarchy.enablePersistence();

      // Try to load saved state first
      const loaded = await tabHierarchy.loadFromStorage();
      
      if (loaded) {
        console.log('Loaded hierarchy from storage, validating...');
        // Validate and repair if needed
        const syncResult = await TabParity.syncWithBrowser(tabHierarchy, false);
        console.log('Sync result:', syncResult.action);
      } else {
        console.log('No saved state, initializing from browser tabs...');
        await initializeFromBrowserTabs();
      }

      // Start parity checker
      startParityChecker();

      isInitialized = true;
      console.log('Moose-Tabs initialization complete');
    } catch (error) {
      console.error('Initialization failed:', error);
      // Fallback to basic initialization
      await initializeFromBrowserTabs();
      isInitialized = true;
    }
  })();

  return initializationPromise;
}

/**
 * Initialize hierarchy from current browser tabs
 */
async function initializeFromBrowserTabs() {
  try {
    console.log('Initializing from browser tabs...');
    
    // Clear existing hierarchy
    tabHierarchy.clear();
    
    // Get all tabs from all windows
    const tabs = await chrome.tabs.query({});
    console.log(`Found ${tabs.length} browser tabs`);
    
    if (tabs.length === 0) {
      console.log('No tabs found');
      return;
    }
    
    // Sort tabs by window and index
    tabs.sort((a, b) => {
      if (a.windowId !== b.windowId) {
        return a.windowId - b.windowId;
      }
      return a.index - b.index;
    });
    
    // Add tabs to hierarchy
    for (const tab of tabs) {
      try {
        tabHierarchy.addTab(tab);
      } catch (error) {
        console.error(`Failed to add tab ${tab.id}:`, error);
      }
    }
    
    // Sort all children by index
    tabHierarchy.sortAllChildrenByBrowserIndex();
    
    console.log(`Hierarchy initialized with ${tabHierarchy.getTabCount()} tabs`);
  } catch (error) {
    console.error('Failed to initialize from browser tabs:', error);
  }
}

/**
 * Start the periodic parity checker
 */
function startParityChecker() {
  if (parityChecker && parityChecker.isRunning()) {
    return;
  }

  parityChecker = TabParity.createParityChecker(
    tabHierarchy,
    30000, // Check every 30 seconds
    (validation) => {
      console.warn('Parity issues detected:', validation.issues.length);
      // Broadcast that hierarchy was repaired
      broadcastHierarchyUpdate();
    }
  );

  // Only start if there are active sidebars
  if (sidebarPorts.size > 0) {
    parityChecker.start();
  }
}

/**
 * Ensure hierarchy is initialized before operations
 */
async function ensureInitialized() {
  if (!isInitialized) {
    await initialize();
  }
}

// ============================================================================
// PORT-BASED COMMUNICATION
// ============================================================================

/**
 * Handle new port connections from sidebars
 */
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'sidebar') {
    const portId = ++portIdCounter;
    sidebarPorts.set(portId, port);
    
    console.log(`Sidebar connected (port ${portId}), total: ${sidebarPorts.size}`);

    // Start parity checker if first sidebar
    if (sidebarPorts.size === 1 && parityChecker) {
      parityChecker.start();
    }

    // Send initial hierarchy
    ensureInitialized().then(() => {
      // Check if port is still connected before sending
      if (!sidebarPorts.has(portId)) {
        console.log(`Port ${portId} disconnected before initial hierarchy could be sent`);
        return;
      }
      
      try {
        const hierarchy = tabHierarchy.getHierarchy(null);
        port.postMessage({
          type: 'hierarchyUpdated',
          hierarchy,
          timestamp: Date.now()
        });
      } catch (error) {
        console.warn(`Failed to send initial hierarchy to port ${portId}:`, error.message);
        sidebarPorts.delete(portId);
      }
    });

    // Handle messages from this port
    port.onMessage.addListener((message) => {
      handlePortMessage(port, portId, message);
    });

    // Handle disconnect
    port.onDisconnect.addListener(() => {
      sidebarPorts.delete(portId);
      console.log(`Sidebar disconnected (port ${portId}), remaining: ${sidebarPorts.size}`);

      // Stop parity checker if no sidebars
      if (sidebarPorts.size === 0 && parityChecker) {
        parityChecker.stop();
      }
    });
  }
});

/**
 * Handle messages received via port
 */
async function handlePortMessage(port, portId, message) {
  try {
    await ensureInitialized();

    // Check if port is still connected after async operation
    if (!sidebarPorts.has(portId)) {
      console.log(`Port ${portId} disconnected during message handling`);
      return;
    }

    switch (message.action) {
      case 'getHierarchy':
        const hierarchy = tabHierarchy.getHierarchy(message.windowId || null);
        port.postMessage({
          type: 'hierarchyResponse',
          requestId: message.requestId,
          hierarchy,
          timestamp: Date.now()
        });
        break;

      case 'refreshHierarchy':
        await TabParity.syncWithBrowser(tabHierarchy, true);
        broadcastHierarchyUpdate();
        break;

      default:
        console.warn('Unknown port message action:', message.action);
    }
  } catch (error) {
    // Check if this is a disconnected port error
    if (error.message?.includes('disconnected')) {
      console.log(`Port ${portId} disconnected, removing from active ports`);
      sidebarPorts.delete(portId);
      return;
    }
    
    console.error('Error handling port message:', error);
    
    // Only try to send error response if port is still connected
    if (sidebarPorts.has(portId)) {
      try {
        port.postMessage({
          type: 'error',
          requestId: message.requestId,
          error: error.message
        });
      } catch (sendError) {
        console.warn(`Failed to send error to port ${portId}:`, sendError.message);
        sidebarPorts.delete(portId);
      }
    }
  }
}

/**
 * Broadcast hierarchy update to all connected sidebars
 */
function broadcastHierarchyUpdate() {
  if (sidebarPorts.size === 0) return;

  const hierarchy = tabHierarchy.getHierarchy(null);
  
  // DEBUG: Log hierarchy being broadcast
  console.log('========== BROADCASTING HIERARCHY ==========');
  const logHierarchy = (tabs, depth = 0) => {
    for (const tab of tabs) {
      const indent = '  '.repeat(depth);
      console.log(`${indent}[${tab.index}] id=${tab.id} "${tab.title?.substring(0, 25)}"`);
      if (tab.children && tab.children.length > 0) {
        logHierarchy(tab.children, depth + 1);
      }
    }
  };
  logHierarchy(hierarchy);
  console.log('============================================');
  
  const message = {
    type: 'hierarchyUpdated',
    hierarchy,
    timestamp: Date.now()
  };

  sidebarPorts.forEach((port, portId) => {
    try {
      port.postMessage(message);
    } catch (error) {
      console.warn(`Failed to send to port ${portId}:`, error);
      sidebarPorts.delete(portId);
    }
  });

  // Also send via runtime message for backward compatibility
  chrome.runtime.sendMessage(message).catch(() => {
    // Ignore - no listeners is fine
  });
}

// ============================================================================
// MESSAGE HANDLING (Legacy support + new features)
// ============================================================================

/**
 * Handle runtime messages
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Handle async messages
  handleMessage(request, sender)
    .then(response => {
      sendResponse(response);
    })
    .catch(error => {
      console.error('Message handling error:', error);
      sendResponse({ success: false, error: error.message });
    });

  // Return true to indicate async response
  return true;
});

/**
 * Process incoming messages
 */
async function handleMessage(request, sender) {
  await ensureInitialized();

  switch (request.action) {
    case 'getTabHierarchy':
    case 'getHierarchy': {
      const windowId = request.windowId || null;
      let hierarchy = tabHierarchy.getHierarchy(windowId);
      
      // Re-initialize if empty but browser has tabs
      if (hierarchy.length === 0) {
        const browserTabs = await chrome.tabs.query({});
        if (browserTabs.length > 0) {
          console.log('Hierarchy empty, re-initializing...');
          await TabParity.syncWithBrowser(tabHierarchy, true);
          hierarchy = tabHierarchy.getHierarchy(windowId);
        }
      }
      
      return {
        success: true,
        hierarchy,
        windowId: windowId || 'all',
        timestamp: Date.now()
      };
    }

    case 'getTab': {
      const tab = tabHierarchy.getTab(request.tabId);
      return { success: true, tab };
    }

    case 'sidebarActive': {
      // Legacy support - sidebars should use port connection
      console.log('Sidebar active (legacy message)');
      return { success: true };
    }

    case 'sidebarInactive': {
      // Legacy support
      console.log('Sidebar inactive (legacy message)');
      return { success: true };
    }

    case 'refreshHierarchy': {
      console.log('Force refresh hierarchy requested');
      await TabParity.syncWithBrowser(tabHierarchy, true);
      const hierarchy = tabHierarchy.getHierarchy(null);
      
      // Broadcast update
      setTimeout(() => broadcastHierarchyUpdate(), 50);
      
      return {
        success: true,
        hierarchy,
        timestamp: Date.now()
      };
    }

    case 'closeTab': {
      console.log('Closing tab:', request.tabId);
      await chrome.tabs.remove(request.tabId);
      return { success: true };
    }

    case 'switchToTab': {
      console.log('Switching to tab:', request.tabId);
      const tab = await chrome.tabs.get(request.tabId);
      await chrome.tabs.update(request.tabId, { active: true });
      await chrome.windows.update(tab.windowId, { focused: true });
      return { success: true };
    }

    case 'updateParentRelationship': {
      console.log('Updating parent relationship:', request.tabId, '->', request.parentId);
      tabHierarchy._updateParentRelationship(request.tabId, request.parentId);
      broadcastHierarchyUpdate();
      return { success: true };
    }

    case 'moveTabsWithHierarchy': {
      // ROBUST move operation that maintains 1:1 parity between sidebar and tab bar
      // Key principle: Use the BACKEND's hierarchy as source of truth, not frontend's
      const { draggedTabId, targetTabId, position } = request;
      
      console.log('========== MOVE OPERATION START ==========');
      console.log('Dragged:', draggedTabId, 'Target:', targetTabId, 'Position:', position);
      
      try {
        skipOnMovedBroadcast = true;
        
        // === STEP 1: Get current Chrome state ===
        let draggedTab, targetTab;
        try {
          [draggedTab, targetTab] = await Promise.all([
            chrome.tabs.get(draggedTabId),
            chrome.tabs.get(targetTabId)
          ]);
        } catch (e) {
          console.error('Tab no longer exists:', e);
          skipOnMovedBroadcast = false;
          return { success: false, error: 'Tab no longer exists' };
        }
        
        const windowId = targetTab.windowId;
        const allTabsInWindow = await chrome.tabs.query({ windowId });
        allTabsInWindow.sort((a, b) => a.index - b.index);
        
        console.log('BEFORE move - Chrome tab order:');
        allTabsInWindow.forEach(t => console.log(`  [${t.index}] id=${t.id} "${t.title?.substring(0, 30)}"`));
        
        const indexMap = new Map(allTabsInWindow.map(t => [t.id, t.index]));
        
        // === STEP 2: Get descendants from BACKEND hierarchy ===
        // Use hierarchy's children order (which matches sidebar display order)
        const getDescendantsInHierarchyOrder = (tabId) => {
          const result = [];
          const t = tabHierarchy.tabs.get(tabId);
          if (t && t.children && t.children.length > 0) {
            // Children array should already be sorted by index from sortAllChildrenByBrowserIndex
            for (const childId of t.children) {
              if (indexMap.has(childId)) {
                result.push(childId);
                result.push(...getDescendantsInHierarchyOrder(childId));
              }
            }
          }
          return result;
        };
        
        const descendantIds = getDescendantsInHierarchyOrder(draggedTabId);
        const tabIdsToMove = [draggedTabId, ...descendantIds];
        
        // Log the hierarchy's children order for debugging
        const draggedHierarchyTab = tabHierarchy.tabs.get(draggedTabId);
        if (draggedHierarchyTab) {
          console.log('Hierarchy children order:', draggedHierarchyTab.children);
          console.log('Children indices:', draggedHierarchyTab.children.map(id => indexMap.get(id)));
        }
        
        console.log('Tabs to move (parent + descendants sorted by index):', tabIdsToMove);
        console.log('Their current indices:', tabIdsToMove.map(id => indexMap.get(id)));
        
        if (tabIdsToMove.length === 0) {
          console.error('No valid tabs to move');
          skipOnMovedBroadcast = false;
          return { success: false, error: 'No valid tabs to move' };
        }
        
        // === STEP 3: Find where to insert (after target's subtree) ===
        const targetIndex = indexMap.get(targetTabId);
        if (targetIndex === undefined) {
          console.error('Target tab has no index');
          skipOnMovedBroadcast = false;
          return { success: false, error: 'Target position unknown' };
        }
        
        // Get target's descendants to find the end of its subtree
        const targetDescendants = getDescendantsInHierarchyOrder(targetTabId);
        let insertAfterIndex = targetIndex;
        for (const descId of targetDescendants) {
          const descIndex = indexMap.get(descId);
          if (descIndex !== undefined && descIndex > insertAfterIndex) {
            insertAfterIndex = descIndex;
          }
        }
        
        console.log(`Target at ${targetIndex}, subtree ends at ${insertAfterIndex}`);
        
        // === STEP 4: Determine move direction ===
        const tabsAtOrBeforeTarget = tabIdsToMove.filter(id => {
          const idx = indexMap.get(id);
          return idx !== undefined && idx <= insertAfterIndex;
        }).length;
        
        const isMovingDown = tabsAtOrBeforeTarget > 0;
        
        // Handle pinned tabs - can't move unpinned tabs before pinned ones
        const pinnedCount = allTabsInWindow.filter(t => t.pinned).length;
        let finalInsertAfter = insertAfterIndex;
        if (!draggedTab.pinned && insertAfterIndex < pinnedCount - 1) {
          finalInsertAfter = pinnedCount - 1;
        }
        
        console.log(`Insert after index: ${finalInsertAfter}, moving ${isMovingDown ? 'DOWN' : 'UP'}`);
        
        // === STEP 5: Determine new parent ===
        let newParentId = null;
        if (position === 'child') {
          newParentId = targetTabId;
        } else {
          const targetHierarchyTab = tabHierarchy.getTab(targetTabId);
          newParentId = targetHierarchyTab?.parentId ?? null;
        }
        
        console.log('New parent:', newParentId);
        
        // === STEP 6: Execute the move ===
        // Chrome's batch tabs.move() increments the index for each tab (12, 13, 14...).
        // This works fine when moving UP (tabs are after target, removing doesn't shift target).
        // But when moving DOWN (tabs are before target), removing each tab shifts the target,
        // causing gaps between the moved tabs.
        //
        // Solution:
        // - Moving UP: use batch move with index = finalInsertAfter + 1
        // - Moving DOWN: move each tab INDIVIDUALLY to the SAME index (finalInsertAfter)
        //   Each removal shifts the target down, but inserting at the original index
        //   compensates perfectly, keeping tabs contiguous.
        
        console.log(`Moving ${tabIdsToMove.length} tabs ${isMovingDown ? 'DOWN' : 'UP'}`);
        console.log(`Tabs: [${tabIdsToMove.join(', ')}]`);
        
        try {
          if (isMovingDown) {
            // Moving DOWN: tabs are BEFORE target
            // Move each tab individually to the SAME index
            // As each tab is removed from before target, target shifts down by 1
            // Inserting at the original insertAfterIndex puts each tab right after the shifted target
            const moveToIndex = finalInsertAfter;
            console.log(`Moving DOWN: each tab individually to index ${moveToIndex}`);
            
            for (const tabId of tabIdsToMove) {
              await chrome.tabs.move(tabId, { index: moveToIndex, windowId });
            }
          } else {
            // Moving UP: tabs are AFTER target
            // Batch move works fine - target doesn't shift when we remove tabs from after it
            const moveToIndex = finalInsertAfter + 1;
            console.log(`Moving UP: batch move to index ${moveToIndex}`);
            
            await chrome.tabs.move(tabIdsToMove, { index: moveToIndex, windowId });
          }
          console.log(`Move executed successfully`);
        } catch (moveError) {
          console.error('chrome.tabs.move failed:', moveError);
          skipOnMovedBroadcast = false;
          return { success: false, error: moveError.message };
        }
        
        // === STEP 7: Sync hierarchy with Chrome's new state ===
        const afterMoveTabs = await chrome.tabs.query({ windowId });
        afterMoveTabs.sort((a, b) => a.index - b.index);
        
        console.log('AFTER move - Chrome tab order:');
        afterMoveTabs.forEach(t => console.log(`  [${t.index}] id=${t.id} "${t.title?.substring(0, 30)}"`));
        
        // Update all indices
        for (const tab of afterMoveTabs) {
          tabHierarchy.updateTab(tab.id, { index: tab.index, windowId: tab.windowId });
        }
        
        // Update parent relationship for dragged tab
        tabHierarchy._updateParentRelationship(draggedTabId, newParentId);
        
        // Re-sort all children to match Chrome order
        tabHierarchy.sortAllChildrenByBrowserIndex();
        
        // === STEP 8: Validate result ===
        const newIndexMap = new Map(afterMoveTabs.map(t => [t.id, t.index]));
        const finalIndices = tabIdsToMove.map(id => newIndexMap.get(id));
        console.log('Final positions:', tabIdsToMove.map((id, i) => `${id}@${finalIndices[i]}`).join(', '));
        
        // Check contiguity
        let contiguous = true;
        for (let i = 1; i < finalIndices.length; i++) {
          if (finalIndices[i] !== finalIndices[i-1] + 1) {
            console.warn(`Not contiguous: ${tabIdsToMove[i]} at ${finalIndices[i]}, expected ${finalIndices[i-1] + 1}`);
            contiguous = false;
          }
        }
        
        console.log(contiguous ? 'SUCCESS: Tabs moved correctly' : 'WARNING: Tabs not contiguous');
        console.log('========== MOVE OPERATION END ==========');
        
        skipOnMovedBroadcast = false;
        broadcastHierarchyUpdate();
        
        return { success: true };
        
      } catch (error) {
        console.error('Move failed:', error);
        skipOnMovedBroadcast = false;
        
        // Recovery: sync with browser
        try {
          await TabParity.syncWithBrowser(tabHierarchy, true);
          broadcastHierarchyUpdate();
        } catch (e) {
          console.error('Recovery failed:', e);
        }
        
        return { success: false, error: error.message };
      }
    }

    case 'getTabParent': {
      const tab = tabHierarchy.getTab(request.tabId);
      return {
        success: true,
        parentId: tab ? tab.parentId : null,
        tabId: request.tabId
      };
    }

    case 'getDiagnostics': {
      const diagnostics = await TabParity.getDiagnosticReport(tabHierarchy);
      return { success: true, diagnostics };
    }

    case 'validateParity': {
      const validation = await TabParity.validateTabParity(tabHierarchy);
      return { success: true, validation };
    }

    case 'repairHierarchy': {
      const result = await TabParity.repairHierarchy(tabHierarchy);
      broadcastHierarchyUpdate();
      return { success: true, result };
    }

    case 'getDisplayMode': {
      return { success: true, mode: currentDisplayMode };
    }

    case 'displayModeChanged': {
      const newMode = request.mode;
      if (newMode && newMode !== currentDisplayMode) {
        currentDisplayMode = newMode;
        await applyDisplayMode(newMode);
      }
      return { success: true, mode: currentDisplayMode };
    }

    default:
      return { success: false, error: 'Unknown action: ' + request.action };
  }
}

// ============================================================================
// TAB EVENT HANDLERS
// ============================================================================

chrome.tabs.onCreated.addListener(async (tab) => {
  console.log('Tab created:', tab.id, 'opener:', tab.openerTabId);
  
  try {
    await ensureInitialized();
    tabHierarchy.addTab(tab);
    debouncedBroadcast();
  } catch (error) {
    console.error('Error handling tab creation:', error);
  }
});

chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
  console.log('Tab removed:', tabId, 'windowClosing:', removeInfo.isWindowClosing);
  
  try {
    await ensureInitialized();
    tabHierarchy.removeTab(tabId);
    
    if (!removeInfo.isWindowClosing) {
      debouncedBroadcast();
    }
  } catch (error) {
    console.error('Error handling tab removal:', error);
  }
});

chrome.tabs.onMoved.addListener(async (tabId, moveInfo) => {
  console.log('Tab moved externally:', tabId, 'from', moveInfo.fromIndex, 'to', moveInfo.toIndex);
  
  // Skip if this move was initiated by our atomic move handler
  if (skipOnMovedBroadcast) {
    console.log('Skipping onMoved broadcast (atomic move in progress)');
    return;
  }
  
  try {
    await ensureInitialized();
    
    // Update all tabs in the window to get accurate indices
    // This ensures our hierarchy matches Chrome's actual tab order
    const allTabsInWindow = await chrome.tabs.query({ windowId: moveInfo.windowId });
    
    for (const tab of allTabsInWindow) {
      tabHierarchy.updateTab(tab.id, {
        index: tab.index,
        windowId: tab.windowId
      });
    }
    
    // Re-sort ALL children to match Chrome's new index order
    // This is critical for maintaining 1:1 parity between sidebar and tab bar
    tabHierarchy.sortAllChildrenByBrowserIndex();
    
    // Immediate broadcast for move operations (no debounce)
    // Tab moves need instant visual feedback
    broadcastHierarchyUpdate();
  } catch (error) {
    console.error('Error handling external tab move:', error);
    
    // Try to recover by syncing with browser
    try {
      await TabParity.syncWithBrowser(tabHierarchy, true);
      broadcastHierarchyUpdate();
    } catch (recoveryError) {
      console.error('Recovery sync failed:', recoveryError);
    }
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Only handle significant updates
  if (!changeInfo.url && !changeInfo.title && changeInfo.status !== 'complete') {
    return;
  }
  
    console.log('Tab updated:', tabId, 'changes:', Object.keys(changeInfo));
    
    try {
    await ensureInitialized();
    
    const updates = {};
    if (changeInfo.url) updates.url = changeInfo.url;
    if (changeInfo.title) updates.title = changeInfo.title;
    
    if (Object.keys(updates).length > 0) {
      tabHierarchy.updateTab(tabId, updates);
      debouncedBroadcast();
    }
    } catch (error) {
      console.error('Error handling tab update:', error);
  }
});

chrome.tabs.onAttached.addListener(async (tabId, attachInfo) => {
  console.log('Tab attached:', tabId, 'to window', attachInfo.newWindowId);
  
  try {
    await ensureInitialized();
    
    tabHierarchy.updateTab(tabId, {
      windowId: attachInfo.newWindowId,
      index: attachInfo.newPosition
    });
    
    debouncedBroadcast();
  } catch (error) {
    console.error('Error handling tab attachment:', error);
  }
});

chrome.tabs.onDetached.addListener(async (tabId, detachInfo) => {
  console.log('Tab detached:', tabId, 'from window', detachInfo.oldWindowId);
  // The onAttached event will handle the final positioning
});

// ============================================================================
// EXTENSION LIFECYCLE
// ============================================================================

chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('Extension installed:', details.reason);
  
  // Create context menu
  chrome.contextMenus.create({
    id: 'moose-tabs-settings',
    title: 'Settings',
    contexts: ['action']
  });
  
  // Load and apply display mode
  await loadDisplayMode();
  
  if (details.reason === 'install') {
    await initialize();
  }
});

chrome.runtime.onStartup.addListener(async () => {
  console.log('Browser startup detected');
  await loadDisplayMode();
  await initialize();
});

// Track current display mode
let currentDisplayMode = 'sidebar';

// Load display mode from settings
async function loadDisplayMode() {
  try {
    const result = await chrome.storage.local.get('userSettings');
    currentDisplayMode = result.userSettings?.display?.mode || 'sidebar';
    await applyDisplayMode(currentDisplayMode);
  } catch (error) {
    console.error('Failed to load display mode:', error);
  }
}

// Apply display mode by configuring action behavior
async function applyDisplayMode(mode) {
  try {
    if (mode === 'popup') {
      // Set popup for action click
      await chrome.action.setPopup({ popup: 'popup.html' });
      // Disable automatic side panel opening
      await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
    } else {
      // Clear popup so action click event fires
      await chrome.action.setPopup({ popup: '' });
      // Enable automatic side panel opening on action click
      await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
    }
    console.log('Display mode set to:', mode);
  } catch (error) {
    console.error('Failed to apply display mode:', error);
  }
}

// Listen for settings changes to update display mode
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.userSettings) {
    const newMode = changes.userSettings.newValue?.display?.mode;
    if (newMode && newMode !== currentDisplayMode) {
      currentDisplayMode = newMode;
      applyDisplayMode(newMode);
    }
  }
});

// Handle action click (only fires when popup is not set)
chrome.action.onClicked.addListener((tab) => {
  console.log('Extension action clicked - side panel should open automatically');
  // Side panel opens automatically via setPanelBehavior when in sidebar mode
  // This handler only fires when popup is not set
});

// Context menu handler
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'moose-tabs-settings') {
      const settingsUrl = chrome.runtime.getURL('settings.html');
      await chrome.tabs.create({ url: settingsUrl });
  }
});

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Debounced broadcast to prevent too many updates
 */
let broadcastTimer = null;
const BROADCAST_DEBOUNCE_MS = 100;

function debouncedBroadcast() {
  if (broadcastTimer) {
    clearTimeout(broadcastTimer);
  }
  
  broadcastTimer = setTimeout(() => {
    broadcastHierarchyUpdate();
    broadcastTimer = null;
  }, BROADCAST_DEBOUNCE_MS);
}

/**
 * Immediate broadcast (for critical operations)
 */
function immediateBroadcast() {
  if (broadcastTimer) {
    clearTimeout(broadcastTimer);
    broadcastTimer = null;
  }
  broadcastHierarchyUpdate();
}

// ============================================================================
// STARTUP
// ============================================================================

// Initialize on script load
(async () => {
  try {
    await loadDisplayMode();
    await initialize();
  } catch (error) {
    console.error('Startup initialization failed:', error);
  }
})();
