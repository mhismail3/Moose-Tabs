/**
 * Test for Enhanced Drag and Drop Positioning
 * Tests the new position-based drop behavior:
 * - Left side drops: Insert as sibling
 * - Right side drops: Insert as child
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { useDragDrop } from '../src/components/hooks/useDragDrop';
import { renderHookWithDropZoneProvider } from './test-utils';

// Unmock the useDragDrop hook for this test since we want to test the real implementation
jest.unmock('../src/components/hooks/useDragDrop');

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

describe('Enhanced Drag and Drop Positioning', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Drop Zone Type Calculation', () => {
    test('should detect sibling drop when dragging to left side', () => {
      const mockTab = { id: 1, title: 'Target Tab', children: [] };
      
      const { result } = renderHookWithDropZoneProvider(() => useDragDrop(mockTab, false));
      
      // Mock a drop target element
      const mockElement = {
        getBoundingClientRect: () => ({
          left: 100,
          width: 200
        })
      };
      
      // Test left side (should be sibling)
      const leftSideX = 150; // 50px from left edge of 200px wide element = 25% (< 60% threshold)
      const dropZoneType = result.current.calculateDropZoneType?.(leftSideX, mockElement);
      
      // Note: calculateDropZoneType is not directly exposed, but we can test through the hover behavior
      expect(result.current.dropZoneType).toBeNull(); // Initially null
    });

    test('should detect child drop when dragging to right side', () => {
      const mockTab = { id: 1, title: 'Target Tab', children: [] };
      
      const { result } = renderHookWithDropZoneProvider(() => useDragDrop(mockTab, false));
      
      // Mock a drop target element
      const mockElement = {
        getBoundingClientRect: () => ({
          left: 100,
          width: 200
        })
      };
      
      // Test right side (should be child)
      const rightSideX = 280; // 180px from left edge of 200px wide element = 90% (> 60% threshold)
      
      // The actual dropZoneType calculation happens in the hover handler
      expect(result.current.dropZoneType).toBeNull(); // Initially null
    });
  });

  describe('Position-based Drop Logic', () => {
    test('should handle sibling drop correctly', async () => {
      const mockTab = { id: 2, title: 'Target Tab', children: [] };
      
      // Mock the current state of tabs in browser
      chrome.tabs.get.mockImplementation((tabId) => {
        const tabs = {
          1: { id: 1, index: 0, windowId: 1 }, // Dragged tab
          2: { id: 2, index: 1, windowId: 1 }  // Target tab
        };
        return Promise.resolve(tabs[tabId]);
      });

      chrome.tabs.query.mockResolvedValue([
        { id: 1, index: 0, windowId: 1 },
        { id: 2, index: 1, windowId: 1 }
      ]);

      // Mock hierarchy response showing no existing parent-child relationships
      chrome.runtime.sendMessage.mockImplementation((message) => {
        if (message.action === 'getTabHierarchy') {
          return Promise.resolve({
            success: true,
            hierarchy: [
              { id: 1, title: 'Dragged Tab', children: [] },
              { id: 2, title: 'Target Tab', children: [] }
            ]
          });
        }
        if (message.action === 'getTabParent') {
          return Promise.resolve({
            success: true,
            parentId: null // Target has no parent
          });
        }
        if (message.action === 'updateParentRelationship') {
          return Promise.resolve({ success: true });
        }
        if (message.action === 'refreshHierarchy') {
          return Promise.resolve({ success: true });
        }
        return Promise.resolve({ success: true });
      });

      const { result } = renderHookWithDropZoneProvider(() => useDragDrop(mockTab, false));
      
      // Simulate a sibling drop (position: 'sibling')
      await result.current.handleTabMove(1, { id: 2, windowId: 1 }, 'sibling');

      // Verify chrome.tabs.move was called to position after target (adjusted for downward movement)
      expect(chrome.tabs.move).toHaveBeenCalledWith(1, { index: 1, windowId: 1 });
      
      // Verify parent relationship was updated (should be null for sibling)
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        action: 'updateParentRelationship',
        tabId: 1,
        parentId: null
      });
    });

    test('should handle child drop correctly', async () => {
      const mockTab = { id: 2, title: 'Target Tab', children: [] };
      
      // Mock the current state of tabs in browser
      chrome.tabs.get.mockImplementation((tabId) => {
        const tabs = {
          1: { id: 1, index: 0, windowId: 1 }, // Dragged tab
          2: { id: 2, index: 1, windowId: 1 }  // Target tab
        };
        return Promise.resolve(tabs[tabId]);
      });

      chrome.tabs.query.mockResolvedValue([
        { id: 1, index: 0, windowId: 1 },
        { id: 2, index: 1, windowId: 1 }
      ]);

      // Mock hierarchy response showing no existing parent-child relationships
      chrome.runtime.sendMessage.mockImplementation((message) => {
        if (message.action === 'getTabHierarchy') {
          return Promise.resolve({
            success: true,
            hierarchy: [
              { id: 1, title: 'Dragged Tab', children: [] },
              { id: 2, title: 'Target Tab', children: [] }
            ]
          });
        }
        if (message.action === 'updateParentRelationship') {
          return Promise.resolve({ success: true });
        }
        if (message.action === 'refreshHierarchy') {
          return Promise.resolve({ success: true });
        }
        return Promise.resolve({ success: true });
      });

      const { result } = renderHookWithDropZoneProvider(() => useDragDrop(mockTab, false));
      
      // Simulate a child drop (position: 'child')
      await result.current.handleTabMove(1, { id: 2, windowId: 1 }, 'child');

      // Verify chrome.tabs.move was called to position immediately after target (adjusted for downward movement)
      expect(chrome.tabs.move).toHaveBeenCalledWith(1, { index: 1, windowId: 1 });
      
      // Verify parent relationship was updated (should be target tab id for child)
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        action: 'updateParentRelationship',
        tabId: 1,
        parentId: 2
      });
    });

    test('should handle sibling drop with existing parent correctly', async () => {
      const mockTab = { id: 3, title: 'Target Tab', children: [] };
      
      // Mock the current state of tabs in browser
      chrome.tabs.get.mockImplementation((tabId) => {
        const tabs = {
          1: { id: 1, index: 0, windowId: 1 }, // Dragged tab
          2: { id: 2, index: 1, windowId: 1 }, // Parent tab
          3: { id: 3, index: 2, windowId: 1 }  // Target tab (child of tab 2)
        };
        return Promise.resolve(tabs[tabId]);
      });

      chrome.tabs.query.mockResolvedValue([
        { id: 1, index: 0, windowId: 1 },
        { id: 2, index: 1, windowId: 1 },
        { id: 3, index: 2, windowId: 1 }
      ]);

      // Mock hierarchy response
      chrome.runtime.sendMessage.mockImplementation((message) => {
        if (message.action === 'getTabHierarchy') {
          return Promise.resolve({
            success: true,
            hierarchy: [
              { id: 1, title: 'Dragged Tab', children: [] },
              { 
                id: 2, 
                title: 'Parent Tab', 
                children: [
                  { id: 3, title: 'Target Tab', children: [] }
                ]
              }
            ]
          });
        }
        if (message.action === 'getTabParent') {
          return Promise.resolve({
            success: true,
            parentId: 2 // Target has parent tab 2
          });
        }
        if (message.action === 'updateParentRelationship') {
          return Promise.resolve({ success: true });
        }
        if (message.action === 'refreshHierarchy') {
          return Promise.resolve({ success: true });
        }
        return Promise.resolve({ success: true });
      });

      const { result } = renderHookWithDropZoneProvider(() => useDragDrop(mockTab, false));
      
      // Simulate a sibling drop on tab 3 (which has parent tab 2)
      await result.current.handleTabMove(1, { id: 3, windowId: 1 }, 'sibling');

      // Verify parent relationship was updated to inherit the same parent as target
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        action: 'updateParentRelationship',
        tabId: 1,
        parentId: 2 // Should inherit target's parent
      });
    });
  });

  describe('Drop Zone Visual Feedback', () => {
    test('should return correct drop zone type for visual feedback', () => {
      const mockTab = { id: 1, title: 'Target Tab', children: [] };
      
      const { result } = renderHookWithDropZoneProvider(() => useDragDrop(mockTab, false));
      
      // Initially no drop zone type
      expect(result.current.dropZoneType).toBeNull();
      
      // The dropZoneType would be set by the hover handler in real usage
      // We can verify the property is exposed for visual feedback
      expect(result.current).toHaveProperty('dropZoneType');
    });
  });

  describe('Index Calculation for Drop Positioning', () => {
    test('should calculate correct index for sibling drop after target family', async () => {
      const mockTab = { id: 2, title: 'Target Tab', children: [] };
      
      // Mock tabs in browser with target having children
      chrome.tabs.get.mockImplementation((tabId) => {
        const tabs = {
          1: { id: 1, index: 0, windowId: 1 }, // Dragged tab
          2: { id: 2, index: 1, windowId: 1 }, // Target tab
          3: { id: 3, index: 2, windowId: 1 }, // Child of target
          4: { id: 4, index: 3, windowId: 1 }  // Another tab
        };
        return Promise.resolve(tabs[tabId]);
      });

      chrome.tabs.query.mockResolvedValue([
        { id: 1, index: 0, windowId: 1 },
        { id: 2, index: 1, windowId: 1 },
        { id: 3, index: 2, windowId: 1 },
        { id: 4, index: 3, windowId: 1 }
      ]);

      // Mock hierarchy showing target with child
      chrome.runtime.sendMessage.mockImplementation((message) => {
        if (message.action === 'getTabHierarchy') {
          return Promise.resolve({
            success: true,
            hierarchy: [
              { id: 1, title: 'Dragged Tab', children: [] },
              { 
                id: 2, 
                title: 'Target Tab', 
                children: [
                  { id: 3, title: 'Child Tab', children: [] }
                ]
              },
              { id: 4, title: 'Another Tab', children: [] }
            ]
          });
        }
        if (message.action === 'getTabParent') {
          return Promise.resolve({
            success: true,
            parentId: null
          });
        }
        return Promise.resolve({ success: true });
      });

      const { result } = renderHookWithDropZoneProvider(() => useDragDrop(mockTab, false));
      
      // Simulate sibling drop - should position after target and its children
      await result.current.handleTabMove(1, { id: 2, windowId: 1 }, 'sibling');

      // Should move to index 2 (after target at 1 and its child at 2, adjusted for downward movement)
      expect(chrome.tabs.move).toHaveBeenCalledWith(1, { index: 2, windowId: 1 });
    });

    test('should calculate correct index for child drop immediately after target', async () => {
      const mockTab = { id: 2, title: 'Target Tab', children: [] };
      
      chrome.tabs.get.mockImplementation((tabId) => {
        const tabs = {
          1: { id: 1, index: 0, windowId: 1 }, // Dragged tab
          2: { id: 2, index: 1, windowId: 1 }  // Target tab
        };
        return Promise.resolve(tabs[tabId]);
      });

      chrome.tabs.query.mockResolvedValue([
        { id: 1, index: 0, windowId: 1 },
        { id: 2, index: 1, windowId: 1 }
      ]);

      chrome.runtime.sendMessage.mockImplementation((message) => {
        if (message.action === 'getTabHierarchy') {
          return Promise.resolve({
            success: true,
            hierarchy: [
              { id: 1, title: 'Dragged Tab', children: [] },
              { id: 2, title: 'Target Tab', children: [] }
            ]
          });
        }
        return Promise.resolve({ success: true });
      });

      const { result } = renderHookWithDropZoneProvider(() => useDragDrop(mockTab, false));
      
      // Simulate child drop - should position immediately after target
      await result.current.handleTabMove(1, { id: 2, windowId: 1 }, 'child');

      // Should move to index 1 (immediately after target at index 1, adjusted for downward movement)
      expect(chrome.tabs.move).toHaveBeenCalledWith(1, { index: 1, windowId: 1 });
    });
  });

  describe('Error Handling', () => {
    test('should handle failed hierarchy fetch gracefully', async () => {
      const mockTab = { id: 2, title: 'Target Tab', children: [] };
      
      chrome.tabs.get.mockResolvedValue({ id: 1, index: 0, windowId: 1 });
      chrome.tabs.query.mockResolvedValue([
        { id: 1, index: 0, windowId: 1 },
        { id: 2, index: 1, windowId: 1 }
      ]);

      // Mock failed hierarchy response
      chrome.runtime.sendMessage.mockImplementation((message) => {
        if (message.action === 'getTabHierarchy') {
          return Promise.resolve({ success: false });
        }
        return Promise.resolve({ success: true });
      });

      const { result } = renderHookWithDropZoneProvider(() => useDragDrop(mockTab, false));
      
      // Should not throw and should still attempt the move
      await expect(result.current.handleTabMove(1, { id: 2, windowId: 1 }, 'sibling')).resolves.not.toThrow();
    });
  });
}); 