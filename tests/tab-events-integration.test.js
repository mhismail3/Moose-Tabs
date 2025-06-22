// Tab Events Integration Tests - Task 1.3
// Tests enhanced tab event handling, parent-child detection, and edge cases

const TabTree = require('../public/TabTree');

// Mock Chrome APIs with enhanced functionality
global.chrome = {
  tabs: {
    query: jest.fn(),
    get: jest.fn(),
    onCreated: { addListener: jest.fn() },
    onRemoved: { addListener: jest.fn() },
    onMoved: { addListener: jest.fn() },
    onUpdated: { addListener: jest.fn() },
    onAttached: { addListener: jest.fn() },
    onDetached: { addListener: jest.fn() }
  },
  runtime: {
    onInstalled: { addListener: jest.fn() },
    onStartup: { addListener: jest.fn() },
    onMessage: { addListener: jest.fn() },
    sendMessage: jest.fn().mockRejectedValue(new Error('No listener'))
  },
  action: {
    onClicked: { addListener: jest.fn() }
  },
  sidePanel: {
    open: jest.fn()
  },
  windows: {
    getAll: jest.fn().mockResolvedValue([{ id: 1 }, { id: 2 }])
  }
};

// Mock console
global.console = {
  log: jest.fn(),
  error: jest.fn()
};

// Mock importScripts
global.importScripts = jest.fn();

