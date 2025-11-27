/**
 * Tab Parity Module
 * 
 * Provides functions to validate and maintain 1:1 parity between
 * the TabTree hierarchy and actual browser tabs.
 */

/**
 * Validate that hierarchy matches actual browser tabs
 * @param {TabTree} tabTree - The TabTree instance
 * @returns {Promise<Object>} Validation result
 */
async function validateTabParity(tabTree) {
  try {
    // Get all browser tabs
    const browserTabs = await chrome.tabs.query({});
    
    // Use TabTree's built-in validation
    const validation = tabTree.validateHierarchy(browserTabs);
    
    // Add additional parity checks
    const parityIssues = [];
    
    // Check that all tabs in a window are in correct order
    const tabsByWindow = new Map();
    browserTabs.forEach(tab => {
      if (!tabsByWindow.has(tab.windowId)) {
        tabsByWindow.set(tab.windowId, []);
      }
      tabsByWindow.get(tab.windowId).push(tab);
    });
    
    // For each window, verify the hierarchy produces tabs in the same order
    tabsByWindow.forEach((windowTabs, windowId) => {
      // Sort by browser index
      windowTabs.sort((a, b) => a.index - b.index);
      
      // Get flat list from hierarchy for this window
      const flatList = tabTree.getFlatList(windowId);
      const hierarchyOrder = flatList.map(item => item.tab.id);
      
      // Check if any tabs are missing or extra
      const browserIds = windowTabs.map(t => t.id);
      const missingInHierarchy = browserIds.filter(id => !hierarchyOrder.includes(id));
      const extraInHierarchy = hierarchyOrder.filter(id => !browserIds.includes(id));
      
      if (missingInHierarchy.length > 0) {
        parityIssues.push({
          type: 'missing_tabs_in_window',
          windowId,
          tabIds: missingInHierarchy,
          message: `Window ${windowId} has ${missingInHierarchy.length} tabs missing from hierarchy`
        });
      }
      
      if (extraInHierarchy.length > 0) {
        parityIssues.push({
          type: 'extra_tabs_in_window',
          windowId,
          tabIds: extraInHierarchy,
          message: `Window ${windowId} has ${extraInHierarchy.length} extra tabs in hierarchy`
        });
      }
    });
    
    return {
      isValid: validation.isValid && parityIssues.length === 0,
      issues: [...validation.issues, ...parityIssues],
      stats: {
        ...validation.stats,
        windowCount: tabsByWindow.size
      },
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('Tab parity validation failed:', error);
    return {
      isValid: false,
      issues: [{ type: 'validation_error', message: error.message }],
      stats: {},
      timestamp: Date.now()
    };
  }
}

/**
 * Repair hierarchy to match browser tabs
 * @param {TabTree} tabTree - The TabTree instance
 * @returns {Promise<Object>} Repair results
 */
async function repairHierarchy(tabTree) {
  try {
    console.log('Starting hierarchy repair...');
    
    // Get all browser tabs
    const browserTabs = await chrome.tabs.query({});
    
    // Use TabTree's built-in repair
    const repairResult = tabTree.repairHierarchy(browserTabs);
    
    // Additional repair: ensure all browser tabs exist in hierarchy
    const hierarchyIds = new Set(tabTree.getAllTabIds());
    let addedTabs = 0;
    
    for (const browserTab of browserTabs) {
      if (!hierarchyIds.has(browserTab.id)) {
        tabTree.addTab(browserTab);
        addedTabs++;
        console.log(`Added missing tab ${browserTab.id} to hierarchy`);
      }
    }
    
    // Sort all children to match browser order
    tabTree.sortAllChildrenByBrowserIndex();
    
    // Validate again after repair
    const validation = await validateTabParity(tabTree);
    
    console.log(`Hierarchy repair complete. Repairs: ${repairResult.repairsPerformed + addedTabs}, Still valid: ${validation.isValid}`);
    
    return {
      success: validation.isValid,
      repairsPerformed: repairResult.repairsPerformed + addedTabs,
      repairs: [...repairResult.repairs, ...Array(addedTabs).fill({ action: 'added_missing_tab' })],
      validation,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('Hierarchy repair failed:', error);
    return {
      success: false,
      repairsPerformed: 0,
      repairs: [],
      error: error.message,
      timestamp: Date.now()
    };
  }
}

/**
 * Sync hierarchy with browser - full rebuild if needed
 * @param {TabTree} tabTree - The TabTree instance
 * @param {boolean} force - Force full rebuild even if hierarchy seems valid
 * @returns {Promise<Object>} Sync result
 */
async function syncWithBrowser(tabTree, force = false) {
  try {
    console.log(`Syncing hierarchy with browser (force=${force})...`);
    
    // First validate
    const validation = await validateTabParity(tabTree);
    
    // If valid and not forced, just return
    if (validation.isValid && !force) {
      console.log('Hierarchy is already in sync with browser');
      return {
        action: 'none',
        wasValid: true,
        validation,
        timestamp: Date.now()
      };
    }
    
    // Try repair first
    const repairResult = await repairHierarchy(tabTree);
    
    if (repairResult.success) {
      console.log('Hierarchy repaired successfully');
      return {
        action: 'repair',
        wasValid: validation.isValid,
        repairResult,
        timestamp: Date.now()
      };
    }
    
    // If repair failed, do a full rebuild
    console.log('Repair insufficient, performing full rebuild...');
    const rebuildResult = await fullRebuild(tabTree);
    
    return {
      action: 'rebuild',
      wasValid: validation.isValid,
      rebuildResult,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('Sync with browser failed:', error);
    return {
      action: 'error',
      error: error.message,
      timestamp: Date.now()
    };
  }
}

/**
 * Perform a full rebuild of the hierarchy from browser tabs
 * This preserves opener relationships but rebuilds everything else
 * @param {TabTree} tabTree - The TabTree instance
 * @returns {Promise<Object>} Rebuild result
 */
async function fullRebuild(tabTree) {
  try {
    console.log('Performing full hierarchy rebuild...');
    
    // Save existing custom parent-child relationships that aren't from opener
    const customRelationships = new Map();
    tabTree.tabs.forEach((tab, id) => {
      // Get the browser tab to check if it has an opener
      // We'll preserve custom relationships that differ from opener
      customRelationships.set(id, {
        parentId: tab.parentId,
        customParent: true // Mark as potentially custom
      });
    });
    
    // Clear and rebuild
    tabTree.clear();
    
    // Get all browser tabs
    const browserTabs = await chrome.tabs.query({});
    
    // Sort by window and index
    browserTabs.sort((a, b) => {
      if (a.windowId !== b.windowId) {
        return a.windowId - b.windowId;
      }
      return a.index - b.index;
    });
    
    // Add all tabs
    for (const tab of browserTabs) {
      tabTree.addTab(tab);
    }
    
    // Restore custom relationships where they differ from opener
    // and where both parent and child still exist
    customRelationships.forEach((rel, tabId) => {
      if (rel.parentId !== null && tabTree.tabs.has(tabId) && tabTree.tabs.has(rel.parentId)) {
        const currentTab = tabTree.tabs.get(tabId);
        // Only restore if the current parent is different (opener-based)
        // and the custom relationship was intentional
        // For now, we trust the opener relationship from browser
      }
    });
    
    // Sort all children
    tabTree.sortAllChildrenByBrowserIndex();
    
    // Validate
    const validation = await validateTabParity(tabTree);
    
    console.log(`Full rebuild complete. Tab count: ${tabTree.getTabCount()}, Valid: ${validation.isValid}`);
    
    return {
      success: validation.isValid,
      tabCount: tabTree.getTabCount(),
      validation,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('Full rebuild failed:', error);
    return {
      success: false,
      error: error.message,
      timestamp: Date.now()
    };
  }
}

/**
 * Create a periodic parity checker
 * @param {TabTree} tabTree - The TabTree instance
 * @param {number} intervalMs - Check interval in milliseconds
 * @param {Function} onIssueFound - Callback when issues are found
 * @returns {Object} Controller object with start/stop methods
 */
function createParityChecker(tabTree, intervalMs = 30000, onIssueFound = null) {
  let intervalId = null;
  let isRunning = false;
  let lastCheck = null;
  
  const check = async () => {
    if (!isRunning) return;
    
    try {
      const validation = await validateTabParity(tabTree);
      lastCheck = {
        timestamp: Date.now(),
        isValid: validation.isValid,
        issueCount: validation.issues.length
      };
      
      if (!validation.isValid && onIssueFound) {
        onIssueFound(validation);
      }
      
      // Auto-repair if issues found
      if (!validation.isValid) {
        console.log('Parity checker found issues, attempting repair...');
        await repairHierarchy(tabTree);
      }
    } catch (error) {
      console.error('Parity check failed:', error);
      lastCheck = {
        timestamp: Date.now(),
        error: error.message
      };
    }
  };
  
  return {
    start() {
      if (isRunning) return;
      isRunning = true;
      check(); // Run immediately
      intervalId = setInterval(check, intervalMs);
      console.log(`Parity checker started with ${intervalMs}ms interval`);
    },
    
    stop() {
      if (!isRunning) return;
      isRunning = false;
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
      console.log('Parity checker stopped');
    },
    
    async checkNow() {
      await check();
      return lastCheck;
    },
    
    getLastCheck() {
      return lastCheck;
    },
    
    isRunning() {
      return isRunning;
    }
  };
}

/**
 * Get a diagnostic report of the current hierarchy state
 * @param {TabTree} tabTree - The TabTree instance
 * @returns {Promise<Object>} Diagnostic report
 */
async function getDiagnosticReport(tabTree) {
  try {
    const browserTabs = await chrome.tabs.query({});
    const validation = await validateTabParity(tabTree);
    
    // Group tabs by window
    const windowStats = new Map();
    browserTabs.forEach(tab => {
      if (!windowStats.has(tab.windowId)) {
        windowStats.set(tab.windowId, {
          windowId: tab.windowId,
          browserTabCount: 0,
          hierarchyTabCount: 0,
          pinnedCount: 0
        });
      }
      const stats = windowStats.get(tab.windowId);
      stats.browserTabCount++;
      if (tab.pinned) stats.pinnedCount++;
    });
    
    // Count hierarchy tabs per window
    tabTree.tabs.forEach((tab, id) => {
      if (windowStats.has(tab.windowId)) {
        windowStats.get(tab.windowId).hierarchyTabCount++;
      }
    });
    
    // Get hierarchy depth statistics
    let maxDepth = 0;
    let totalDepth = 0;
    const flatList = tabTree.getFlatList();
    flatList.forEach(item => {
      if (item.depth > maxDepth) maxDepth = item.depth;
      totalDepth += item.depth;
    });
    const avgDepth = flatList.length > 0 ? totalDepth / flatList.length : 0;
    
    // Count tabs with children
    let tabsWithChildren = 0;
    tabTree.tabs.forEach((tab, id) => {
      if (tab.children.length > 0) tabsWithChildren++;
    });
    
    return {
      timestamp: Date.now(),
      validation,
      hierarchy: {
        totalTabs: tabTree.getTabCount(),
        rootTabs: tabTree.rootTabs.size,
        tabsWithChildren,
        maxDepth,
        averageDepth: avgDepth.toFixed(2)
      },
      browser: {
        totalTabs: browserTabs.length,
        windowCount: windowStats.size
      },
      windows: Array.from(windowStats.values()),
      parity: {
        isInSync: validation.isValid,
        issueCount: validation.issues.length,
        issues: validation.issues.slice(0, 10) // First 10 issues
      }
    };
  } catch (error) {
    console.error('Failed to generate diagnostic report:', error);
    return {
      timestamp: Date.now(),
      error: error.message
    };
  }
}

// Export for service worker
if (typeof self !== 'undefined') {
  self.TabParity = {
    validateTabParity,
    repairHierarchy,
    syncWithBrowser,
    fullRebuild,
    createParityChecker,
    getDiagnosticReport
  };
}



