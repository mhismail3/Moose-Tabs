/**
 * Test for Drag Hierarchy Down Bug
 * Tests the specific issue where dragging parent tabs with children down in the list
 * doesn't maintain the hierarchy correctly
 */

import { useDragDrop } from '../src/components/hooks/useDragDrop';
import { renderHook } from '@testing-library/react';

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

describe('Drag Hierarchy Down Bug', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('dragging parent tab down maintains hierarchy', async () => {
    // Setup: Parent tab (id: 1) at index 0 with children (id: 2, 3) at indices 1, 2
    // Target: Move after tab (id: 4) at index 3
    // Expected result: Parent at 4, Child1 at 5, Child2 at 6
    
    const mockTab = { id: 1, title: 'Parent', children: [] };
    
    // Mock the current state of tabs in browser
    chrome.tabs.get.mockImplementation((tabId) => {
      const tabs = {
        1: { id: 1, index: 0, windowId: 1 }, // Parent
        2: { id: 2, index: 1, windowId: 1 }, // Child 1  
        3: { id: 3, index: 2, windowId: 1 }, // Child 2
        4: { id: 4, index: 3, windowId: 1 }  // Target
      };
      return Promise.resolve(tabs[tabId]);
    });

    chrome.tabs.query.mockResolvedValue([
      { id: 1, index: 0, windowId: 1 },
      { id: 2, index: 1, windowId: 1 },
      { id: 3, index: 2, windowId: 1 },
      { id: 4, index: 3, windowId: 1 }
    ]);

    // Mock hierarchy response showing parent-child relationship
    chrome.runtime.sendMessage.mockResolvedValue({
      success: true,
      hierarchy: [
        {
          id: 1,
          title: 'Parent',
          children: [
            { id: 2, title: 'Child 1', children: [] },
            { id: 3, title: 'Child 2', children: [] }
          ]
        },
        { id: 4, title: 'Target', children: [] }
      ]
    });

    const { result } = renderHook(() => useDragDrop(mockTab, false));
    
    // Simulate dragging tab 1 (parent) to after tab 4 (target)
    await result.current.handleTabMove(1, { id: 4, windowId: 1 }, 'after');

    // Verify chrome.tabs.move was called correctly for all tabs
    expect(chrome.tabs.move).toHaveBeenCalledTimes(3);
    
    // Check that moves happen in the correct order and with correct indices
    const moveCalls = chrome.tabs.move.mock.calls;
    
    // After target (index 3), accounting for removed tabs: target(3) - draggedCount(3) + 1 = 1
    // Tabs are moved in reverse order (children first, then parent) to avoid index shifting
    // So the moves are: child2->3, child1->2, parent->1
    expect(moveCalls[0]).toEqual([3, { index: 3, windowId: 1 }]); // Child 2 (moved first)
    expect(moveCalls[1]).toEqual([2, { index: 2, windowId: 1 }]); // Child 1 (moved second)
    expect(moveCalls[2]).toEqual([1, { index: 1, windowId: 1 }]); // Parent (moved last)
  });

  test('dragging parent tab up maintains hierarchy', async () => {
    // Setup: Parent tab (id: 1) at index 2 with children (id: 2, 3) at indices 3, 4
    // Target: Move before tab (id: 4) at index 0
    // Expected result: Parent at 1, Child1 at 2, Child2 at 3 (after target at 0)
    
    const mockTab = { id: 1, title: 'Parent', children: [] };
    
    chrome.tabs.get.mockImplementation((tabId) => {
      const tabs = {
        1: { id: 1, index: 2, windowId: 1 }, // Parent
        2: { id: 2, index: 3, windowId: 1 }, // Child 1  
        3: { id: 3, index: 4, windowId: 1 }, // Child 2
        4: { id: 4, index: 0, windowId: 1 }  // Target
      };
      return Promise.resolve(tabs[tabId]);
    });

    chrome.tabs.query.mockResolvedValue([
      { id: 4, index: 0, windowId: 1 },
      { id: 5, index: 1, windowId: 1 }, // Another tab
      { id: 1, index: 2, windowId: 1 },
      { id: 2, index: 3, windowId: 1 },
      { id: 3, index: 4, windowId: 1 }
    ]);

    chrome.runtime.sendMessage.mockResolvedValue({
      success: true,
      hierarchy: [
        { id: 4, title: 'Target', children: [] },
        { id: 5, title: 'Other', children: [] },
        {
          id: 1,
          title: 'Parent',
          children: [
            { id: 2, title: 'Child 1', children: [] },
            { id: 3, title: 'Child 2', children: [] }
          ]
        }
      ]
    });

    const { result } = renderHook(() => useDragDrop(mockTab, false));
    
    // Simulate dragging tab 1 (parent) to after tab 4 (target)
    await result.current.handleTabMove(1, { id: 4, windowId: 1 }, 'after');

    // Verify chrome.tabs.move was called correctly for all tabs
    expect(chrome.tabs.move).toHaveBeenCalledTimes(3);
    
    const moveCalls = chrome.tabs.move.mock.calls;
    
    // After target (index 0), should place parent, child1, child2 at indices 1, 2, 3
    expect(moveCalls[0]).toEqual([1, { index: 1, windowId: 1 }]); // Parent
    expect(moveCalls[1]).toEqual([2, { index: 2, windowId: 1 }]); // Child 1
    expect(moveCalls[2]).toEqual([3, { index: 3, windowId: 1 }]); // Child 2
  });
});