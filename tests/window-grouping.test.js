/**
 * Test for window grouping functionality
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import TabTreeComponent from '../src/components/TabTreeComponent';
import '@testing-library/jest-dom';

// Mock chrome APIs
global.chrome = {
  runtime: {
    sendMessage: jest.fn()
  },
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn()
    }
  }
};

// Wrapper component with DndProvider
const TestWrapper = ({ children }) => (
  <DndProvider backend={HTML5Backend}>
    {children}
  </DndProvider>
);

describe('Window Grouping Functionality', () => {
  const mockTabHierarchy = [
    {
      id: 1,
      title: 'Tab 1 - Window 1',
      url: 'https://example.com/1',
      windowId: 100,
      index: 0,
      children: [
        {
          id: 2,
          title: 'Tab 2 - Child of Tab 1',
          url: 'https://example.com/2',
          windowId: 100,
          index: 1,
          children: []
        }
      ]
    },
    {
      id: 3,
      title: 'Tab 3 - Window 1',
      url: 'https://example.com/3',
      windowId: 100,
      index: 2,
      children: []
    },
    {
      id: 4,
      title: 'Tab 4 - Window 2',
      url: 'https://example.com/4',
      windowId: 200,
      index: 0,
      children: []
    },
    {
      id: 5,
      title: 'Tab 5 - Window 2',
      url: 'https://example.com/5',
      windowId: 200,
      index: 1,
      children: [
        {
          id: 6,
          title: 'Tab 6 - Child of Tab 5',
          url: 'https://example.com/6',
          windowId: 200,
          index: 2,
          children: []
        }
      ]
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset Chrome storage mocks to default behavior
    global.chrome.storage.local.get.mockResolvedValue({});
    global.chrome.storage.local.set.mockResolvedValue();
  });

  test('should group tabs by windows', () => {
    render(
      <TestWrapper>
        <TabTreeComponent tabHierarchy={mockTabHierarchy} />
      </TestWrapper>
    );

    // Check that window labels are present
    expect(screen.getByText(/Window 100/)).toBeInTheDocument();
    expect(screen.getByText(/Window 200/)).toBeInTheDocument();
  });

  test('should show correct tab count in window labels including children', () => {
    render(
      <TestWrapper>
        <TabTreeComponent tabHierarchy={mockTabHierarchy} />
      </TestWrapper>
    );

    // Window 100 should have 3 tabs total (Tab 1, Tab 2 child of Tab 1, and Tab 3)
    expect(screen.getByText('Window 100')).toBeInTheDocument();
    
    // Window 200 should have 3 tabs total (Tab 4, Tab 5, and Tab 6 child of Tab 5)
    expect(screen.getByText('Window 200')).toBeInTheDocument();
    
    // Both should show 3 tabs (there will be two instances)
    expect(screen.getAllByText('(3 tabs)')).toHaveLength(2);
  });

  test('should render tabs in correct window groups', () => {
    render(
      <TestWrapper>
        <TabTreeComponent tabHierarchy={mockTabHierarchy} />
      </TestWrapper>
    );

    // All tabs should be present
    expect(screen.getByText('Tab 1 - Window 1')).toBeInTheDocument();
    expect(screen.getByText('Tab 2 - Child of Tab 1')).toBeInTheDocument();
    expect(screen.getByText('Tab 3 - Window 1')).toBeInTheDocument();
    expect(screen.getByText('Tab 4 - Window 2')).toBeInTheDocument();
    expect(screen.getByText('Tab 5 - Window 2')).toBeInTheDocument();
    expect(screen.getByText('Tab 6 - Child of Tab 5')).toBeInTheDocument();
  });

  test('should handle single tab window correctly', () => {
    const singleTabHierarchy = [
      {
        id: 1,
        title: 'Single Tab',
        url: 'https://example.com/single',
        windowId: 300,
        index: 0,
        children: []
      }
    ];

    render(
      <TestWrapper>
        <TabTreeComponent tabHierarchy={singleTabHierarchy} />
      </TestWrapper>
    );

    // Should show correct singular form
    expect(screen.getByText('Window 300')).toBeInTheDocument();
    expect(screen.getByText('(1 tab)')).toBeInTheDocument();
    expect(screen.getByText('Single Tab')).toBeInTheDocument();
  });

  test('should handle empty hierarchy', () => {
    render(
      <TestWrapper>
        <TabTreeComponent tabHierarchy={[]} />
      </TestWrapper>
    );

    // Should show empty state
    expect(screen.getByText('No tabs available')).toBeInTheDocument();
  });

  test('should filter tabs by search while maintaining window groups', () => {
    render(
      <TestWrapper>
        <TabTreeComponent tabHierarchy={mockTabHierarchy} />
      </TestWrapper>
    );

    // Get search input and search for "Window 1"
    const searchInput = screen.getByPlaceholderText('Search tabs');
    
    // Simulate typing in search
    fireEvent.change(searchInput, { target: { value: 'Window 1' } });

    // Only Window 100 tabs should be visible
    expect(screen.getByText('Tab 1 - Window 1')).toBeInTheDocument();
    expect(screen.getByText('Tab 3 - Window 1')).toBeInTheDocument();
    
    // Window 200 tabs should not be visible
    expect(screen.queryByText('Tab 4 - Window 2')).not.toBeInTheDocument();
    expect(screen.queryByText('Tab 5 - Window 2')).not.toBeInTheDocument();
  });

  test('should preserve hierarchy within window groups', () => {
    render(
      <TestWrapper>
        <TabTreeComponent tabHierarchy={mockTabHierarchy} />
      </TestWrapper>
    );

    // Check that parent-child relationships are preserved
    const tab1 = screen.getByTestId('tab-content-1');
    const tab2 = screen.getByTestId('tab-content-2');
    const tab5 = screen.getByTestId('tab-content-5');
    const tab6 = screen.getByTestId('tab-content-6');

    // Tab 2 should be a child of Tab 1
    expect(tab1).toBeInTheDocument();
    expect(tab2).toBeInTheDocument();
    
    // Tab 6 should be a child of Tab 5
    expect(tab5).toBeInTheDocument();
    expect(tab6).toBeInTheDocument();
  });

  test('should update tab count when hierarchy changes', () => {
    const { rerender } = render(
      <TestWrapper>
        <TabTreeComponent tabHierarchy={mockTabHierarchy} />
      </TestWrapper>
    );

    // Initial counts should be 3 tabs for both windows
    expect(screen.getByText('Window 100')).toBeInTheDocument();
    expect(screen.getAllByText('(3 tabs)')).toHaveLength(2);

    // Add a new tab to Window 100
    const updatedHierarchy = [
      ...mockTabHierarchy,
      {
        id: 7,
        title: 'Tab 7 - New Tab',
        url: 'https://example.com/7',
        windowId: 100,
        index: 3,
        children: []
      }
    ];

    rerender(
      <TestWrapper>
        <TabTreeComponent tabHierarchy={updatedHierarchy} />
      </TestWrapper>
    );

    // Should now have one window with 4 tabs and one with 3 tabs
    expect(screen.getByText('(4 tabs)')).toBeInTheDocument();
    expect(screen.getByText('(3 tabs)')).toBeInTheDocument();
  });

  test('should allow editing window names on double-click', async () => {
    // Mock Chrome storage to return empty custom names
    global.chrome.storage.local.get.mockResolvedValue({});

    render(
      <TestWrapper>
        <TabTreeComponent tabHierarchy={mockTabHierarchy} />
      </TestWrapper>
    );

    // Find the window label for Window 100
    const windowLabel = screen.getByText(/Window 100/);
    
    // Double-click to start editing
    fireEvent.doubleClick(windowLabel.closest('.window-label'));

    // Should show an input field
    const input = screen.getByPlaceholderText('Enter window name');
    expect(input).toBeInTheDocument();
    expect(input.value).toBe('Window 100');

    // Change the name
    fireEvent.change(input, { target: { value: 'My Custom Window' } });
    expect(input.value).toBe('My Custom Window');

    // Press Enter to save
    fireEvent.keyDown(input, { key: 'Enter' });

    // Wait for async save operation and state update
    await new Promise(resolve => setTimeout(resolve, 0));

    // Should save to Chrome storage
    expect(global.chrome.storage.local.set).toHaveBeenCalledWith({
      customWindowNames: { '100': 'My Custom Window' }
    });

    // Should display the new name
    await screen.findByText('My Custom Window');
  });

  test('should cancel editing on Escape key', async () => {
    global.chrome.storage.local.get.mockResolvedValue({});

    render(
      <TestWrapper>
        <TabTreeComponent tabHierarchy={mockTabHierarchy} />
      </TestWrapper>
    );

    // Find the window label for Window 100
    const windowLabel = screen.getByText(/Window 100/);
    
    // Double-click to start editing
    fireEvent.doubleClick(windowLabel.closest('.window-label'));

    // Should show an input field
    const input = screen.getByPlaceholderText('Enter window name');
    
    // Change the name
    fireEvent.change(input, { target: { value: 'Changed Name' } });

    // Press Escape to cancel
    fireEvent.keyDown(input, { key: 'Escape' });

    // Should not save to Chrome storage
    expect(global.chrome.storage.local.set).not.toHaveBeenCalled();

    // Should revert to original name
    expect(screen.getByText(/Window 100/)).toBeInTheDocument();
    expect(screen.queryByText('Changed Name')).not.toBeInTheDocument();
  });

  test('should load custom window names from Chrome storage', async () => {
    // Mock Chrome storage to return custom names
    global.chrome.storage.local.get.mockResolvedValue({
      customWindowNames: { '100': 'My Work Window', '200': 'Personal Window' }
    });

    render(
      <TestWrapper>
        <TabTreeComponent tabHierarchy={mockTabHierarchy} />
      </TestWrapper>
    );

    // Should display custom names
    await screen.findByText('My Work Window');
    await screen.findByText('Personal Window');
    
    expect(screen.getByText('My Work Window')).toBeInTheDocument();
    expect(screen.getByText('Personal Window')).toBeInTheDocument();
  });

  test('should handle Chrome storage errors gracefully', async () => {
    // Mock Chrome storage to throw an error
    global.chrome.storage.local.get.mockRejectedValue(new Error('Storage error'));
    
    // Should not throw an error
    expect(() => {
      render(
        <TestWrapper>
          <TabTreeComponent tabHierarchy={mockTabHierarchy} />
        </TestWrapper>
      );
    }).not.toThrow();

    // Should still show default names
    expect(screen.getByText(/Window 100/)).toBeInTheDocument();
    expect(screen.getByText(/Window 200/)).toBeInTheDocument();
  });
});