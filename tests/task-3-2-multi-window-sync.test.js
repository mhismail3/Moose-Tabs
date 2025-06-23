/**
 * Test for Task 3.2: Multi-Window Sync
 * TDD Test: End-to-end test that opens two browser windows, creates tabs in both,
 * and verifies that the sidebar in each window shows the complete and correct
 * tab tree from both windows.
 */

import { render, screen, waitFor } from '@testing-library/react';
import App from '../src/App';

// Mock Chrome APIs for testing
global.chrome = {
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    }
  }
};

describe('Task 3.2: Multi-Window Sync', () => {
  let mockSendMessage;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    mockSendMessage = global.chrome.runtime.sendMessage;
  });
  
  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('sidebar shows tabs from all windows when multiple windows exist', async () => {
    // Mock hierarchy containing tabs from multiple windows
    const multiWindowHierarchy = [
      {
        id: 1,
        title: 'Window 1 - Root Tab',
        url: 'https://example.com',
        windowId: 1,
        children: [
          {
            id: 2,
            title: 'Window 1 - Child Tab',
            url: 'https://example.com/child',
            windowId: 1,
            children: []
          }
        ]
      },
      {
        id: 3,
        title: 'Window 2 - Root Tab',
        url: 'https://another.com',
        windowId: 2,
        children: [
          {
            id: 4,
            title: 'Window 2 - Child Tab',
            url: 'https://another.com/child',
            windowId: 2,
            children: []
          }
        ]
      },
      {
        id: 5,
        title: 'Window 3 - Standalone Tab',
        url: 'https://third.com',
        windowId: 3,
        children: []
      }
    ];

    // Mock successful response with multi-window hierarchy
    mockSendMessage.mockResolvedValue({
      success: true,
      hierarchy: multiWindowHierarchy
    });
    
    render(<App />);
    
    // Wait for the component to load and get data
    await waitFor(() => {
      expect(screen.getByText('🐃 Moose Tabs')).toBeInTheDocument();
    });
    
    // Wait for hierarchy to load
    await waitFor(() => {
      expect(screen.getByText('Window 1 - Root Tab')).toBeInTheDocument();
    });
    
    // Verify all tabs from all windows are displayed
    expect(screen.getByText('Window 1 - Child Tab')).toBeInTheDocument();
    expect(screen.getByText('Window 2 - Root Tab')).toBeInTheDocument();
    expect(screen.getByText('Window 2 - Child Tab')).toBeInTheDocument();
    expect(screen.getByText('Window 3 - Standalone Tab')).toBeInTheDocument();
    
    // Verify URLs are displayed
    expect(screen.getByText('https://example.com')).toBeInTheDocument();
    expect(screen.getByText('https://another.com')).toBeInTheDocument();
    expect(screen.getByText('https://third.com')).toBeInTheDocument();
  });

  test('sidebar updates when tabs are added to different windows', async () => {
    // Initial hierarchy with one window
    const initialHierarchy = [
      {
        id: 1,
        title: 'Window 1 - Tab',
        url: 'https://example.com',
        windowId: 1,
        children: []
      }
    ];

    // Updated hierarchy with tabs from multiple windows
    const updatedHierarchy = [
      {
        id: 1,
        title: 'Window 1 - Tab',
        url: 'https://example.com',
        windowId: 1,
        children: []
      },
      {
        id: 2,
        title: 'Window 2 - New Tab',
        url: 'https://newwindow.com',
        windowId: 2,
        children: []
      }
    ];

    // Mock initial response
    mockSendMessage.mockResolvedValueOnce({
      success: true,
      hierarchy: initialHierarchy
    });
    
    render(<App />);
    
    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Window 1 - Tab')).toBeInTheDocument();
    });
    
    // Verify only window 1 tab is shown initially
    expect(screen.queryByText('Window 2 - New Tab')).not.toBeInTheDocument();
    
    // Simulate real-time update with new window tab
    const mockOnMessage = global.chrome.runtime.onMessage.addListener;
    const messageHandler = mockOnMessage.mock.calls[0][0];
    
    // Trigger hierarchy update message
    messageHandler({
      action: 'hierarchyUpdated',
      hierarchy: updatedHierarchy
    });
    
    // Verify both windows' tabs are now shown
    await waitFor(() => {
      expect(screen.getByText('Window 1 - Tab')).toBeInTheDocument();
      expect(screen.getByText('Window 2 - New Tab')).toBeInTheDocument();
    });
  });

  test('sidebar maintains sync when tabs are moved between windows', async () => {
    // Initial hierarchy with tab in window 1
    const initialHierarchy = [
      {
        id: 1,
        title: 'Moveable Tab',
        url: 'https://example.com',
        windowId: 1,
        children: []
      },
      {
        id: 2,
        title: 'Window 2 Tab',
        url: 'https://window2.com',
        windowId: 2,
        children: []
      }
    ];

    // Updated hierarchy after tab moved from window 1 to window 2
    const updatedHierarchy = [
      {
        id: 1,
        title: 'Moveable Tab',
        url: 'https://example.com',
        windowId: 2, // Moved to window 2
        children: []
      },
      {
        id: 2,
        title: 'Window 2 Tab',
        url: 'https://window2.com',
        windowId: 2,
        children: []
      }
    ];

    mockSendMessage.mockResolvedValueOnce({
      success: true,
      hierarchy: initialHierarchy
    });
    
    render(<App />);
    
    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Moveable Tab')).toBeInTheDocument();
      expect(screen.getByText('Window 2 Tab')).toBeInTheDocument();
    });
    
    // Simulate tab move between windows
    const mockOnMessage = global.chrome.runtime.onMessage.addListener;
    const messageHandler = mockOnMessage.mock.calls[0][0];
    
    messageHandler({
      action: 'hierarchyUpdated',
      hierarchy: updatedHierarchy
    });
    
    // Verify both tabs are still shown (moved tab should still be visible)
    await waitFor(() => {
      expect(screen.getByText('Moveable Tab')).toBeInTheDocument();
      expect(screen.getByText('Window 2 Tab')).toBeInTheDocument();
    });
  });

  test('sidebar shows empty state when no windows have tabs', async () => {
    // Mock empty hierarchy (no tabs in any window)
    mockSendMessage.mockResolvedValue({
      success: true,
      hierarchy: []
    });
    
    render(<App />);
    
    // Wait for loading to complete and empty state to show
    await waitFor(() => {
      expect(screen.getByText('No tabs available')).toBeInTheDocument();
    });
  });

  test('sidebar handles window closing gracefully', async () => {
    // Initial hierarchy with tabs from two windows
    const initialHierarchy = [
      {
        id: 1,
        title: 'Window 1 Tab',
        url: 'https://window1.com',
        windowId: 1,
        children: []
      },
      {
        id: 2,
        title: 'Window 2 Tab',
        url: 'https://window2.com',
        windowId: 2,
        children: []
      }
    ];

    // Updated hierarchy after window 1 is closed
    const updatedHierarchy = [
      {
        id: 2,
        title: 'Window 2 Tab',
        url: 'https://window2.com',
        windowId: 2,
        children: []
      }
    ];

    mockSendMessage.mockResolvedValueOnce({
      success: true,
      hierarchy: initialHierarchy
    });
    
    render(<App />);
    
    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Window 1 Tab')).toBeInTheDocument();
      expect(screen.getByText('Window 2 Tab')).toBeInTheDocument();
    });
    
    // Simulate window 1 closing (its tabs are removed)
    const mockOnMessage = global.chrome.runtime.onMessage.addListener;
    const messageHandler = mockOnMessage.mock.calls[0][0];
    
    messageHandler({
      action: 'hierarchyUpdated',
      hierarchy: updatedHierarchy
    });
    
    // Verify only window 2 tab remains
    await waitFor(() => {
      expect(screen.queryByText('Window 1 Tab')).not.toBeInTheDocument();
      expect(screen.getByText('Window 2 Tab')).toBeInTheDocument();
    });
  });

  test('background script request does not filter by window ID', async () => {
    mockSendMessage.mockResolvedValue({
      success: true,
      hierarchy: []
    });
    
    render(<App />);
    
    // Wait for component to make initial request
    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith({
        action: 'getTabHierarchy'
      });
    });
    
    // Verify that the request doesn't include a windowId filter
    const calls = mockSendMessage.mock.calls;
    expect(calls[0][0]).not.toHaveProperty('windowId');
  });
});