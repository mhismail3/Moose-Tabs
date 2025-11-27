/**
 * TabTree Class - Manages hierarchical tab relationships
 * 
 * This class provides functionality to track parent-child relationships
 * between browser tabs, supporting multi-window environments and
 * maintaining referential integrity.
 * 
 * Children are stored as Arrays (not Sets) to preserve browser tab order.
 */
class TabTree {
  constructor() {
    // Map of tab ID to tab data (includes parentId and children)
    this.tabs = new Map();
    // Set of root tab IDs (tabs without parents)
    this.rootTabs = new Set();
    // Flag to track if persistence is enabled
    this._persistenceEnabled = false;
    // Debounce timer for persistence
    this._persistenceTimer = null;
  }

  /**
   * Enable persistence to chrome.storage.session
   */
  enablePersistence() {
    this._persistenceEnabled = true;
  }

  /**
   * Disable persistence
   */
  disablePersistence() {
    this._persistenceEnabled = false;
  }

  /**
   * Save hierarchy state to chrome.storage.session
   * @returns {Promise<void>}
   */
  async saveToStorage() {
    if (!this._persistenceEnabled) return;
    
    try {
      const state = this.serialize();
      await chrome.storage.session.set({ tabTreeState: state });
      console.log('TabTree state saved to storage');
    } catch (error) {
      console.error('Failed to save TabTree state:', error);
    }
  }

  /**
   * Debounced save to storage - prevents excessive writes
   */
  _debouncedSave() {
    if (!this._persistenceEnabled) return;
    
    if (this._persistenceTimer) {
      clearTimeout(this._persistenceTimer);
    }
    
    this._persistenceTimer = setTimeout(() => {
      this.saveToStorage();
      this._persistenceTimer = null;
    }, 500);
  }

