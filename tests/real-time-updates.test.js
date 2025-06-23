/**
 * Test for real-time updates between background script and UI
 */

import { render, screen, act } from '@testing-library/react';
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

describe('Real-time Updates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });
  
  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('sidebar registers as active with background script', async () => {
    global.chrome.runtime.sendMessage.mockResolvedValue({ success: true, hierarchy: [] });
    
    render(<App />);
    
    // Wait for initial fetch
    await act(async () => {
      jest.runOnlyPendingTimers();
    });
    
    // Check that sidebar active message was sent
    expect(global.chrome.runtime.sendMessage).toHaveBeenCalledWith({
      action: 'sidebarActive',
      timestamp: expect.any(Number)
    });
  });

  test('sidebar receives real-time hierarchy updates', async () => {
    let messageHandler;
    global.chrome.runtime.onMessage.addListener.mockImplementation((handler) => {
      messageHandler = handler;
    });
    
    global.chrome.runtime.sendMessage.mockResolvedValue({ 
      success: true, 
      hierarchy: [
        { id: 1, title: 'Initial Tab', url: 'https://example.com', children: [] }
      ]
    });
    
    render(<App />);
    
    // Wait for initial load
    await act(async () => {
      jest.runOnlyPendingTimers();
    });
    
    // Simulate background script sending hierarchy update
    const updatedHierarchy = [
      { id: 1, title: 'Initial Tab', url: 'https://example.com', children: [] },
      { id: 2, title: 'New Tab', url: 'https://newsite.com', children: [] }
    ];
    
    act(() => {
      messageHandler({
        action: 'hierarchyUpdated',
        hierarchy: updatedHierarchy
      });
    });
    
    // Check that new tab appears in UI
    expect(screen.getByText('New Tab')).toBeInTheDocument();
    expect(screen.getByText('https://newsite.com')).toBeInTheDocument();
  });

  test('polling mechanism provides fallback updates', async () => {
    let hierarchyCallCount = 0;
    global.chrome.runtime.sendMessage.mockImplementation((message) => {
      if (message.action === 'getTabHierarchy') {
        hierarchyCallCount++;
        return Promise.resolve({ 
          success: true, 
          hierarchy: [
            { id: hierarchyCallCount, title: `Tab ${hierarchyCallCount}`, url: `https://example${hierarchyCallCount}.com`, children: [] }
          ]
        });
      }
      // For other messages (sidebarActive, sidebarInactive), just return success
      return Promise.resolve({ success: true });
    });
    
    render(<App />);
    
    // Wait for initial load to complete (App makes immediate call on mount)
    await act(async () => {
      jest.runOnlyPendingTimers();
    });
    
    // At this point, we should have the initial hierarchy call result
    // But hierarchyCallCount might be 1 or 2 depending on React rendering behavior
    // Let's just check that we have some tab visible
    expect(screen.getByTestId('tab-tree-container')).toBeInTheDocument();
    
    // Now advance time to trigger the first polling call
    await act(async () => {
      jest.advanceTimersByTime(2000);
    });
    
    // Should have a new tab from polling
    const currentTabCount = hierarchyCallCount;
    expect(screen.getByText(`Tab ${currentTabCount}`)).toBeInTheDocument();
    
    // Advance time again for next polling call
    await act(async () => {
      jest.advanceTimersByTime(2000);
    });
    
    // Should have next tab from polling
    const nextTabCount = hierarchyCallCount;
    expect(screen.getByText(`Tab ${nextTabCount}`)).toBeInTheDocument();
    expect(nextTabCount).toBeGreaterThan(currentTabCount);
  });
});