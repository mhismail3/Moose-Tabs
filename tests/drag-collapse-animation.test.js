/**
 * Test for Drag Collapse Animation
 * Tests the new functionality where parent tabs collapse children during drag
 */

import React from 'react';
import { screen, fireEvent, waitFor, renderWithDropZoneProvider } from './test-utils';
import TabItem from '../src/components/TabItem';

// Mock Chrome APIs
global.chrome = {
  runtime: {
    sendMessage: jest.fn(),
  },
};

// React DND is already mocked in test setup

describe('Drag Collapse Animation', () => {
  beforeEach(() => {
    // Reset the useDragDrop mock to default state for each test
    global.mockUseDragDrop.mockReturnValue({
      isDragging: false,
      isOver: false,
      canDrop: false,
      showInvalid: false,
      dropZoneType: null,
      dragDropRef: { current: null },
      handleTabMove: jest.fn()
    });
  });

  const mockParentTab = {
    id: 1,
    title: 'Parent Tab',
    url: 'https://example.com',
    children: [
      {
        id: 2,
        title: 'Child Tab 1',
        url: 'https://child1.com',
        children: []
      },
      {
        id: 3,
        title: 'Child Tab 2',
        url: 'https://child2.com',
        children: []
      }
    ]
  };

  const mockChildOnlyTab = {
    id: 4,
    title: 'No Children Tab',
    url: 'https://nochildren.com',
    children: []
  };


  test('parent tab shows children when not dragging', () => {
    renderWithDropZoneProvider(<TabItem tab={mockParentTab} level={0} />);
    
    // Parent tab should be visible
    expect(screen.getByTestId('tab-content-1')).toBeInTheDocument();
    
    // Children should be visible by default (expanded)
    expect(screen.getByTestId('tab-content-2')).toBeInTheDocument();
    expect(screen.getByTestId('tab-content-3')).toBeInTheDocument();
  });

  test('parent tab collapses children when dragging starts', async () => {
    // Start with children visible
    const { rerender } = renderWithDropZoneProvider(<TabItem tab={mockParentTab} level={0} />);
    
    // Verify children are initially visible
    expect(screen.getByTestId('tab-content-2')).toBeInTheDocument();
    expect(screen.getByTestId('tab-content-3')).toBeInTheDocument();
    
    // Override the useDragDrop mock to return isDragging: true
    global.mockUseDragDrop.mockReturnValue({
      isDragging: true,
      isOver: false,
      canDrop: false,
      showInvalid: false,
      dropZoneType: null,
      dragDropRef: { current: null },
      handleTabMove: jest.fn()
    });
    
    // Re-render with dragging state
    rerender(<TabItem tab={mockParentTab} level={0} />);
    
    // Children should be hidden when dragging
    await waitFor(() => {
      expect(screen.queryByTestId('tab-content-2')).not.toBeInTheDocument();
      expect(screen.queryByTestId('tab-content-3')).not.toBeInTheDocument();
    });
    
    // Parent should still be visible
    expect(screen.getByTestId('tab-content-1')).toBeInTheDocument();
  });

  test('parent tab shows stack indicator when dragging with children', () => {
    // Override the useDragDrop mock to return isDragging: true
    global.mockUseDragDrop.mockReturnValue({
      isDragging: true,
      isOver: false,
      canDrop: false,
      showInvalid: false,
      dropZoneType: null,
      dragDropRef: { current: null },
      handleTabMove: jest.fn()
    });
    
    renderWithDropZoneProvider(<TabItem tab={mockParentTab} level={0} />);
    
    const parentTabContent = screen.getByTestId('tab-content-1');
    
    // Should have the dragging-with-children class
    expect(parentTabContent).toHaveClass('dragging-with-children');
  });

  test('tab without children does not show stack indicator when dragging', () => {
    // Override the useDragDrop mock to return isDragging: true
    global.mockUseDragDrop.mockReturnValue({
      isDragging: true,
      isOver: false,
      canDrop: false,
      showInvalid: false,
      dropZoneType: null,
      dragDropRef: { current: null },
      handleTabMove: jest.fn()
    });
    
    renderWithDropZoneProvider(<TabItem tab={mockChildOnlyTab} level={0} />);
    
    const tabContent = screen.getByTestId('tab-content-4');
    
    // Should have dragging class but not dragging-with-children
    expect(tabContent).toHaveClass('dragging');
    expect(tabContent).not.toHaveClass('dragging-with-children');
  });

  test('children reappear when dragging ends', async () => {
    // Start with dragging state
    global.mockUseDragDrop.mockReturnValue({
      isDragging: true,
      isOver: false,
      canDrop: false,
      showInvalid: false,
      dropZoneType: null,
      dragDropRef: { current: null },
      handleTabMove: jest.fn()
    });
    
    const { rerender } = renderWithDropZoneProvider(<TabItem tab={mockParentTab} level={0} />);
    
    // Verify children are hidden during drag
    expect(screen.queryByTestId('tab-content-2')).not.toBeInTheDocument();
    expect(screen.queryByTestId('tab-content-3')).not.toBeInTheDocument();
    
    // End dragging
    global.mockUseDragDrop.mockReturnValue({
      isDragging: false,
      isOver: false,
      canDrop: false,
      showInvalid: false,
      dropZoneType: null,
      dragDropRef: { current: null },
      handleTabMove: jest.fn()
    });
    
    // Re-render without dragging state
    rerender(<TabItem tab={mockParentTab} level={0} />);
    
    // Children should reappear after a short delay
    await waitFor(() => {
      expect(screen.getByTestId('tab-content-2')).toBeInTheDocument();
      expect(screen.getByTestId('tab-content-3')).toBeInTheDocument();
    }, { timeout: 200 });
  });

  test('expand/collapse button still works when not dragging', async () => {
    renderWithDropZoneProvider(<TabItem tab={mockParentTab} level={0} />);
    
    const expandButton = screen.getByTestId('expand-collapse-btn-1');
    
    // Children should be visible initially
    expect(screen.getByTestId('tab-content-2')).toBeInTheDocument();
    expect(screen.getByTestId('tab-content-3')).toBeInTheDocument();
    
    // Click to collapse
    fireEvent.click(expandButton);
    
    // Children should be hidden
    await waitFor(() => {
      expect(screen.queryByTestId('tab-content-2')).not.toBeInTheDocument();
      expect(screen.queryByTestId('tab-content-3')).not.toBeInTheDocument();
    });
    
    // Click to expand again
    fireEvent.click(expandButton);
    
    // Children should be visible again
    await waitFor(() => {
      expect(screen.getByTestId('tab-content-2')).toBeInTheDocument();
      expect(screen.getByTestId('tab-content-3')).toBeInTheDocument();
    });
  });
});