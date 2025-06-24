/**
 * Test for Task 2.1: Basic React App in Sidebar
 * TDD Test: Check if React application renders "Hello Moose-Tabs" message
 */

import { render, screen } from '@testing-library/react';
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

// Mock successful hierarchy response
const mockHierarchyResponse = {
  success: true,
  hierarchy: [
    {
      id: 1,
      title: "Test Tab",
      url: "https://example.com",
      windowId: 1,
      children: []
    }
  ]
};

describe('React Sidebar App', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    
    // Mock successful sendMessage response
    global.chrome.runtime.sendMessage.mockResolvedValue(mockHierarchyResponse);
    
    // Mock timers to control polling
    jest.useFakeTimers();
  });
  
  afterEach(() => {
    // Clean up timers
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('renders app with tab hierarchy', async () => {
    render(<App />);
    
    // Should show loading first
    expect(screen.getByText('Loading tab hierarchy...')).toBeInTheDocument();
    
    // Wait for the async operation to complete and show test tab
    await screen.findByText('Test Tab');
    expect(screen.getByText('Test Tab')).toBeInTheDocument();
  });

  test('mounts React app without errors', async () => {
    const { container } = render(<App />);
    expect(container.firstChild).not.toBeNull();
    
    // Wait for loading to complete
    await screen.findByText('Test Tab');
  });

  test('renders app in sidebar container', async () => {
    render(<App />);
    const sidebarContainer = screen.getByTestId('sidebar-container');
    expect(sidebarContainer).toBeInTheDocument();
    
    // Wait for loading to complete
    await screen.findByText('Test Tab');
  });
  
  test('calls chrome.runtime.sendMessage to get tab hierarchy', async () => {
    render(<App />);
    
    // Wait for the component to load
    await screen.findByText('Test Tab');
    
    // Verify the chrome API was called
    expect(global.chrome.runtime.sendMessage).toHaveBeenCalledWith({
      action: 'getTabHierarchy'
    });
  });

  test('displays error state when hierarchy fetch fails', async () => {
    // Mock failed response
    global.chrome.runtime.sendMessage.mockResolvedValue({
      success: false,
      error: 'Test error message'
    });
    
    render(<App />);
    
    // Wait for error to appear
    const errorElement = await screen.findByText(/Error: Test error message/i);
    expect(errorElement).toBeInTheDocument();
    
    // Should show retry button
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });
});