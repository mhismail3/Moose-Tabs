/**
 * Tab Organizer Service
 * Handles AI-powered tab organization and Chrome Tab Groups integration
 */

import { getAIService, getInitializedAIService, AIServiceError } from './aiService';
import { getSettings } from '../utils/settings';
import {
  createGroupsFromOrganization,
  groupTabsByDomain,
  deleteAllTabGroups,
  collapseAllGroups,
  expandAllGroups,
  getTabGroups,
  resetColorAssignments,
  TAB_GROUP_COLORS
} from './tabGroupsService';

/**
 * Organization modes
 */
export const ORGANIZATION_MODES = {
  HIERARCHY: 'hierarchy',     // Update parent-child relationships in Moose Tabs
  CHROME_GROUPS: 'groups',    // Create Chrome Tab Groups
  BOTH: 'both'                // Do both
};

/**
 * Tab Organizer class
 */
class TabOrganizer {
  constructor() {
    this.aiService = getAIService();
    this.pendingSuggestion = null;
    this.history = [];
    this.maxHistorySize = 10;
  }

  /**
   * Generate organization suggestion for given tabs
   * @param {Array} tabs - Array of tab objects with id, title, url
   * @param {Object} options - Organization options
   * @param {string} options.strategy - Organization strategy
   * @param {string} options.feedback - User feedback for regeneration
   * @returns {Promise<Object>} Organization suggestion
   */
  async generateOrganizationSuggestion(tabs, options = {}) {
    const settings = await getSettings();
    const strategy = options.strategy || settings.ai?.organizationStrategy || 'smart';
    const feedback = options.feedback || null;

    try {
      // Ensure AI service is properly initialized before use
      this.aiService = await getInitializedAIService();
      
      console.log('Generating organization suggestion for', tabs.length, 'tabs');
      const result = await this.aiService.analyzeTabsForOrganization(tabs, strategy, { feedback });
      
      if (result.success) {
        this.pendingSuggestion = {
          timestamp: Date.now(),
          originalTabs: tabs,
          organization: result.organization,
          strategy,
          feedback
        };
        
        return {
          success: true,
          suggestion: this.pendingSuggestion,
          preview: this.generatePreview(result.organization, tabs)
        };
      } else {
        // Pass through the specific error from AI service
        const errorMsg = result.error || 'Failed to generate organization';
        console.error('AI service returned error:', errorMsg);
        return {
          success: false,
          error: errorMsg
        };
      }
    } catch (error) {
      console.error('Organization suggestion failed:', error);
      // Provide specific error messages
      let errorMsg = 'Failed to generate organization';
      if (error instanceof AIServiceError) {
        errorMsg = error.message;
      } else if (error.message) {
        errorMsg = error.message;
      }
      return {
        success: false,
        error: errorMsg
      };
    }
  }

  /**
   * Generate a preview of what the organization will look like
   */
  generatePreview(organization, tabs) {
    const tabMap = new Map(tabs.map(t => [t.id, t]));
    
    const buildPreviewTree = (groups, depth = 0) => {
      return groups.map((group, index) => ({
        name: group.name,
        depth,
        color: TAB_GROUP_COLORS[index % TAB_GROUP_COLORS.length],
        tabs: (group.tabs || []).map(id => {
          const tab = tabMap.get(id);
          return tab ? {
            id: tab.id,
            title: tab.title,
            url: tab.url,
            favicon: tab.favIconUrl
          } : null;
        }).filter(Boolean),
        children: group.children ? buildPreviewTree(group.children, depth + 1) : []
      }));
    };

    return buildPreviewTree(organization.groups || []);
  }

