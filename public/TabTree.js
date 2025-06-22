/**
 * TabTree Class - Manages hierarchical tab relationships
 * 
 * This class provides functionality to track parent-child relationships
 * between browser tabs, supporting multi-window environments and
 * maintaining referential integrity.
 */
class TabTree {
  constructor() {
    // Map of tab ID to tab data (includes parentId and children)
    this.tabs = new Map();
    // Set of root tab IDs (tabs without parents)
    this.rootTabs = new Set();
  }

  /**
   * Add a tab to the hierarchy
   * @param {Object} tab - Tab object with id, url, title, windowId, index, openerTabId
   */
  addTab(tab) {
    if (!tab || typeof tab.id !== 'number') {
      throw new Error('Invalid tab: must have numeric id');
    }

    // Create internal tab representation
    const internalTab = {
      id: tab.id,
      url: tab.url,
      title: tab.title,
      windowId: tab.windowId,
      index: tab.index,
      parentId: null,
      children: new Set(),
      createdAt: Date.now()
    };

    // Determine parent relationship
    if (tab.openerTabId && this.tabs.has(tab.openerTabId)) {
      // Prevent circular references
      if (!this._wouldCreateCircularRef(tab.id, tab.openerTabId)) {
        internalTab.parentId = tab.openerTabId;
        this.tabs.get(tab.openerTabId).children.add(tab.id);
      }
    }

    // Add to appropriate collections
    this.tabs.set(tab.id, internalTab);
    
    if (internalTab.parentId === null) {
      this.rootTabs.add(tab.id);
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

    // Apply allowed updates
    Object.assign(tab, allowedUpdates);

    // Handle opener changes (parent relationship changes)
    if (updates.openerTabId !== undefined) {
      this._updateParentRelationship(tabId, updates.openerTabId);
    }
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
      parentId: tab.parentId,
      createdAt: tab.createdAt
    };
  }

  /**
   * Get children of a specific tab
   * @param {number} tabId - Parent tab ID
   * @returns {Array} Array of child tab objects
   */
  getChildren(tabId) {
    const tab = this.tabs.get(tabId);
    if (!tab) {
      return [];
    }

    return Array.from(tab.children).map(childId => this.getTab(childId)).filter(Boolean);
  }

  /**
   * Get all root tabs (tabs without parents)
   * @returns {Array} Array of root tab objects
   */
  getRootTabs() {
    return Array.from(this.rootTabs).map(tabId => this.getTab(tabId)).filter(Boolean);
  }

  /**
   * Get complete hierarchy structure
   * @param {number} windowId - Optional window ID filter
   * @returns {Array} Array of root tabs with nested children
   */
  getHierarchy(windowId = null) {
    const roots = this.getRootTabs();
    
    // Filter by window if specified
    const filteredRoots = windowId ? roots.filter(tab => tab.windowId === windowId) : roots;
    
    return filteredRoots.map(root => this._buildHierarchyNode(root.id));
  }

  /**
   * Private method to build hierarchy node with children
   * @param {number} tabId - Tab ID to build node for
   * @returns {Object} Hierarchy node with children
   */
  _buildHierarchyNode(tabId) {
    const tab = this.getTab(tabId);
    if (!tab) {
      return null;
    }

    const children = this.getChildren(tabId);
    
    return {
      ...tab,
      children: children.map(child => this._buildHierarchyNode(child.id)).filter(Boolean)
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

    // Recursively remove all children first
    for (const childId of tab.children) {
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

    // Make all children root tabs
    for (const childId of tab.children) {
      const child = this.tabs.get(childId);
      if (child) {
        child.parentId = null;
        this.rootTabs.add(childId);
      }
    }
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
        parent.children.delete(tabId);
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
        oldParent.children.delete(tabId);
      }
    } else {
      this.rootTabs.delete(tabId);
    }

    // Set new parent relationship
    if (newParentId && this.tabs.has(newParentId) && !this._wouldCreateCircularRef(tabId, newParentId)) {
      tab.parentId = newParentId;
      this.tabs.get(newParentId).children.add(tabId);
    } else {
      tab.parentId = null;
      this.rootTabs.add(tabId);
    }
  }
}

// Export for Node.js (tests) and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TabTree;
} else if (typeof window !== 'undefined') {
  window.TabTree = TabTree;
}