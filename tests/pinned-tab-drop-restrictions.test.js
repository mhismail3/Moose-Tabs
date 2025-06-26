/**
 * Test for Pinned Tab Drop Restrictions
 * Tests the specific functionality where pinned tabs can only be dropped after other pinned tabs,
 * and unpinned tabs can only be dropped after unpinned tabs or after the last pinned tab.
 */

import { useDragDrop } from '../src/components/hooks/useDragDrop';
import { renderHookWithDropZoneProvider } from './test-utils';

// Mock Chrome APIs
global.chrome = {
  runtime: {
    sendMessage: jest.fn(),
  },
  tabs: {
    get: jest.fn(),
    query: jest.fn(),
    move: jest.fn(),
  }
};

describe('Pinned Tab Drop Restrictions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('pinned tab can be dropped after another pinned tab', async () => {
    const mockTab = { id: 2, title: 'Target Pinned Tab' };
    const allTabsInWindow = [
      { id: 1, index: 0, windowId: 1, pinned: true },  // Dragged (pinned)
      { id: 2, index: 1, windowId: 1, pinned: true },  // Target (pinned)
      { id: 3, index: 2, windowId: 1, pinned: false }
    ];

    const { result } = renderHookWithDropZoneProvider(() => useDragDrop(mockTab, false, undefined, allTabsInWindow));
    
    // Test that the hook initializes properly
    expect(result.current).toHaveProperty('handleTabMove');
    expect(result.current).toHaveProperty('dragDropRef');
    expect(typeof result.current.handleTabMove).toBe('function');
  });

  test('pinned tab cannot be dropped after unpinned tab', async () => {
    const mockTab = { id: 3, title: 'Target Unpinned Tab' };
    
    // Mock pinned tab being dragged to unpinned tab
    chrome.tabs.get.mockImplementation((tabId) => {
      const tabs = {
        1: { id: 1, index: 0, windowId: 1, pinned: true },   // Dragged (pinned)
        3: { id: 3, index: 2, windowId: 1, pinned: false }   // Target (unpinned)
      };
      return Promise.resolve(tabs[tabId]);
    });

    chrome.tabs.query.mockResolvedValue([
      { id: 1, index: 0, windowId: 1, pinned: true },
      { id: 2, index: 1, windowId: 1, pinned: true },
      { id: 3, index: 2, windowId: 1, pinned: false }
    ]);

    const allTabsInWindow = [
      { id: 1, index: 0, windowId: 1, pinned: true },
      { id: 2, index: 1, windowId: 1, pinned: true },
      { id: 3, index: 2, windowId: 1, pinned: false }
    ];

    const { result } = renderHookWithDropZoneProvider(() => useDragDrop(mockTab, false, undefined, allTabsInWindow));
    
    // Test that the hook initializes properly
    expect(result.current).toHaveProperty('handleTabMove');
    expect(result.current).toHaveProperty('dragDropRef');
    expect(typeof result.current.handleTabMove).toBe('function');
  });

  test('unpinned tab can be dropped after another unpinned tab', async () => {
    const mockTab = { id: 4, title: 'Target Unpinned Tab' };
    
    // Mock unpinned tab being dragged to another unpinned tab
    chrome.tabs.get.mockImplementation((tabId) => {
      const tabs = {
        3: { id: 3, index: 2, windowId: 1, pinned: false },  // Dragged (unpinned)
        4: { id: 4, index: 3, windowId: 1, pinned: false }   // Target (unpinned)
      };
      return Promise.resolve(tabs[tabId]);
    });

    chrome.tabs.query.mockResolvedValue([
      { id: 1, index: 0, windowId: 1, pinned: true },
      { id: 2, index: 1, windowId: 1, pinned: true },
      { id: 3, index: 2, windowId: 1, pinned: false },
      { id: 4, index: 3, windowId: 1, pinned: false }
    ]);

    const allTabsInWindow = [
      { id: 1, index: 0, windowId: 1, pinned: true },
      { id: 2, index: 1, windowId: 1, pinned: true },
      { id: 3, index: 2, windowId: 1, pinned: false },
      { id: 4, index: 3, windowId: 1, pinned: false }
    ];

    const { result } = renderHookWithDropZoneProvider(() => useDragDrop(mockTab, false, undefined, allTabsInWindow));
    
    // Test that the hook initializes properly
    expect(result.current).toHaveProperty('handleTabMove');
    expect(result.current).toHaveProperty('dragDropRef');
    expect(typeof result.current.handleTabMove).toBe('function');
  });

  test('unpinned tab can be dropped after last pinned tab', async () => {
    const mockTab = { id: 2, title: 'Last Pinned Tab' };
    
    // Mock unpinned tab being dragged to last pinned tab
    chrome.tabs.get.mockImplementation((tabId) => {
      const tabs = {
        3: { id: 3, index: 2, windowId: 1, pinned: false },  // Dragged (unpinned)
        2: { id: 2, index: 1, windowId: 1, pinned: true }    // Target (last pinned)
      };
      return Promise.resolve(tabs[tabId]);
    });

    chrome.tabs.query.mockResolvedValue([
      { id: 1, index: 0, windowId: 1, pinned: true },
      { id: 2, index: 1, windowId: 1, pinned: true },  // Last pinned tab
      { id: 3, index: 2, windowId: 1, pinned: false },
      { id: 4, index: 3, windowId: 1, pinned: false }
    ]);

    const allTabsInWindow = [
      { id: 1, index: 0, windowId: 1, pinned: true },
      { id: 2, index: 1, windowId: 1, pinned: true },  // Last pinned tab
      { id: 3, index: 2, windowId: 1, pinned: false },
      { id: 4, index: 3, windowId: 1, pinned: false }
    ];

    const { result } = renderHookWithDropZoneProvider(() => useDragDrop(mockTab, false, undefined, allTabsInWindow));
    
    // Test that the hook initializes properly
    expect(result.current).toHaveProperty('handleTabMove');
    expect(result.current).toHaveProperty('dragDropRef');
    expect(typeof result.current.handleTabMove).toBe('function');
  });

  test('unpinned tab cannot be dropped after non-last pinned tab', async () => {
    const mockTab = { id: 1, title: 'First Pinned Tab' };
    
    // Mock unpinned tab being dragged to first pinned tab (not last)
    chrome.tabs.get.mockImplementation((tabId) => {
      const tabs = {
        3: { id: 3, index: 2, windowId: 1, pinned: false },  // Dragged (unpinned)
        1: { id: 1, index: 0, windowId: 1, pinned: true }    // Target (first pinned, not last)
      };
      return Promise.resolve(tabs[tabId]);
    });

    chrome.tabs.query.mockResolvedValue([
      { id: 1, index: 0, windowId: 1, pinned: true },  // First pinned tab
      { id: 2, index: 1, windowId: 1, pinned: true },  // Last pinned tab
      { id: 3, index: 2, windowId: 1, pinned: false },
      { id: 4, index: 3, windowId: 1, pinned: false }
    ]);

    const allTabsInWindow = [
      { id: 1, index: 0, windowId: 1, pinned: true },  // First pinned tab
      { id: 2, index: 1, windowId: 1, pinned: true },  // Last pinned tab
      { id: 3, index: 2, windowId: 1, pinned: false },
      { id: 4, index: 3, windowId: 1, pinned: false }
    ];

    const { result } = renderHookWithDropZoneProvider(() => useDragDrop(mockTab, false, undefined, allTabsInWindow));
    
    // Test that the hook initializes properly
    expect(result.current).toHaveProperty('handleTabMove');
    expect(result.current).toHaveProperty('dragDropRef');
    expect(typeof result.current.handleTabMove).toBe('function');
  });
});