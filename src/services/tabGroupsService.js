/**
 * Tab Groups Service
 * Manages Chrome's native Tab Groups API for creating and managing browser tab groups
 */

// Available Chrome tab group colors
export const TAB_GROUP_COLORS = [
  'blue',
  'cyan', 
  'green',
  'yellow',
  'orange',
  'pink',
  'purple',
  'red',
  'grey'
];

// Color assignments for consistent group coloring
const colorAssignments = new Map();
let colorIndex = 0;

/**
 * Get the next available color for a group
 * @param {string} groupName - Name of the group for consistent coloring
 * @returns {string} Color name
 */
function getColorForGroup(groupName) {
  // Check if we already assigned a color to this group name
  if (colorAssignments.has(groupName)) {
    return colorAssignments.get(groupName);
  }
  
  // Assign the next color in rotation
  const color = TAB_GROUP_COLORS[colorIndex % TAB_GROUP_COLORS.length];
  colorAssignments.set(groupName, color);
  colorIndex++;
  
  return color;
}

/**
 * Reset color assignments (call when starting fresh organization)
 */
export function resetColorAssignments() {
  colorAssignments.clear();
  colorIndex = 0;
}

/**
 * Create a Chrome tab group from an array of tab IDs
 * @param {number[]} tabIds - Array of tab IDs to group
 * @param {Object} options - Group options
 * @param {string} options.title - Group title
 * @param {string} options.color - Group color (blue, cyan, green, yellow, orange, pink, purple, red, grey)
 * @param {boolean} options.collapsed - Whether to collapse the group
 * @returns {Promise<number>} The created group ID
 */
export async function createTabGroup(tabIds, options = {}) {
  if (!tabIds || tabIds.length === 0) {
    throw new Error('No tabs provided for grouping');
  }

  try {
    // Create the group with the tabs
    const groupId = await chrome.tabs.group({ tabIds });
    
    // Update group properties
    const updateProps = {};
    
    if (options.title) {
      updateProps.title = options.title;
    }
    
    if (options.color) {
      updateProps.color = options.color;
    } else {
      // Auto-assign color based on title
      updateProps.color = getColorForGroup(options.title || `Group ${groupId}`);
    }
    
    if (options.collapsed !== undefined) {
      updateProps.collapsed = options.collapsed;
    }
    
    if (Object.keys(updateProps).length > 0) {
      await chrome.tabGroups.update(groupId, updateProps);
    }
    
    console.log(`Created tab group "${options.title}" with ${tabIds.length} tabs, color: ${updateProps.color}`);
    
    return groupId;
  } catch (error) {
    console.error('Failed to create tab group:', error);
    throw error;
  }
}

/**
 * Add tabs to an existing group
 * @param {number} groupId - Existing group ID
 * @param {number[]} tabIds - Tab IDs to add
 */
export async function addTabsToGroup(groupId, tabIds) {
  if (!tabIds || tabIds.length === 0) return;
  
  try {
    await chrome.tabs.group({ tabIds, groupId });
    console.log(`Added ${tabIds.length} tabs to group ${groupId}`);
  } catch (error) {
    console.error('Failed to add tabs to group:', error);
    throw error;
  }
}

/**
 * Remove tabs from their current group (ungroup)
 * @param {number[]} tabIds - Tab IDs to ungroup
 */
export async function ungroupTabs(tabIds) {
  if (!tabIds || tabIds.length === 0) return;
  
  try {
    await chrome.tabs.ungroup(tabIds);
    console.log(`Ungrouped ${tabIds.length} tabs`);
  } catch (error) {
    console.error('Failed to ungroup tabs:', error);
    throw error;
  }
}

/**
 * Get all existing tab groups in a window
 * @param {number} windowId - Window ID (optional, defaults to current)
 * @returns {Promise<chrome.tabGroups.TabGroup[]>}
 */
export async function getTabGroups(windowId = null) {
  try {
    const query = windowId ? { windowId } : {};
    return await chrome.tabGroups.query(query);
  } catch (error) {
    console.error('Failed to get tab groups:', error);
    return [];
  }
}

