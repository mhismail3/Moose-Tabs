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
    let callCount = 0;
    global.chrome.runtime.sendMessage.mockImplementation(() => {
      callCount++;
      return Promise.resolve({ 
        success: true, 
        hierarchy: [
          { id: callCount, title: `Tab ${callCount}`, url: `https://example${callCount}.com`, children: [] }
        ]
      });
    });
    
    render(<App />);
    
    // Initial call
    await act(async () => {
      jest.runOnlyPendingTimers();
    });
    
    expect(screen.getByText('Tab 1')).toBeInTheDocument();
    
    // Advance time by 2 seconds to trigger polling
    await act(async () => {
      jest.advanceTimersByTime(2000);
    });
    
    expect(screen.getByText('Tab 2')).toBeInTheDocument();
    
    // Advance time again
    await act(async () => {
      jest.advanceTimersByTime(2000);
    });
    
    expect(screen.getByText('Tab 3')).toBeInTheDocument();
  });
});