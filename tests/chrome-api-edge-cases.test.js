// Chrome API Edge Cases Tests
// Tests for advanced Chrome API scenarios and edge cases

const TabTree = require('../public/TabTree');

// Enhanced Chrome API mocks for edge case testing
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

// Mock importScripts and setTimeout/clearTimeout for debouncing
global.importScripts = jest.fn();
global.setTimeout = jest.fn((fn, delay) => {
  fn(); // Execute immediately for tests
  return 1;
});
global.clearTimeout = jest.fn();

describe('Chrome API Edge Cases Tests', () => {
  let tabHierarchy;
  let enhancedHandlers;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create fresh TabTree instance
    tabHierarchy = new TabTree();
    global.TabTree = TabTree;
    global.tabHierarchy = tabHierarchy;

    // Create enhanced handlers that simulate the background script
    enhancedHandlers = {
      handleTabCreated: async (tab) => {
        try {
          // Validate tab data
          if (!tab || typeof tab.id !== 'number') {
            console.error('Invalid tab data received:', tab);
            return;
          }

          const enhancedTab = { ...tab };
          
          // Validate opener relationship
          if (tab.openerTabId) {
            const openerExists = tabHierarchy.getTab(tab.openerTabId);
            if (!openerExists) {
              enhancedTab.openerTabId = null;
            }
          }
          
          tabHierarchy.addTab(enhancedTab);
        } catch (error) {
          console.error('Error in handleTabCreated:', error);
        }
      },

      handleTabRemoved: async (tabId, removeInfo) => {
        try {
          if (typeof tabId !== 'number') {
            console.error('Invalid tabId for removal:', tabId);
            return;
          }
          tabHierarchy.removeTab(tabId);
        } catch (error) {
          console.error('Error in handleTabRemoved:', error);
        }
      },

      handleTabMoved: async (tabId, moveInfo) => {
        try {
          if (typeof tabId !== 'number' || !moveInfo) {
            console.error('Invalid parameters for tab move:', tabId, moveInfo);
            return;
          }
          tabHierarchy.updateTab(tabId, { 
            index: moveInfo.toIndex,
            windowId: moveInfo.windowId 
          });
        } catch (error) {
          console.error('Error in handleTabMoved:', error);
        }
      },

      handleTabUpdated: async (tabId, changeInfo, tab) => {
        try {
          if (typeof tabId !== 'number' || !changeInfo || !tab) {
            console.error('Invalid parameters for tab update:', tabId, changeInfo, tab);
            return;
          }

          const significantChanges = {};
          
          if (changeInfo.url) {
            significantChanges.url = changeInfo.url;
          }
          
          if (changeInfo.title) {
            significantChanges.title = changeInfo.title;
          }
          
          // Re-validate opener relationship on completion
          if (changeInfo.status === 'complete' && tab.openerTabId) {
            const openerExists = tabHierarchy.getTab(tab.openerTabId);
            if (openerExists && tabHierarchy.getTab(tabId).parentId !== tab.openerTabId) {
              significantChanges.openerTabId = tab.openerTabId;
            }
          }
          
          if (Object.keys(significantChanges).length > 0) {
            tabHierarchy.updateTab(tabId, significantChanges);
          }
        } catch (error) {
          console.error('Error in handleTabUpdated:', error);
        }
      },

      handleTabAttached: async (tabId, attachInfo) => {
        try {
          if (typeof tabId !== 'number' || !attachInfo) {
            console.error('Invalid parameters for tab attachment:', tabId, attachInfo);
            return;
          }
          tabHierarchy.updateTab(tabId, {
            windowId: attachInfo.newWindowId,
            index: attachInfo.newPosition
          });
        } catch (error) {
          console.error('Error in handleTabAttached:', error);
        }
      }
    };
  });

  describe('Complex Tab Creation Scenarios', () => {
    test('should handle duplicate tab creation events', async () => {
      const tab = {
        id: 1,
        url: 'https://example.com',
        title: 'Example',
        windowId: 1,
        index: 0
      };

      // Create same tab twice (Chrome API edge case)
      await enhancedHandlers.handleTabCreated(tab);
      expect(tabHierarchy.getTab(1)).toBeDefined();

      // Second creation should not crash or duplicate
      await enhancedHandlers.handleTabCreated(tab);
      expect(tabHierarchy.getRootTabs()).toHaveLength(1);
    });

    test('should handle tab creation with invalid opener ID', async () => {
      const tabWithBadOpener = {
        id: 1,
        url: 'https://example.com',
        title: 'Example',
        windowId: 1,
        index: 0,
        openerTabId: 999999 // Non-existent opener
      };

      await enhancedHandlers.handleTabCreated(tabWithBadOpener);
      
      // Should create as root tab (orphaned)
      expect(tabHierarchy.getTab(1)).toBeDefined();
      expect(tabHierarchy.getTab(1).parentId).toBeNull();
      expect(tabHierarchy.getRootTabs()).toHaveLength(1);
    });

    test('should handle rapid tab creation with complex hierarchy', async () => {
      const tabs = [
        { id: 1, url: 'https://root.com', title: 'Root', windowId: 1, index: 0 },
        { id: 2, url: 'https://child1.com', title: 'Child1', windowId: 1, index: 1, openerTabId: 1 },
        { id: 3, url: 'https://child2.com', title: 'Child2', windowId: 1, index: 2, openerTabId: 1 },
        { id: 4, url: 'https://grandchild1.com', title: 'GC1', windowId: 1, index: 3, openerTabId: 2 },
        { id: 5, url: 'https://grandchild2.com', title: 'GC2', windowId: 1, index: 4, openerTabId: 3 },
        { id: 6, url: 'https://greatgrand.com', title: 'GGC', windowId: 1, index: 5, openerTabId: 4 }
      ];

      // Create all tabs rapidly
      for (const tab of tabs) {
        await enhancedHandlers.handleTabCreated(tab);
      }

      // Verify deep hierarchy
      expect(tabHierarchy.getRootTabs()).toHaveLength(1);
      expect(tabHierarchy.getChildren(1)).toHaveLength(2); // 2 children
      expect(tabHierarchy.getChildren(2)).toHaveLength(1); // 1 grandchild
      expect(tabHierarchy.getChildren(3)).toHaveLength(1); // 1 grandchild
      expect(tabHierarchy.getChildren(4)).toHaveLength(1); // 1 great-grandchild
      expect(tabHierarchy.getTab(6).parentId).toBe(4);
    });
  });

  describe('Tab Update Edge Cases', () => {
    test('should handle simultaneous URL and title updates', async () => {
      const tab = {
        id: 1,
        url: 'https://example.com',
        title: 'Example',
        windowId: 1,
        index: 0
      };

      await enhancedHandlers.handleTabCreated(tab);

      // Simultaneous updates
      await enhancedHandlers.handleTabUpdated(1, { 
        url: 'https://updated.com',
        title: 'Updated Title',
        status: 'complete'
      }, { ...tab, url: 'https://updated.com', title: 'Updated Title' });

      const updatedTab = tabHierarchy.getTab(1);
      expect(updatedTab.url).toBe('https://updated.com');
      expect(updatedTab.title).toBe('Updated Title');
    });

    test('should handle tab update with delayed parent relationship', async () => {
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
        index: 1
      };

      // Create tabs without relationship
      await enhancedHandlers.handleTabCreated(parentTab);
      await enhancedHandlers.handleTabCreated(childTab);

      expect(tabHierarchy.getTab(2).parentId).toBeNull();

      // Simulate Chrome providing opener info on completion
      await enhancedHandlers.handleTabUpdated(2, { status: 'complete' }, {
        ...childTab,
        openerTabId: 1
      });

      // Should now establish parent relationship
      expect(tabHierarchy.getTab(2).parentId).toBe(1);
      expect(tabHierarchy.getChildren(1)).toHaveLength(1);
    });
  });

  describe('Window Management Edge Cases', () => {
    test('should handle tab moving between multiple windows', async () => {
      const tab = {
        id: 1,
        url: 'https://example.com',
        title: 'Example',
        windowId: 1,
        index: 0
      };

      await enhancedHandlers.handleTabCreated(tab);

      // Move to window 2
      await enhancedHandlers.handleTabAttached(1, {
        newWindowId: 2,
        newPosition: 0
      });

      expect(tabHierarchy.getTab(1).windowId).toBe(2);
      expect(tabHierarchy.getTab(1).index).toBe(0);

      // Move to window 3
      await enhancedHandlers.handleTabAttached(1, {
        newWindowId: 3,
        newPosition: 2
      });

      expect(tabHierarchy.getTab(1).windowId).toBe(3);
      expect(tabHierarchy.getTab(1).index).toBe(2);
    });

    test('should maintain parent-child relationships across window moves', async () => {
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

      await enhancedHandlers.handleTabCreated(parentTab);
      await enhancedHandlers.handleTabCreated(childTab);

      // Move child to different window
      await enhancedHandlers.handleTabAttached(2, {
        newWindowId: 2,
        newPosition: 0
      });

      // Relationship should be maintained
      expect(tabHierarchy.getTab(2).parentId).toBe(1);
      expect(tabHierarchy.getChildren(1)).toHaveLength(1);
      expect(tabHierarchy.getTab(2).windowId).toBe(2);
    });

    test('should handle complex window reorganization', async () => {
      // Create hierarchy in window 1
      const tabs = [
        { id: 1, url: 'https://root.com', title: 'Root', windowId: 1, index: 0 },
        { id: 2, url: 'https://child1.com', title: 'Child1', windowId: 1, index: 1, openerTabId: 1 },
        { id: 3, url: 'https://child2.com', title: 'Child2', windowId: 1, index: 2, openerTabId: 1 }
      ];

      for (const tab of tabs) {
        await enhancedHandlers.handleTabCreated(tab);
      }

      // Move tabs to different windows
      await enhancedHandlers.handleTabAttached(2, { newWindowId: 2, newPosition: 0 });
      await enhancedHandlers.handleTabAttached(3, { newWindowId: 3, newPosition: 0 });

      // Verify hierarchy integrity
      expect(tabHierarchy.getTab(1).windowId).toBe(1);
      expect(tabHierarchy.getTab(2).windowId).toBe(2);
      expect(tabHierarchy.getTab(3).windowId).toBe(3);
      expect(tabHierarchy.getChildren(1)).toHaveLength(2);
    });
  });

  describe('Stress Testing and Performance', () => {
    test('should handle bulk tab operations without errors', async () => {
      const tabCount = 100;
      
      // Create many tabs rapidly
      for (let i = 1; i <= tabCount; i++) {
        const tab = {
          id: i,
          url: `https://example${i}.com`,
          title: `Tab ${i}`,
          windowId: 1,
          index: i - 1,
          openerTabId: i > 1 ? Math.floor(Math.random() * (i - 1)) + 1 : undefined
        };

        await enhancedHandlers.handleTabCreated(tab);
      }

      // Verify all tabs were created
      expect(tabHierarchy.tabs.size).toBe(tabCount);

      // Random updates
      for (let i = 1; i <= 20; i++) {
        const randomTabId = Math.floor(Math.random() * tabCount) + 1;
        await enhancedHandlers.handleTabUpdated(randomTabId, {
          title: `Updated Tab ${randomTabId}`
        }, { id: randomTabId });
      }

      // Random removals
      const tabsToRemove = [1, 5, 10, 15, 20];
      for (const tabId of tabsToRemove) {
        await enhancedHandlers.handleTabRemoved(tabId, { isWindowClosing: false });
      }

      expect(tabHierarchy.tabs.size).toBe(tabCount - tabsToRemove.length);
    });

    test('should handle rapid create/remove cycles', async () => {
      const cycleCount = 50;

      for (let cycle = 0; cycle < cycleCount; cycle++) {
        const tab = {
          id: cycle + 1,
          url: `https://cycle${cycle}.com`,
          title: `Cycle ${cycle}`,
          windowId: 1,
          index: 0
        };

        // Create
        await enhancedHandlers.handleTabCreated(tab);
        expect(tabHierarchy.getTab(cycle + 1)).toBeDefined();

        // Update
        await enhancedHandlers.handleTabUpdated(cycle + 1, {
          title: `Updated Cycle ${cycle}`
        }, tab);

        // Remove
        await enhancedHandlers.handleTabRemoved(cycle + 1, { isWindowClosing: false });
        expect(tabHierarchy.getTab(cycle + 1)).toBeUndefined();
      }

      // Should end with empty hierarchy
      expect(tabHierarchy.tabs.size).toBe(0);
    });
  });

  describe('Error Recovery and Resilience', () => {
    test('should recover from corrupted tab data', async () => {
      // Create valid tab first
      const validTab = {
        id: 1,
        url: 'https://valid.com',
        title: 'Valid',
        windowId: 1,
        index: 0
      };

      await enhancedHandlers.handleTabCreated(validTab);

      // Try to create tab with invalid data
      const invalidTab = {
        id: null, // Invalid ID
        url: 'https://invalid.com',
        title: 'Invalid',
        windowId: 1,
        index: 1
      };

      // Invalid tab creation should be handled gracefully in background script
      await expect(enhancedHandlers.handleTabCreated(invalidTab)).resolves.not.toThrow();

      // Valid tab should still exist
      expect(tabHierarchy.getTab(1)).toBeDefined();
    });

    test('should handle operations on non-existent tabs gracefully', async () => {
      const nonExistentId = 999;

      // All operations should complete without throwing
      await expect(enhancedHandlers.handleTabRemoved(nonExistentId, {})).resolves.not.toThrow();
      await expect(enhancedHandlers.handleTabMoved(nonExistentId, { toIndex: 0, windowId: 1 })).resolves.not.toThrow();
      await expect(enhancedHandlers.handleTabUpdated(nonExistentId, { title: 'New' }, {})).resolves.not.toThrow();
      await expect(enhancedHandlers.handleTabAttached(nonExistentId, { newWindowId: 2, newPosition: 0 })).resolves.not.toThrow();
    });

    test('should handle malformed Chrome API events', async () => {
      // Malformed events should not crash the system
      const malformedEvents = [
        { handler: 'handleTabCreated', args: [undefined] },
        { handler: 'handleTabCreated', args: [null] },
        { handler: 'handleTabCreated', args: [{}] },
        { handler: 'handleTabRemoved', args: [undefined, {}] },
        { handler: 'handleTabUpdated', args: [1, undefined, {}] },
        { handler: 'handleTabMoved', args: [1, null] }
      ];

      for (const event of malformedEvents) {
        await expect(enhancedHandlers[event.handler](...event.args)).resolves.not.toThrow();
      }
    });
  });
});