  /**
   * Apply the pending organization suggestion
   * @param {Object} options - Apply options
   * @param {string} options.mode - Organization mode (hierarchy, groups, both)
   * @param {boolean} options.collapseGroups - Collapse groups after creation
   * @param {boolean} options.clearExisting - Clear existing groups first
   * @returns {Promise<Object>} Result of applying organization
   */
  async applyOrganization(options = {}) {
    if (!this.pendingSuggestion) {
      return { success: false, error: 'No pending suggestion to apply' };
    }

    const {
      mode = ORGANIZATION_MODES.CHROME_GROUPS,
      collapseGroups = false,
      clearExisting = true
    } = options;

    const suggestion = this.pendingSuggestion;
    const results = {
      success: true,
      mode,
      hierarchyChanges: 0,
      groupsCreated: 0,
      tabsGrouped: 0,
      errors: []
    };

    try {
      // Apply Chrome Tab Groups if requested
      if (mode === ORGANIZATION_MODES.CHROME_GROUPS || mode === ORGANIZATION_MODES.BOTH) {
        const groupResult = await createGroupsFromOrganization(
          suggestion.organization,
          { collapseGroups, clearExisting }
        );

        results.groupsCreated = groupResult.groupsCreated;
        results.tabsGrouped = groupResult.tabsGrouped;
        
        if (!groupResult.success) {
          results.errors.push(...(groupResult.errors || []));
        }
      }

      // Apply hierarchy changes if requested
      if (mode === ORGANIZATION_MODES.HIERARCHY || mode === ORGANIZATION_MODES.BOTH) {
        const hierarchyResult = await this.applyHierarchyChanges(suggestion);
        results.hierarchyChanges = hierarchyResult.changesApplied;
        
        if (!hierarchyResult.success) {
          results.errors.push({ type: 'hierarchy', error: hierarchyResult.error });
        }
      }

      // Save to history
      this.addToHistory({
        timestamp: Date.now(),
        suggestion,
        results,
        mode
      });

      // Clear pending suggestion
      this.pendingSuggestion = null;

      results.success = results.errors.length === 0;
      return results;

    } catch (error) {
      console.error('Failed to apply organization:', error);
      return {
        success: false,
        error: error.message,
        ...results
      };
    }
  }

  /**
   * Apply hierarchy changes (parent-child relationships)
   */
  async applyHierarchyChanges(suggestion) {
    const changes = this.buildHierarchyChanges(suggestion.organization, suggestion.originalTabs);
    let changesApplied = 0;

    try {
      for (const change of changes) {
        try {
          await chrome.runtime.sendMessage({
            action: 'updateParentRelationship',
            tabId: change.tabId,
            parentId: change.parentId
          });
          changesApplied++;
        } catch (error) {
          console.error(`Failed to update relationship for tab ${change.tabId}:`, error);
        }
      }

      // Refresh hierarchy
      await chrome.runtime.sendMessage({ action: 'refreshHierarchy' });

      return { success: true, changesApplied };
    } catch (error) {
      return { success: false, error: error.message, changesApplied };
    }
  }

  /**
   * Build hierarchy changes from organization structure
   */
  buildHierarchyChanges(organization, originalTabs) {
    const changes = [];

    const processGroup = (group, parentTabId = null) => {
      const tabIds = group.tabs || [];
      
      if (tabIds.length === 0) {
        if (group.children) {
          group.children.forEach(child => processGroup(child, parentTabId));
        }
        return;
      }

      const groupParentId = tabIds[0];
      
      if (parentTabId !== null) {
        changes.push({ tabId: groupParentId, parentId: parentTabId });
      } else {
        changes.push({ tabId: groupParentId, parentId: null });
      }

      for (let i = 1; i < tabIds.length; i++) {
        changes.push({ tabId: tabIds[i], parentId: groupParentId });
      }

      if (group.children) {
        group.children.forEach(child => processGroup(child, groupParentId));
      }
    };

    (organization.groups || []).forEach(group => processGroup(group, null));
    return changes;
  }

  /**
   * Reject and clear the pending suggestion
   */
  rejectSuggestion() {
    this.pendingSuggestion = null;
    return { success: true };
  }

  /**
   * Get the current pending suggestion
   */
  getPendingSuggestion() {
    return this.pendingSuggestion;
  }

  /**
   * Add an entry to history
   */
  addToHistory(entry) {
    this.history.unshift(entry);
    if (this.history.length > this.maxHistorySize) {
      this.history.pop();
    }
  }