/**
 * Update a tab group's properties
 * @param {number} groupId - Group ID
 * @param {Object} properties - Properties to update (title, color, collapsed)
 */
export async function updateTabGroup(groupId, properties) {
  try {
    await chrome.tabGroups.update(groupId, properties);
  } catch (error) {
    console.error('Failed to update tab group:', error);
    throw error;
  }
}

/**
 * Collapse or expand a tab group
 * @param {number} groupId - Group ID
 * @param {boolean} collapsed - Whether to collapse
 */
export async function setGroupCollapsed(groupId, collapsed) {
  return updateTabGroup(groupId, { collapsed });
}

/**
 * Delete a tab group (ungroups all tabs in it)
 * @param {number} groupId - Group ID to delete
 */
export async function deleteTabGroup(groupId) {
  try {
    // Get all tabs in the group
    const tabs = await chrome.tabs.query({ groupId });
    const tabIds = tabs.map(t => t.id);
    
    if (tabIds.length > 0) {
      await chrome.tabs.ungroup(tabIds);
    }
    
    console.log(`Deleted tab group ${groupId}`);
  } catch (error) {
    console.error('Failed to delete tab group:', error);
    throw error;
  }
}

/**
 * Delete all tab groups in a window
 * @param {number} windowId - Window ID (optional)
 */
export async function deleteAllTabGroups(windowId = null) {
  try {
    const groups = await getTabGroups(windowId);
    
    for (const group of groups) {
      await deleteTabGroup(group.id);
    }
    
    console.log(`Deleted ${groups.length} tab groups`);
  } catch (error) {
    console.error('Failed to delete all tab groups:', error);
    throw error;
  }
}

/**
 * Create multiple tab groups from an organization structure
 * @param {Object} organization - AI organization structure with groups
 * @param {Object} options - Options for group creation
 * @param {boolean} options.collapseGroups - Whether to collapse all groups after creation
 * @param {boolean} options.clearExisting - Whether to clear existing groups first
 * @returns {Promise<Object>} Result with created groups
 */
export async function createGroupsFromOrganization(organization, options = {}) {
  const { collapseGroups = false, clearExisting = false } = options;
  const results = {
    success: true,
    groupsCreated: 0,
    tabsGrouped: 0,
    errors: [],
    groupIds: []
  };

  try {
    // Reset color assignments for fresh coloring
    resetColorAssignments();

    // Optionally clear existing groups
    if (clearExisting) {
      await deleteAllTabGroups();
    }

    // Process each group in the organization
    const groups = organization.groups || [];
    
    for (const group of groups) {
      try {
        // Collect all tab IDs for this group (including nested children)
        const allTabIds = collectAllTabIds(group);
        
        if (allTabIds.length === 0) continue;
        
        // Create the Chrome tab group
        const groupId = await createTabGroup(allTabIds, {
          title: group.name,
          collapsed: collapseGroups
        });
        
        results.groupIds.push(groupId);
        results.groupsCreated++;
        results.tabsGrouped += allTabIds.length;
        
      } catch (groupError) {
        console.error(`Failed to create group "${group.name}":`, groupError);
        results.errors.push({
          group: group.name,
          error: groupError.message
        });
      }
    }

    if (results.errors.length > 0) {
      results.success = results.groupsCreated > 0; // Partial success
    }

    console.log(`Created ${results.groupsCreated} groups with ${results.tabsGrouped} tabs`);
    
    return results;
  } catch (error) {
    console.error('Failed to create groups from organization:', error);
    return {
      success: false,
      groupsCreated: 0,
      tabsGrouped: 0,
      errors: [{ error: error.message }],
      groupIds: []
    };
  }
}

/**
 * Collect all tab IDs from a group including nested children
 * @param {Object} group - Group object with tabs and optional children
 * @returns {number[]} Array of all tab IDs
 */
function collectAllTabIds(group) {
  let tabIds = [...(group.tabs || [])];
  
  if (group.children) {
    for (const child of group.children) {
      tabIds = tabIds.concat(collectAllTabIds(child));
    }
  }
  
  return tabIds;
}