  /**
   * Load hierarchy state from chrome.storage.session
   * @returns {Promise<boolean>} True if state was loaded successfully
   */
  async loadFromStorage() {
    try {
      const result = await chrome.storage.session.get('tabTreeState');
      if (result.tabTreeState) {
        this.deserialize(result.tabTreeState);
        console.log('TabTree state loaded from storage');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to load TabTree state:', error);
      return false;
    }
  }

  /**
   * Serialize the hierarchy to a plain object for storage
   * @returns {Object} Serialized state
   */
  serialize() {
    const tabs = {};
    this.tabs.forEach((tab, id) => {
      tabs[id] = {
        id: tab.id,
        url: tab.url,
        title: tab.title,
        windowId: tab.windowId,
        index: tab.index,
        pinned: tab.pinned,
        parentId: tab.parentId,
        children: [...tab.children], // Convert array to plain array
        createdAt: tab.createdAt
      };
    });
    
    return {
      tabs,
      rootTabs: [...this.rootTabs],
      version: 2 // Version for future migrations
    };
  }

  /**
   * Deserialize state from storage
   * @param {Object} state - Serialized state
   */
  deserialize(state) {
    if (!state || !state.tabs) {
      console.warn('Invalid state for deserialization');
      return;
    }

    // Handle version migration
    const version = state.version || 1;
    
    this.tabs.clear();
    this.rootTabs.clear();

    // Restore tabs
    for (const [id, tabData] of Object.entries(state.tabs)) {
      const numericId = parseInt(id, 10);
      
      // Convert children from Set (v1) or Array (v2+)
      let children = tabData.children;
      if (version === 1 && children && typeof children === 'object' && !Array.isArray(children)) {
        // Convert Set-like object to Array
        children = Object.values(children);
      } else if (!Array.isArray(children)) {
        children = [];
      }
      
      this.tabs.set(numericId, {
        id: tabData.id,
        url: tabData.url,
        title: tabData.title,
        windowId: tabData.windowId,
        index: tabData.index,
        pinned: tabData.pinned || false,
        parentId: tabData.parentId,
        children: children,
        createdAt: tabData.createdAt || Date.now()
      });
    }

    // Restore root tabs
    if (Array.isArray(state.rootTabs)) {
      state.rootTabs.forEach(id => this.rootTabs.add(id));
    }
    
    // Validate and repair children arrays
    this._repairChildrenArrays();
  }

  /**
   * Repair children arrays to ensure they contain valid tab IDs
   * and are properly ordered
   */
  _repairChildrenArrays() {
    this.tabs.forEach((tab, id) => {
      // Filter out children that no longer exist
      tab.children = tab.children.filter(childId => this.tabs.has(childId));
      
      // Sort children by their browser index
      tab.children.sort((a, b) => {
        const childA = this.tabs.get(a);
        const childB = this.tabs.get(b);
        if (!childA || !childB) return 0;
        return (childA.index || 0) - (childB.index || 0);
      });
    });
  }

  /**
   * Add a tab to the hierarchy
   * @param {Object} tab - Tab object with id, url, title, windowId, index, openerTabId, pinned
   */
  addTab(tab) {
    if (!tab || typeof tab.id !== 'number') {
      throw new Error('Invalid tab: must have numeric id');
    }

    // Create internal tab representation with Array for children (not Set)
    const internalTab = {
      id: tab.id,
      url: tab.url,
      title: tab.title,
      windowId: tab.windowId,
      index: tab.index,
      pinned: tab.pinned || false,
      parentId: null,
      children: [], // Use Array instead of Set to preserve order
      createdAt: Date.now()
    };

    // Determine parent relationship
    if (tab.openerTabId && this.tabs.has(tab.openerTabId)) {
      // Prevent circular references
      if (!this._wouldCreateCircularRef(tab.id, tab.openerTabId)) {
        internalTab.parentId = tab.openerTabId;
        const parent = this.tabs.get(tab.openerTabId);
        // Add to children array, maintaining order by index
        this._insertChildInOrder(parent, tab.id, tab.index);
      }
    }

    // Add to appropriate collections
    this.tabs.set(tab.id, internalTab);
    
    if (internalTab.parentId === null) {
      this.rootTabs.add(tab.id);
    }

    this._debouncedSave();
  }

  /**
   * Insert a child tab ID into parent's children array in proper index order
   * @param {Object} parent - Parent tab object
   * @param {number} childId - Child tab ID to insert
   * @param {number} childIndex - Browser index of the child tab
   */
  _insertChildInOrder(parent, childId, childIndex) {
    if (!parent.children.includes(childId)) {
      // Find the correct position based on browser index
      let insertPos = parent.children.length;
      for (let i = 0; i < parent.children.length; i++) {
        const existingChild = this.tabs.get(parent.children[i]);
        if (existingChild && (existingChild.index || 0) > (childIndex || 0)) {
          insertPos = i;
          break;
        }
      }
      parent.children.splice(insertPos, 0, childId);
    }
  }

  /**
   * Remove a tab from the hierarchy
   * @param {number} tabId - Tab ID to remove
   * @param {Object} options - Removal options (cascade: boolean)
   */
  removeTab(tabId, options = {}) {
    const tab = this.tabs.get(tabId);
    if (!tab) {
      return; // Tab doesn't exist, nothing to do
    }

    if (options.cascade) {
      // Remove entire subtree
      this._removeSubtree(tabId);
    } else {
      // Remove tab but orphan children (make them root tabs)
      this._orphanChildren(tabId);
      this._removeSingleTab(tabId);
    }

    this._debouncedSave();
  }

  /**
   * Update tab properties
   * @param {number} tabId - Tab ID to update
   * @param {Object} updates - Properties to update
   */
  updateTab(tabId, updates) {
    const tab = this.tabs.get(tabId);
    if (!tab) {
      return; // Tab doesn't exist, nothing to do
    }

    // Prevent ID changes
    const { id, parentId, children, ...allowedUpdates } = updates;

    // Track if index changed for re-sorting
    const indexChanged = updates.index !== undefined && updates.index !== tab.index;
    const oldIndex = tab.index;

    // Apply allowed updates
    Object.assign(tab, allowedUpdates);

    // Handle opener changes (parent relationship changes)
    if (updates.openerTabId !== undefined) {
      this._updateParentRelationship(tabId, updates.openerTabId);
    }

    // If index changed, re-sort in parent's children array
    if (indexChanged && tab.parentId) {
      const parent = this.tabs.get(tab.parentId);
      if (parent) {
        this._resortChildInParent(parent, tabId);
      }
    }

    this._debouncedSave();
  }

  /**
   * Re-sort a child within its parent's children array after index change
   * @param {Object} parent - Parent tab object
   * @param {number} childId - Child tab ID to resort
   */
  _resortChildInParent(parent, childId) {
    // Remove from current position
    const currentPos = parent.children.indexOf(childId);
    if (currentPos !== -1) {
      parent.children.splice(currentPos, 1);
    }
    
    // Re-insert in correct position
    const child = this.tabs.get(childId);
    if (child) {
      this._insertChildInOrder(parent, childId, child.index);
    }
  }

  /**
   * Sort all children of a tab by their browser index
   * @param {number} tabId - Parent tab ID
   */
  sortChildrenByBrowserIndex(tabId) {
    const tab = this.tabs.get(tabId);
    if (!tab || !tab.children.length) return;

    tab.children.sort((a, b) => {
      const childA = this.tabs.get(a);
      const childB = this.tabs.get(b);
      if (!childA || !childB) return 0;
      return (childA.index || 0) - (childB.index || 0);
    });

    this._debouncedSave();
  }

  /**
   * Sort all children across the entire tree by browser index
   */
  sortAllChildrenByBrowserIndex() {
    this.tabs.forEach((tab, id) => {
      if (tab.children.length > 1) {
        tab.children.sort((a, b) => {
          const childA = this.tabs.get(a);
          const childB = this.tabs.get(b);
          if (!childA || !childB) return 0;
          return (childA.index || 0) - (childB.index || 0);
        });
      }
    });

    this._debouncedSave();
  }

  /**
   * Get a specific tab
   * @param {number} tabId - Tab ID to retrieve
   * @returns {Object|undefined} Tab object or undefined if not found
   */
  getTab(tabId) {
    const tab = this.tabs.get(tabId);
    if (!tab) {
      return undefined;
    }

    // Return a copy to prevent external mutation
    return {
      id: tab.id,
      url: tab.url,
      title: tab.title,
      windowId: tab.windowId,
      index: tab.index,
      pinned: tab.pinned,
      parentId: tab.parentId,
      createdAt: tab.createdAt
    };
  }

  /**
   * Get children of a specific tab
   * @param {number} tabId - Parent tab ID
   * @returns {Array} Array of child tab objects in order
   */
  getChildren(tabId) {
    const tab = this.tabs.get(tabId);
    if (!tab) {
      return [];
    }

    // Return children in their stored order (which should match browser index order)
    return tab.children.map(childId => this.getTab(childId)).filter(Boolean);
  }

  /**
   * Get all root tabs (tabs without parents)
   * @returns {Array} Array of root tab objects
   */
  getRootTabs() {
    return Array.from(this.rootTabs).map(tabId => this.getTab(tabId)).filter(Boolean);
  }

  /**
   * Get all tab IDs in the hierarchy
   * @returns {Array<number>} Array of all tab IDs
   */
  getAllTabIds() {
    return Array.from(this.tabs.keys());
  }

  /**
   * Get the total number of tabs
   * @returns {number} Total tab count
   */
  getTabCount() {
    return this.tabs.size;
  }

  /**
   * Get complete hierarchy structure
   * @param {number} windowId - Optional window ID filter
   * @returns {Array} Array of root tabs with nested children, sorted by browser order
   */
  getHierarchy(windowId = null) {
    const roots = this.getRootTabs();
    
    // Filter by window if specified
    const filteredRoots = windowId !== null 
      ? roots.filter(tab => tab.windowId === windowId) 
      : roots;
    
    // Sort by window ID first, then by index to maintain browser tab order
    filteredRoots.sort((a, b) => {
      if (a.windowId !== b.windowId) {
        return a.windowId - b.windowId;
      }
      return (a.index || 0) - (b.index || 0);
    });
    
    return filteredRoots.map(root => this._buildHierarchyNode(root.id));
  }

  /**
   * Private method to build hierarchy node with children
   * @param {number} tabId - Tab ID to build node for
   * @returns {Object} Hierarchy node with children, sorted by browser order
   */
  _buildHierarchyNode(tabId) {
    const tab = this.getTab(tabId);
    if (!tab) {
      return null;
    }

    // Get children in their stored order (already sorted by index)
    const children = this.getChildren(tabId);
    
    return {
      ...tab,
      children: children.map(child => this._buildHierarchyNode(child.id)).filter(Boolean)
    };
  }

  /**
   * Validate hierarchy against actual browser tabs
   * @param {Array} browserTabs - Array of actual browser tab objects
   * @returns {Object} Validation result with isValid flag and issues array
   */
  validateHierarchy(browserTabs) {
    const issues = [];
    const browserTabIds = new Set(browserTabs.map(t => t.id));
    const hierarchyTabIds = new Set(this.tabs.keys());

    // Check for tabs in hierarchy that don't exist in browser
    hierarchyTabIds.forEach(id => {
      if (!browserTabIds.has(id)) {
        issues.push({
          type: 'orphaned_in_hierarchy',
          tabId: id,
          message: `Tab ${id} exists in hierarchy but not in browser`
        });
      }
    });

    // Check for browser tabs not in hierarchy
    browserTabIds.forEach(id => {
      if (!hierarchyTabIds.has(id)) {
        issues.push({
          type: 'missing_in_hierarchy',
          tabId: id,
          message: `Tab ${id} exists in browser but not in hierarchy`
        });
      }
    });

    // Check for index mismatches
    browserTabs.forEach(browserTab => {
      const hierarchyTab = this.tabs.get(browserTab.id);
      if (hierarchyTab) {
        if (hierarchyTab.index !== browserTab.index) {
          issues.push({
            type: 'index_mismatch',
            tabId: browserTab.id,
            browserIndex: browserTab.index,
            hierarchyIndex: hierarchyTab.index,
            message: `Tab ${browserTab.id} has index ${hierarchyTab.index} in hierarchy but ${browserTab.index} in browser`
          });
        }
        if (hierarchyTab.windowId !== browserTab.windowId) {
          issues.push({
            type: 'window_mismatch',
            tabId: browserTab.id,
            browserWindowId: browserTab.windowId,
            hierarchyWindowId: hierarchyTab.windowId,
            message: `Tab ${browserTab.id} is in window ${hierarchyTab.windowId} in hierarchy but ${browserTab.windowId} in browser`
          });
        }
      }
    });

    // Check for circular references
    this.tabs.forEach((tab, id) => {
      if (this._hasCircularReference(id)) {
        issues.push({
          type: 'circular_reference',
          tabId: id,
          message: `Tab ${id} has a circular parent reference`
        });
      }
    });

    // Check for invalid parent references
    this.tabs.forEach((tab, id) => {
      if (tab.parentId !== null && !this.tabs.has(tab.parentId)) {
        issues.push({
          type: 'invalid_parent',
          tabId: id,
          parentId: tab.parentId,
          message: `Tab ${id} references non-existent parent ${tab.parentId}`
        });
      }
    });

    // Check children array integrity
    this.tabs.forEach((tab, id) => {
      tab.children.forEach(childId => {
        if (!this.tabs.has(childId)) {
          issues.push({
            type: 'invalid_child',
            tabId: id,
            childId: childId,
            message: `Tab ${id} has non-existent child ${childId}`
          });
        }
        const child = this.tabs.get(childId);
        if (child && child.parentId !== id) {
          issues.push({
            type: 'parent_child_mismatch',
            tabId: id,
            childId: childId,
            message: `Tab ${id} lists ${childId} as child, but child's parentId is ${child.parentId}`
          });
        }
      });
    });

    return {
      isValid: issues.length === 0,
      issues,
      stats: {
        browserTabCount: browserTabs.length,
        hierarchyTabCount: this.tabs.size,
        rootTabCount: this.rootTabs.size
      }
    };
  }

  /**
   * Check if a tab has a circular reference in its parent chain
   * @param {number} tabId - Tab ID to check
   * @returns {boolean} True if circular reference exists
   */
  _hasCircularReference(tabId) {
    const visited = new Set();
    let currentId = tabId;
    
    while (currentId !== null) {
      if (visited.has(currentId)) {
        return true;
      }
      visited.add(currentId);
      const tab = this.tabs.get(currentId);
      currentId = tab ? tab.parentId : null;
    }
    
    return false;
  }

  /**
   * Repair hierarchy issues based on validation results
   * @param {Array} browserTabs - Array of actual browser tab objects
   * @returns {Object} Repair results
   */
  repairHierarchy(browserTabs) {
    const validation = this.validateHierarchy(browserTabs);
    const repairs = [];

    validation.issues.forEach(issue => {
      switch (issue.type) {
        case 'orphaned_in_hierarchy':
          // Remove tabs that no longer exist in browser
          this._removeSingleTab(issue.tabId);
          repairs.push({ action: 'removed_orphan', tabId: issue.tabId });
          break;

        case 'missing_in_hierarchy':
          // Add missing browser tabs
          const browserTab = browserTabs.find(t => t.id === issue.tabId);
          if (browserTab) {
            this.addTab(browserTab);
            repairs.push({ action: 'added_missing', tabId: issue.tabId });
          }
          break;

        case 'index_mismatch':
        case 'window_mismatch':
          // Update tab with correct browser values
          const tab = browserTabs.find(t => t.id === issue.tabId);
          if (tab) {
            const internalTab = this.tabs.get(issue.tabId);
            if (internalTab) {
              internalTab.index = tab.index;
              internalTab.windowId = tab.windowId;
              repairs.push({ action: 'updated_index', tabId: issue.tabId });
            }
          }
          break;

        case 'invalid_parent':
          // Make tab a root tab
          const orphanTab = this.tabs.get(issue.tabId);
          if (orphanTab) {
            orphanTab.parentId = null;
            this.rootTabs.add(issue.tabId);
            repairs.push({ action: 'orphaned_tab', tabId: issue.tabId });
          }
          break;

        case 'invalid_child':
          // Remove invalid child from children array
          const parentTab = this.tabs.get(issue.tabId);
          if (parentTab) {
            const idx = parentTab.children.indexOf(issue.childId);
            if (idx !== -1) {
              parentTab.children.splice(idx, 1);
              repairs.push({ action: 'removed_invalid_child', tabId: issue.tabId, childId: issue.childId });
            }
          }
          break;

        case 'parent_child_mismatch':
          // Fix the mismatch by updating child's parent reference
          const childTab = this.tabs.get(issue.childId);
          if (childTab) {
            childTab.parentId = issue.tabId;
            repairs.push({ action: 'fixed_parent_reference', tabId: issue.childId, parentId: issue.tabId });
          }
          break;

        case 'circular_reference':
          // Break the circular reference by making the tab a root
          const circularTab = this.tabs.get(issue.tabId);
          if (circularTab && circularTab.parentId) {
            const oldParent = this.tabs.get(circularTab.parentId);
            if (oldParent) {
              const idx = oldParent.children.indexOf(issue.tabId);
              if (idx !== -1) {
                oldParent.children.splice(idx, 1);
              }
            }
            circularTab.parentId = null;
            this.rootTabs.add(issue.tabId);
            repairs.push({ action: 'broke_circular_ref', tabId: issue.tabId });
          }
          break;
      }
    });

    // Re-sort all children after repairs
    this.sortAllChildrenByBrowserIndex();

    this._debouncedSave();

    return {
      repairsPerformed: repairs.length,
      repairs
    };
  }

  /**
   * Check if adding a parent relationship would create a circular reference
   * @param {number} childId - Child tab ID
   * @param {number} parentId - Potential parent tab ID
   * @returns {boolean} True if would create circular reference
   */
  _wouldCreateCircularRef(childId, parentId) {
    let currentId = parentId;
    const visited = new Set();

    while (currentId && !visited.has(currentId)) {
      if (currentId === childId) {
        return true; // Circular reference detected
      }
      
      visited.add(currentId);
      const tab = this.tabs.get(currentId);
      currentId = tab ? tab.parentId : null;
    }

    return false;
  }

  /**
   * Remove entire subtree starting from a tab
   * @param {number} tabId - Root tab ID of subtree to remove
   */
  _removeSubtree(tabId) {
    const tab = this.tabs.get(tabId);
    if (!tab) {
      return;
    }

    // Recursively remove all children first (copy array to avoid modification during iteration)
    const children = [...tab.children];
    for (const childId of children) {
      this._removeSubtree(childId);
    }

    // Remove the tab itself
    this._removeSingleTab(tabId);
  }

  /**
   * Orphan children of a tab (make them root tabs)
   * @param {number} tabId - Parent tab ID
   */
  _orphanChildren(tabId) {
    const tab = this.tabs.get(tabId);
    if (!tab) {
      return;
    }

    // Make all children root tabs (copy array to avoid modification during iteration)
    const children = [...tab.children];
    for (const childId of children) {
      const child = this.tabs.get(childId);
      if (child) {
        child.parentId = null;
        this.rootTabs.add(childId);
      }
    }
    
    // Clear the children array
    tab.children = [];
  }

  /**
   * Remove a single tab without affecting children
   * @param {number} tabId - Tab ID to remove
   */
  _removeSingleTab(tabId) {
    const tab = this.tabs.get(tabId);
    if (!tab) {
      return;
    }

    // Remove from parent's children if it has a parent
    if (tab.parentId) {
      const parent = this.tabs.get(tab.parentId);
      if (parent) {
        const idx = parent.children.indexOf(tabId);
        if (idx !== -1) {
          parent.children.splice(idx, 1);
        }
      }
    }

    // Remove from root tabs if it's a root
    this.rootTabs.delete(tabId);

    // Remove from tabs map
    this.tabs.delete(tabId);
  }

  /**
   * Update parent relationship for a tab
   * @param {number} tabId - Tab ID
   * @param {number|null} newParentId - New parent ID (null for root)
   */
  _updateParentRelationship(tabId, newParentId) {
    const tab = this.tabs.get(tabId);
    if (!tab) {
      return;
    }

    // Remove from current parent
    if (tab.parentId) {
      const oldParent = this.tabs.get(tab.parentId);
      if (oldParent) {
        const idx = oldParent.children.indexOf(tabId);
        if (idx !== -1) {
          oldParent.children.splice(idx, 1);
        }
      }
    } else {
      this.rootTabs.delete(tabId);
    }

    // Set new parent relationship
    if (newParentId && this.tabs.has(newParentId) && !this._wouldCreateCircularRef(tabId, newParentId)) {
      tab.parentId = newParentId;
      const newParent = this.tabs.get(newParentId);
      this._insertChildInOrder(newParent, tabId, tab.index);
    } else {
      tab.parentId = null;
      this.rootTabs.add(tabId);
    }

    this._debouncedSave();
  }

  /**
   * Clear the entire hierarchy
   */
  clear() {
    this.tabs.clear();
    this.rootTabs.clear();
    this._debouncedSave();
  }

  /**
   * Get a flat list of all tabs with their hierarchy depth
   * @param {number|null} windowId - Optional window ID filter
   * @returns {Array} Array of {tab, depth} objects in tree traversal order
   */
  getFlatList(windowId = null) {
    const result = [];
    const hierarchy = this.getHierarchy(windowId);

    const traverse = (nodes, depth = 0) => {
      for (const node of nodes) {
        result.push({ tab: node, depth });
        if (node.children && node.children.length > 0) {
          traverse(node.children, depth + 1);
        }
      }
    };

    traverse(hierarchy);
    return result;
  }
}

// Export for Node.js (tests) and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TabTree;
} else if (typeof window !== 'undefined') {
  window.TabTree = TabTree;
}