  /**
   * Get organization history
   */
  getHistory() {
    return this.history;
  }

  /**
   * Clear history
   */
  clearHistory() {
    this.history = [];
  }

  /**
   * Quick organization by domain (creates Chrome Tab Groups)
   * @param {Array} tabs - Tabs to organize
   * @param {Object} options - Options
   */
  async organizeByDomain(tabs, options = {}) {
    const { 
      createGroups = true,
      collapseGroups = false,
      minTabsForGroup = 2 
    } = options;

    // Build domain groups locally first
    const domainGroups = new Map();
    
    tabs.forEach(tab => {
      if (tab.pinned) return; // Skip pinned tabs
      
      try {
        const url = new URL(tab.url);
        let domain = url.hostname;
        if (domain.startsWith('www.')) {
          domain = domain.substring(4);
        }
        
        if (!domainGroups.has(domain)) {
          domainGroups.set(domain, []);
        }
        domainGroups.get(domain).push(tab.id);
      } catch {
        // Invalid URL
      }
    });

    // Filter to domains with enough tabs
    const validGroups = [];
    domainGroups.forEach((tabIds, domain) => {
      if (tabIds.length >= minTabsForGroup) {
        validGroups.push({ name: domain, tabs: tabIds });
      }
    });

    const organization = {
      groups: validGroups,
      explanation: 'Organized by website domain'
    };

    // Store as pending suggestion
    this.pendingSuggestion = {
      timestamp: Date.now(),
      originalTabs: tabs,
      organization,
      strategy: 'domain-quick'
    };

    // If createGroups is true, apply immediately with Chrome Tab Groups
    if (createGroups) {
      resetColorAssignments();
      const result = await createGroupsFromOrganization(organization, {
        collapseGroups,
        clearExisting: true
      });

      this.pendingSuggestion = null;

      return {
        success: result.success,
        groupsCreated: result.groupsCreated,
        tabsGrouped: result.tabsGrouped,
        applied: true
      };
    }

    return {
      success: true,
      suggestion: this.pendingSuggestion,
      preview: this.generatePreview(organization, tabs),
      applied: false
    };
  }

  /**
   * Flatten hierarchy (make all tabs root tabs)
   */
  async flattenHierarchy(tabs) {
    const operations = [];

    for (const tab of tabs) {
      try {
        await chrome.runtime.sendMessage({
          action: 'updateParentRelationship',
          tabId: tab.id,
          parentId: null
        });
        operations.push({ success: true, tabId: tab.id });
      } catch (error) {
        operations.push({ success: false, tabId: tab.id, error: error.message });
      }
    }

    await chrome.runtime.sendMessage({ action: 'refreshHierarchy' });

    return {
      success: true,
      flattenedCount: operations.filter(op => op.success).length
    };
  }

  /**
   * Remove all Chrome Tab Groups (ungroup all tabs)
   * @param {number} windowId - Window ID (optional)
   */
  async removeAllGroups(windowId = null) {
    try {
      await deleteAllTabGroups(windowId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Collapse all Chrome Tab Groups
   * @param {number} windowId - Window ID (optional)
   */
  async collapseAllGroups(windowId = null) {
    try {
      await collapseAllGroups(windowId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Expand all Chrome Tab Groups
   * @param {number} windowId - Window ID (optional)
   */
  async expandAllGroups(windowId = null) {
    try {
      await expandAllGroups(windowId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get existing Chrome Tab Groups info
   * @param {number} windowId - Window ID (optional)
   */
  async getExistingGroups(windowId = null) {
    try {
      const groups = await getTabGroups(windowId);
      return { success: true, groups };
    } catch (error) {
      return { success: false, groups: [], error: error.message };
    }
  }
}

// Singleton instance
let tabOrganizerInstance = null;

/**
 * Get the tab organizer singleton
 */
export function getTabOrganizer() {
  if (!tabOrganizerInstance) {
    tabOrganizerInstance = new TabOrganizer();
  }
  return tabOrganizerInstance;
}

export default TabOrganizer;
