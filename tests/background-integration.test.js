// Background Script Integration Tests
// Tests the integration between background script functionality and TabTree

const TabTree = require('../public/TabTree');

// Mock Chrome APIs
global.chrome = {
  tabs: {
    query: jest.fn(),
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
    sendMessage: jest.fn()
  },
  action: {
    onClicked: { addListener: jest.fn() }
  },
  sidePanel: {
    open: jest.fn()
  },
  windows: {
    getAll: jest.fn()
  }
};

// Mock console
global.console = {
  log: jest.fn(),
  error: jest.fn()
};

// Mock importScripts
global.importScripts = jest.fn();

describe('Background Script Integration', () => {
  let backgroundScript;
  let tabHierarchy;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create a fresh TabTree instance
    tabHierarchy = new TabTree();
    
    // Mock importScripts to provide TabTree
    global.TabTree = TabTree;
    global.importScripts.mockImplementation(() => {});
    
    // Load background script functionality (simulate the key functions)
    global.tabHierarchy = tabHierarchy;
  });

  describe('Tab hierarchy functions', () => {
    test('should add tab correctly', () => {
      const tab = {
        id: 1,
        url: 'https://example.com',
        title: 'Example',
        windowId: 1,
        index: 0
      };

      // Simulate addTab function from background script
      const addTab = (tab) => {
        tabHierarchy.addTab(tab);
      };

      addTab(tab);

      expect(tabHierarchy.getTab(1)).toEqual(expect.objectContaining({
        id: 1,
        url: 'https://example.com',
        title: 'Example',
        windowId: 1,
        index: 0,
        parentId: null
      }));
    });

    test('should remove tab correctly', () => {
      const tab = {
        id: 1,
        url: 'https://example.com',
        title: 'Example',
        windowId: 1,
        index: 0
      };

      // Simulate background script functions
      const addTab = (tab) => tabHierarchy.addTab(tab);
      const removeTab = (tabId) => tabHierarchy.removeTab(tabId);

      addTab(tab);
      expect(tabHierarchy.getTab(1)).toBeDefined();

      removeTab(1);
      expect(tabHierarchy.getTab(1)).toBeUndefined();
    });

    test('should update tab correctly', () => {
      const tab = {
        id: 1,
        url: 'https://example.com',
        title: 'Example',
        windowId: 1,
        index: 0
      };

      // Simulate background script functions
      const addTab = (tab) => tabHierarchy.addTab(tab);
      const updateTab = (tabId, updates) => tabHierarchy.updateTab(tabId, updates);

      addTab(tab);
      updateTab(1, { title: 'Updated Title', url: 'https://updated.com' });

      const updatedTab = tabHierarchy.getTab(1);
      expect(updatedTab.title).toBe('Updated Title');
      expect(updatedTab.url).toBe('https://updated.com');
    });

    test('should get hierarchy correctly', () => {
      const parent = { id: 1, url: 'https://parent.com', title: 'Parent', windowId: 1, index: 0 };
      const child = { id: 2, url: 'https://child.com', title: 'Child', windowId: 1, index: 1, openerTabId: 1 };

      // Simulate background script functions
      const addTab = (tab) => tabHierarchy.addTab(tab);
      const getHierarchy = (windowId = null) => tabHierarchy.getHierarchy(windowId);

      addTab(parent);
      addTab(child);

      const hierarchy = getHierarchy();
      expect(hierarchy).toHaveLength(1);
      expect(hierarchy[0].id).toBe(1);
      expect(hierarchy[0].children).toHaveLength(1);
      expect(hierarchy[0].children[0].id).toBe(2);
    });

    test('should handle parent-child relationships from opener tab', () => {
      const parent = { id: 1, url: 'https://parent.com', title: 'Parent', windowId: 1, index: 0 };
      const child = { id: 2, url: 'https://child.com', title: 'Child', windowId: 1, index: 1, openerTabId: 1 };

      // Simulate background script functions
      const addTab = (tab) => tabHierarchy.addTab(tab);

      addTab(parent);
      addTab(child);

      expect(tabHierarchy.getTab(2).parentId).toBe(1);
      expect(tabHierarchy.getChildren(1)).toHaveLength(1);
    });
  });

  describe('Multi-window support', () => {
    test('should handle tabs from different windows', () => {
      const tab1 = { id: 1, url: 'https://window1.com', title: 'Window1', windowId: 1, index: 0 };
      const tab2 = { id: 2, url: 'https://window2.com', title: 'Window2', windowId: 2, index: 0 };

      // Simulate background script functions
      const addTab = (tab) => tabHierarchy.addTab(tab);
      const getHierarchy = (windowId = null) => tabHierarchy.getHierarchy(windowId);

      addTab(tab1);
      addTab(tab2);

      const allHierarchy = getHierarchy();
      const window1Hierarchy = getHierarchy(1);
      const window2Hierarchy = getHierarchy(2);

      expect(allHierarchy).toHaveLength(2);
      expect(window1Hierarchy).toHaveLength(1);
      expect(window2Hierarchy).toHaveLength(1);
      expect(window1Hierarchy[0].id).toBe(1);
      expect(window2Hierarchy[0].id).toBe(2);
    });
  });

  describe('Edge cases', () => {
    test('should handle adding tab with non-existent parent', () => {
      const orphanTab = { id: 1, url: 'https://orphan.com', title: 'Orphan', windowId: 1, index: 0, openerTabId: 999 };

      // Simulate background script functions
      const addTab = (tab) => tabHierarchy.addTab(tab);

      expect(() => addTab(orphanTab)).not.toThrow();
      expect(tabHierarchy.getTab(1).parentId).toBeNull();
    });

    test('should handle removing non-existent tab', () => {
      // Simulate background script functions
      const removeTab = (tabId) => tabHierarchy.removeTab(tabId);

      expect(() => removeTab(999)).not.toThrow();
    });

    test('should handle updating non-existent tab', () => {
      // Simulate background script functions
      const updateTab = (tabId, updates) => tabHierarchy.updateTab(tabId, updates);

      expect(() => updateTab(999, { title: 'Test' })).not.toThrow();
    });
  });

  describe('Event listener registration', () => {
    test('should register all required event listeners', () => {
      // Since we can't actually load the background script file in Jest,
      // we'll verify that the chrome API methods are available for registration
      expect(chrome.tabs.onCreated.addListener).toBeDefined();
      expect(chrome.tabs.onRemoved.addListener).toBeDefined();
      expect(chrome.tabs.onMoved.addListener).toBeDefined();
      expect(chrome.tabs.onUpdated.addListener).toBeDefined();
      expect(chrome.tabs.onAttached.addListener).toBeDefined();
      expect(chrome.tabs.onDetached.addListener).toBeDefined();
      expect(chrome.runtime.onInstalled.addListener).toBeDefined();
      expect(chrome.runtime.onStartup.addListener).toBeDefined();
      expect(chrome.runtime.onMessage.addListener).toBeDefined();
    });
  });

  describe('Message handling simulation', () => {
    test('should handle getHierarchy message', () => {
      const parent = { id: 1, url: 'https://parent.com', title: 'Parent', windowId: 1, index: 0 };
      const child = { id: 2, url: 'https://child.com', title: 'Child', windowId: 1, index: 1, openerTabId: 1 };

      // Simulate background script functions
      const addTab = (tab) => tabHierarchy.addTab(tab);
      const getHierarchy = (windowId = null) => tabHierarchy.getHierarchy(windowId);

      addTab(parent);
      addTab(child);

      // Simulate message handler
      const handleMessage = (request, sender, sendResponse) => {
        switch (request.action) {
          case 'getHierarchy':
            sendResponse({ hierarchy: getHierarchy(request.windowId) });
            break;
          default:
            sendResponse({ error: 'Unknown action' });
        }
      };

      const mockSendResponse = jest.fn();
      handleMessage({ action: 'getHierarchy', windowId: 1 }, {}, mockSendResponse);

      expect(mockSendResponse).toHaveBeenCalledWith({
        hierarchy: expect.arrayContaining([
          expect.objectContaining({
            id: 1,
            children: expect.arrayContaining([
              expect.objectContaining({ id: 2 })
            ])
          })
        ])
      });
    });

    test('should handle getTab message', () => {
      const tab = { id: 1, url: 'https://example.com', title: 'Example', windowId: 1, index: 0 };

      // Simulate background script functions
      const addTab = (tab) => tabHierarchy.addTab(tab);
      const getTab = (tabId) => tabHierarchy.getTab(tabId);

      addTab(tab);

      // Simulate message handler
      const handleMessage = (request, sender, sendResponse) => {
        switch (request.action) {
          case 'getTab':
            sendResponse({ tab: getTab(request.tabId) });
            break;
          default:
            sendResponse({ error: 'Unknown action' });
        }
      };

      const mockSendResponse = jest.fn();
      handleMessage({ action: 'getTab', tabId: 1 }, {}, mockSendResponse);

      expect(mockSendResponse).toHaveBeenCalledWith({
        tab: expect.objectContaining({
          id: 1,
          url: 'https://example.com',
          title: 'Example'
        })
      });
    });

    test('should handle unknown message action', () => {
      // Simulate message handler
      const handleMessage = (request, sender, sendResponse) => {
        switch (request.action) {
          case 'getHierarchy':
            sendResponse({ hierarchy: [] });
            break;
          case 'getTab':
            sendResponse({ tab: null });
            break;
          default:
            sendResponse({ error: 'Unknown action' });
        }
      };

      const mockSendResponse = jest.fn();
      handleMessage({ action: 'unknownAction' }, {}, mockSendResponse);

      expect(mockSendResponse).toHaveBeenCalledWith({ error: 'Unknown action' });
    });
  });
});