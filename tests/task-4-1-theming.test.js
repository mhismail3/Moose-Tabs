/**
 * Test for Task 4.1: Theming (Light/Dark Mode)
 * Tests the CSS variables and theme system implementation
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

describe('Task 4.1: Theming System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });
  
  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('app renders with theme-aware CSS variables', async () => {
    const hierarchy = [
      {
        id: 1,
        title: 'Sample Tab',
        url: 'https://example.com',
        windowId: 1,
        children: []
      }
    ];

    global.chrome.runtime.sendMessage.mockResolvedValue({
      success: true,
      hierarchy: hierarchy
    });
    
    render(<App />);
    
    // Wait for the app to load
    await screen.findByText('Sample Tab');
    
    // Verify the main container has the expected structure
    const container = screen.getByTestId('sidebar-container');
    expect(container).toBeInTheDocument();
    expect(container).toHaveClass('sidebar-container');
    
    // Verify the tab tree is rendered
    const tabTree = screen.getByTestId('tab-tree-container');
    expect(tabTree).toBeInTheDocument();
    expect(tabTree).toHaveClass('tab-tree');
  });

  test('tab items use theme-aware classes', async () => {
    const hierarchy = [
      {
        id: 1,
        title: 'Theme Test Tab',
        url: 'https://theme-test.com',
        windowId: 1,
        children: []
      }
    ];

    global.chrome.runtime.sendMessage.mockResolvedValue({
      success: true,
      hierarchy: hierarchy
    });
    
    render(<App />);
    
    // Wait for tabs to load
    await screen.findByText('Theme Test Tab');
    
    // Find tab content element
    const tabElement = screen.getByText('Theme Test Tab').closest('[draggable]');
    
    // Verify it has the correct CSS classes for theming
    expect(tabElement).toHaveClass('tab-content');
    expect(tabElement).toHaveClass('tab-level-0');
  });

  test('loading state uses theme-aware styles', () => {
    // Mock a pending response to show loading state
    global.chrome.runtime.sendMessage.mockImplementation(() => new Promise(() => {}));
    
    render(<App />);
    
    // Verify loading state is displayed with correct classes
    const loadingElement = screen.getByText('Loading tab hierarchy...');
    expect(loadingElement).toBeInTheDocument();
    expect(loadingElement).toHaveClass('loading');
  });

  test('error state uses theme-aware styles', async () => {
    // Mock an error response
    global.chrome.runtime.sendMessage.mockResolvedValue({
      success: false,
      error: 'Test error message'
    });
    
    render(<App />);
    
    // Wait for error to appear
    await screen.findByText(/Error: Test error message/);
    
    // Verify error state is displayed with correct classes
    const errorElement = screen.getByText(/Error: Test error message/);
    expect(errorElement).toBeInTheDocument();
    expect(errorElement).toHaveClass('error');
    
    // Verify retry button has proper styling
    const retryButton = screen.getByText('Retry');
    expect(retryButton).toBeInTheDocument();
  });

  test('empty state uses theme-aware styles', async () => {
    global.chrome.runtime.sendMessage.mockResolvedValue({
      success: true,
      hierarchy: []
    });
    
    render(<App />);
    
    // Wait for empty state to appear
    await screen.findByText('No tabs available');
    
    // Verify empty state styling - should have no-tabs class on container
    const emptyState = screen.getByText('No tabs available');
    expect(emptyState).toBeInTheDocument();
    
    // The parent div should have the no-tabs class
    const noTabsContainer = emptyState.closest('.no-tabs');
    expect(noTabsContainer).toBeInTheDocument();
    
    // Verify refresh button is present
    const refreshButton = screen.getByText('Refresh');
    expect(refreshButton).toBeInTheDocument();
  });

  test('hierarchical tabs maintain theme consistency', async () => {
    const hierarchy = [
      {
        id: 1,
        title: 'Parent Tab',
        url: 'https://parent.com',
        windowId: 1,
        children: [
          {
            id: 2,
            title: 'Child Tab',
            url: 'https://child.com',
            windowId: 1,
            children: []
          }
        ]
      }
    ];

    global.chrome.runtime.sendMessage.mockResolvedValue({
      success: true,
      hierarchy: hierarchy
    });
    
    render(<App />);
    
    // Wait for hierarchy to load
    await screen.findByText('Parent Tab');
    await screen.findByText('Child Tab');
    
    // Verify both parent and child tabs have proper theming classes
    const parentTab = screen.getByText('Parent Tab').closest('[draggable]');
    const childTab = screen.getByText('Child Tab').closest('[draggable]');
    
    expect(parentTab).toHaveClass('tab-content', 'tab-level-0');
    expect(childTab).toHaveClass('tab-content', 'tab-level-1');
  });
});