/**
 * Smart grouping: Organize tabs into groups by domain
 * @param {number} windowId - Window ID
 * @param {Object} options - Options
 * @returns {Promise<Object>} Result
 */
export async function groupTabsByDomain(windowId = null, options = {}) {
  try {
    resetColorAssignments();
    
    // Get all tabs
    const query = windowId ? { windowId } : {};
    const tabs = await chrome.tabs.query(query);
    
    // Group by domain
    const domainGroups = new Map();
    
    for (const tab of tabs) {
      // Skip pinned tabs (can't be grouped)
      if (tab.pinned) continue;
      
      try {
        const url = new URL(tab.url);
        let domain = url.hostname;
        
        // Simplify domain (remove www)
        if (domain.startsWith('www.')) {
          domain = domain.substring(4);
        }
        
        if (!domainGroups.has(domain)) {
          domainGroups.set(domain, []);
        }
        domainGroups.get(domain).push(tab.id);
      } catch {
        // Invalid URL, skip
      }
    }
    
    const results = {
      success: true,
      groupsCreated: 0,
      tabsGrouped: 0,
      errors: []
    };
    
    // Create groups for domains with 2+ tabs
    const minTabsForGroup = options.minTabsForGroup || 2;
    
    for (const [domain, tabIds] of domainGroups) {
      if (tabIds.length >= minTabsForGroup) {
        try {
          await createTabGroup(tabIds, {
            title: domain,
            collapsed: options.collapseGroups || false
          });
          results.groupsCreated++;
          results.tabsGrouped += tabIds.length;
        } catch (error) {
          results.errors.push({ domain, error: error.message });
        }
      }
    }
    
    return results;
  } catch (error) {
    console.error('Failed to group tabs by domain:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get info about which tabs are in which groups
 * @param {number} windowId - Window ID
 * @returns {Promise<Map<number, {groupId: number, groupTitle: string, color: string}>>}
 */
export async function getTabGroupMembership(windowId = null) {
  const membership = new Map();
  
  try {
    const query = windowId ? { windowId } : {};
    const tabs = await chrome.tabs.query(query);
    const groups = await getTabGroups(windowId);
    
    // Create group lookup
    const groupLookup = new Map(groups.map(g => [g.id, g]));
    
    for (const tab of tabs) {
      if (tab.groupId !== -1 && tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE) {
        const group = groupLookup.get(tab.groupId);
        if (group) {
          membership.set(tab.id, {
            groupId: group.id,
            groupTitle: group.title,
            color: group.color
          });
        }
      }
    }
  } catch (error) {
    console.error('Failed to get tab group membership:', error);
  }
  
  return membership;
}

/**
 * Move a tab group to a specific position
 * @param {number} groupId - Group ID
 * @param {number} index - Target index
 * @param {number} windowId - Target window ID (optional)
 */
export async function moveTabGroup(groupId, index, windowId = null) {
  try {
    const moveProps = { index };
    if (windowId) {
      moveProps.windowId = windowId;
    }
    await chrome.tabGroups.move(groupId, moveProps);
  } catch (error) {
    console.error('Failed to move tab group:', error);
    throw error;
  }
}

/**
 * Collapse all groups in a window
 * @param {number} windowId - Window ID
 */
export async function collapseAllGroups(windowId = null) {
  const groups = await getTabGroups(windowId);
  for (const group of groups) {
    await setGroupCollapsed(group.id, true);
  }
}

/**
 * Expand all groups in a window
 * @param {number} windowId - Window ID
 */
export async function expandAllGroups(windowId = null) {
  const groups = await getTabGroups(windowId);
  for (const group of groups) {
    await setGroupCollapsed(group.id, false);
  }
}

export default {
  TAB_GROUP_COLORS,
  resetColorAssignments,
  createTabGroup,
  addTabsToGroup,
  ungroupTabs,
  getTabGroups,
  updateTabGroup,
  setGroupCollapsed,
  deleteTabGroup,
  deleteAllTabGroups,
  createGroupsFromOrganization,
  groupTabsByDomain,
  getTabGroupMembership,
  moveTabGroup,
  collapseAllGroups,
  expandAllGroups
};