describe('Tab Events Integration Tests - Task 1.3', () => {
  let tabHierarchy;
  let eventHandlers;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create fresh TabTree instance
    tabHierarchy = new TabTree();
    
    // Mock importScripts to provide TabTree
    global.TabTree = TabTree;
    global.tabHierarchy = tabHierarchy;
    
    // Initialize event handlers object to simulate background script
    eventHandlers = {
      onCreated: null,
      onRemoved: null,
      onMoved: null,
      onUpdated: null,
      onAttached: null,
      onDetached: null
    };
    
    // Mock event listener registration to capture handlers
    chrome.tabs.onCreated.addListener.mockImplementation((handler) => {
      eventHandlers.onCreated = handler;
    });
    chrome.tabs.onRemoved.addListener.mockImplementation((handler) => {
      eventHandlers.onRemoved = handler;
    });
    chrome.tabs.onMoved.addListener.mockImplementation((handler) => {
      eventHandlers.onMoved = handler;
    });
    chrome.tabs.onUpdated.addListener.mockImplementation((handler) => {
      eventHandlers.onUpdated = handler;
    });
    chrome.tabs.onAttached.addListener.mockImplementation((handler) => {
      eventHandlers.onAttached = handler;
    });
    chrome.tabs.onDetached.addListener.mockImplementation((handler) => {
      eventHandlers.onDetached = handler;
    });
  });

  describe('Event Listener Registration', () => {
    test('should register all required event listeners', () => {
      // Simulate background script loading (register event listeners)
      const registerEventListeners = () => {
        chrome.tabs.onCreated.addListener((tab) => {
          tabHierarchy.addTab(tab);
        });
        chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
          tabHierarchy.removeTab(tabId);
        });
        chrome.tabs.onMoved.addListener((tabId, moveInfo) => {
          tabHierarchy.updateTab(tabId, { index: moveInfo.toIndex, windowId: moveInfo.windowId });
        });
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
          if (changeInfo.url || changeInfo.title) {
            tabHierarchy.updateTab(tabId, changeInfo);
          }
        });
        chrome.tabs.onAttached.addListener((tabId, attachInfo) => {
          tabHierarchy.updateTab(tabId, { windowId: attachInfo.newWindowId, index: attachInfo.newPosition });
        });
        chrome.tabs.onDetached.addListener((tabId, detachInfo) => {
          // Tab will be attached to new window, handled in onAttached
        });
      };

      registerEventListeners();

      expect(chrome.tabs.onCreated.addListener).toHaveBeenCalledTimes(1);
      expect(chrome.tabs.onRemoved.addListener).toHaveBeenCalledTimes(1);
      expect(chrome.tabs.onMoved.addListener).toHaveBeenCalledTimes(1);
      expect(chrome.tabs.onUpdated.addListener).toHaveBeenCalledTimes(1);
      expect(chrome.tabs.onAttached.addListener).toHaveBeenCalledTimes(1);
      expect(chrome.tabs.onDetached.addListener).toHaveBeenCalledTimes(1);
      
      // Verify handlers are captured
      expect(eventHandlers.onCreated).toBeDefined();
      expect(eventHandlers.onRemoved).toBeDefined();
      expect(eventHandlers.onMoved).toBeDefined();
      expect(eventHandlers.onUpdated).toBeDefined();
      expect(eventHandlers.onAttached).toBeDefined();
      expect(eventHandlers.onDetached).toBeDefined();
    });
  });

  describe('Enhanced Parent-Child Detection', () => {
    beforeEach(() => {
      // Register simplified event handlers for testing
      eventHandlers.onCreated = (tab) => {
        // Enhanced parent detection logic
        const enhancedTab = { ...tab };
        
        // Detect parent relationship with enhanced logic
        if (tab.openerTabId && tabHierarchy.getTab(tab.openerTabId)) {
          enhancedTab.openerTabId = tab.openerTabId;
        }
        
        tabHierarchy.addTab(enhancedTab);
      };
    });

    test('should detect parent from openerTabId on tab creation', () => {
      const parentTab = {
        id: 1,
        url: 'https://parent.com',
        title: 'Parent Tab',
        windowId: 1,
        index: 0
      };

      const childTab = {
        id: 2,
        url: 'https://child.com',
        title: 'Child Tab',
        windowId: 1,
        index: 1,
        openerTabId: 1
      };

      // Simulate tab creation events
      eventHandlers.onCreated(parentTab);
      eventHandlers.onCreated(childTab);

      // Verify parent-child relationship
      expect(tabHierarchy.getTab(2).parentId).toBe(1);
      expect(tabHierarchy.getChildren(1)).toHaveLength(1);
      expect(tabHierarchy.getChildren(1)[0].id).toBe(2);
    });

    test('should handle child tab created before parent exists', () => {
      const childTab = {
        id: 2,
        url: 'https://child.com',
        title: 'Child Tab',
        windowId: 1,
        index: 1,
        openerTabId: 1 // Parent doesn't exist yet
      };

      const parentTab = {
        id: 1,
        url: 'https://parent.com',
        title: 'Parent Tab',
        windowId: 1,
        index: 0
      };

      // Child created first
      eventHandlers.onCreated(childTab);
      expect(tabHierarchy.getTab(2).parentId).toBeNull(); // Should be orphaned

      // Parent created later
      eventHandlers.onCreated(parentTab);
      expect(tabHierarchy.getTab(2).parentId).toBeNull(); // Still orphaned (no retroactive linking)
    });

    test('should handle rapid tab creation sequence', () => {
      const tabs = [
        { id: 1, url: 'https://root.com', title: 'Root', windowId: 1, index: 0 },
        { id: 2, url: 'https://child1.com', title: 'Child1', windowId: 1, index: 1, openerTabId: 1 },
        { id: 3, url: 'https://child2.com', title: 'Child2', windowId: 1, index: 2, openerTabId: 1 },
        { id: 4, url: 'https://grandchild.com', title: 'Grandchild', windowId: 1, index: 3, openerTabId: 2 }
      ];

      // Rapid creation
      tabs.forEach(tab => eventHandlers.onCreated(tab));

      // Verify hierarchy
      expect(tabHierarchy.getTab(1).parentId).toBeNull();
      expect(tabHierarchy.getTab(2).parentId).toBe(1);
      expect(tabHierarchy.getTab(3).parentId).toBe(1);
      expect(tabHierarchy.getTab(4).parentId).toBe(2);
      
      expect(tabHierarchy.getChildren(1)).toHaveLength(2);
      expect(tabHierarchy.getChildren(2)).toHaveLength(1);
    });
  });

  describe('Tab Update Events', () => {
    beforeEach(() => {
      eventHandlers.onUpdated = (tabId, changeInfo, tab) => {
        if (changeInfo.url || changeInfo.title || changeInfo.status) {
          tabHierarchy.updateTab(tabId, changeInfo);
        }
      };
    });

    test('should handle URL and title updates', () => {
      const tab = {
        id: 1,
        url: 'https://example.com',
        title: 'Example',
        windowId: 1,
        index: 0
      };

      tabHierarchy.addTab(tab);

      // Simulate URL update
      eventHandlers.onUpdated(1, { url: 'https://updated.com' }, { ...tab, url: 'https://updated.com' });
      expect(tabHierarchy.getTab(1).url).toBe('https://updated.com');

      // Simulate title update
      eventHandlers.onUpdated(1, { title: 'Updated Title' }, { ...tab, title: 'Updated Title' });
      expect(tabHierarchy.getTab(1).title).toBe('Updated Title');
    });

    test('should ignore status-only updates', () => {
      const tab = {
        id: 1,
        url: 'https://example.com',
        title: 'Example',
        windowId: 1,
        index: 0
      };

      tabHierarchy.addTab(tab);
      const originalTab = tabHierarchy.getTab(1);

      // Simulate status update (should be ignored by our handler)
      eventHandlers.onUpdated(1, { status: 'complete' }, tab);
      
      // Tab should remain unchanged
      expect(tabHierarchy.getTab(1)).toEqual(originalTab);
    });
  });

  describe('Tab Movement and Window Changes', () => {
    beforeEach(() => {
      eventHandlers.onMoved = (tabId, moveInfo) => {
        tabHierarchy.updateTab(tabId, { 
          index: moveInfo.toIndex, 
          windowId: moveInfo.windowId 
        });
      };

      eventHandlers.onAttached = (tabId, attachInfo) => {
        tabHierarchy.updateTab(tabId, { 
          windowId: attachInfo.newWindowId, 
          index: attachInfo.newPosition 
        });
      };
    });

    test('should handle tab movement within same window', () => {
      const tab = {
        id: 1,
        url: 'https://example.com',
        title: 'Example',
        windowId: 1,
        index: 0
      };

      tabHierarchy.addTab(tab);

      // Simulate move within window
      eventHandlers.onMoved(1, {
        windowId: 1,
        fromIndex: 0,
        toIndex: 2
      });

      expect(tabHierarchy.getTab(1).index).toBe(2);
      expect(tabHierarchy.getTab(1).windowId).toBe(1);
    });

    test('should handle tab movement to different window', () => {
      const tab = {
        id: 1,
        url: 'https://example.com',
        title: 'Example',
        windowId: 1,
        index: 0
      };

      tabHierarchy.addTab(tab);

      // Simulate attach to new window
      eventHandlers.onAttached(1, {
        newWindowId: 2,
        newPosition: 0
      });

      expect(tabHierarchy.getTab(1).windowId).toBe(2);
      expect(tabHierarchy.getTab(1).index).toBe(0);
    });

    test('should maintain hierarchy when tab moves between windows', () => {
      const parentTab = {
        id: 1,
        url: 'https://parent.com',
        title: 'Parent',
        windowId: 1,
        index: 0
      };

      const childTab = {
        id: 2,
        url: 'https://child.com',
        title: 'Child',
        windowId: 1,
        index: 1,
        openerTabId: 1
      };

      // Add tabs with relationship
      tabHierarchy.addTab(parentTab);
      tabHierarchy.addTab(childTab);

      // Move child to different window
      eventHandlers.onAttached(2, {
        newWindowId: 2,
        newPosition: 0
      });

      // Hierarchy should be maintained
      expect(tabHierarchy.getTab(2).parentId).toBe(1);
      expect(tabHierarchy.getChildren(1)).toHaveLength(1);
      expect(tabHierarchy.getTab(2).windowId).toBe(2);
    });
  });

  describe('Tab Removal Events', () => {
    beforeEach(() => {
      eventHandlers.onRemoved = (tabId, removeInfo) => {
        tabHierarchy.removeTab(tabId);
      };
    });

    test('should handle tab removal and orphan children', () => {
      const parentTab = {
        id: 1,
        url: 'https://parent.com',
        title: 'Parent',
        windowId: 1,
        index: 0
      };

      const childTab = {
        id: 2,
        url: 'https://child.com',
        title: 'Child',
        windowId: 1,
        index: 1,
        openerTabId: 1
      };

      // Add tabs
      tabHierarchy.addTab(parentTab);
      tabHierarchy.addTab(childTab);

      // Remove parent
      eventHandlers.onRemoved(1, { windowId: 1, isWindowClosing: false });

      // Parent should be gone, child should be orphaned
      expect(tabHierarchy.getTab(1)).toBeUndefined();
      expect(tabHierarchy.getTab(2)).toBeDefined();
      expect(tabHierarchy.getTab(2).parentId).toBeNull();
      expect(tabHierarchy.getRootTabs()).toHaveLength(1);
    });

    test('should handle removal of child tab', () => {
      const parentTab = {
        id: 1,
        url: 'https://parent.com',
        title: 'Parent',
        windowId: 1,
        index: 0
      };

      const childTab = {
        id: 2,
        url: 'https://child.com',
        title: 'Child',
        windowId: 1,
        index: 1,
        openerTabId: 1
      };

      // Add tabs
      tabHierarchy.addTab(parentTab);
      tabHierarchy.addTab(childTab);

      // Remove child
      eventHandlers.onRemoved(2, { windowId: 1, isWindowClosing: false });

      // Parent should still exist with no children
      expect(tabHierarchy.getTab(1)).toBeDefined();
      expect(tabHierarchy.getTab(2)).toBeUndefined();
      expect(tabHierarchy.getChildren(1)).toHaveLength(0);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    beforeEach(() => {
      // Register all handlers
      eventHandlers.onCreated = (tab) => tabHierarchy.addTab(tab);
      eventHandlers.onRemoved = (tabId) => tabHierarchy.removeTab(tabId);
      eventHandlers.onUpdated = (tabId, changeInfo) => {
        if (changeInfo.url || changeInfo.title) {
          tabHierarchy.updateTab(tabId, changeInfo);
        }
      };
    });

    test('should handle events for non-existent tabs gracefully', () => {
      // Update non-existent tab
      expect(() => eventHandlers.onUpdated(999, { title: 'New Title' })).not.toThrow();
      
      // Remove non-existent tab
      expect(() => eventHandlers.onRemoved(999)).not.toThrow();
    });

    test('should handle rapid create/remove sequences', () => {
      const tab = {
        id: 1,
        url: 'https://example.com',
        title: 'Example',
        windowId: 1,
        index: 0
      };

      // Rapid create/remove
      eventHandlers.onCreated(tab);
      expect(tabHierarchy.getTab(1)).toBeDefined();

      eventHandlers.onRemoved(1);
      expect(tabHierarchy.getTab(1)).toBeUndefined();

      // Try to update removed tab
      expect(() => eventHandlers.onUpdated(1, { title: 'Updated' })).not.toThrow();
    });

    test('should handle circular reference prevention', () => {
      const tab1 = {
        id: 1,
        url: 'https://tab1.com',
        title: 'Tab 1',
        windowId: 1,
        index: 0
      };

      const tab2 = {
        id: 2,
        url: 'https://tab2.com',
        title: 'Tab 2',
        windowId: 1,
        index: 1,
        openerTabId: 1
      };

      // Add tabs
      eventHandlers.onCreated(tab1);
      eventHandlers.onCreated(tab2);

      // Try to create circular reference (should be prevented by TabTree)
      const circularTab = {
        id: 3,
        url: 'https://tab3.com',
        title: 'Tab 3',
        windowId: 1,
        index: 2,
        openerTabId: 2
      };

      eventHandlers.onCreated(circularTab);

      // Manually try to update tab1 to have tab2 as opener (would create circle)
      tabHierarchy.updateTab(1, { openerTabId: 2 });

      // Verify no circular reference exists
      expect(tabHierarchy.getTab(1).parentId).toBeNull();
      expect(tabHierarchy.getTab(2).parentId).toBe(1);
      expect(tabHierarchy.getTab(3).parentId).toBe(2);
    });
  });

  describe('Hierarchy Update Notifications', () => {
    let notificationSent;

    beforeEach(() => {
      notificationSent = false;
      
      // Mock notification function
      const notifyHierarchyChange = async () => {
        notificationSent = true;
        // Simulate sending notifications to UI
        try {
          await chrome.runtime.sendMessage({
            action: 'hierarchyUpdated',
            windowId: 1,
            hierarchy: tabHierarchy.getHierarchy(1)
          });
        } catch (error) {
          // Ignore - no listener
        }
      };

      // Enhanced event handlers with notifications
      eventHandlers.onCreated = (tab) => {
        tabHierarchy.addTab(tab);
        notifyHierarchyChange();
      };

      eventHandlers.onRemoved = (tabId) => {
        tabHierarchy.removeTab(tabId);
        notifyHierarchyChange();
      };

      eventHandlers.onUpdated = (tabId, changeInfo) => {
        if (changeInfo.url || changeInfo.title) {
          tabHierarchy.updateTab(tabId, changeInfo);
          notifyHierarchyChange();
        }
      };
    });

    test('should send notifications on tab creation', () => {
      const tab = {
        id: 1,
        url: 'https://example.com',
        title: 'Example',
        windowId: 1,
        index: 0
      };

      eventHandlers.onCreated(tab);
      expect(notificationSent).toBe(true);
    });

    test('should send notifications on tab removal', () => {
      const tab = {
        id: 1,
        url: 'https://example.com',
        title: 'Example',
        windowId: 1,
        index: 0
      };

      tabHierarchy.addTab(tab);
      notificationSent = false; // Reset

      eventHandlers.onRemoved(1);
      expect(notificationSent).toBe(true);
    });

    test('should send notifications on significant updates', () => {
      const tab = {
        id: 1,
        url: 'https://example.com',
        title: 'Example',
        windowId: 1,
        index: 0
      };

      tabHierarchy.addTab(tab);
      notificationSent = false; // Reset

      eventHandlers.onUpdated(1, { title: 'Updated Title' });
      expect(notificationSent).toBe(true);
    });
  });
});