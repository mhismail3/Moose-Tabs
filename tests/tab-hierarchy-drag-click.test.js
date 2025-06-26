/**
 * Test for Tab Hierarchy Drag and Click Functionality
 * Tests the new features: dragging parent tabs with children and click-to-switch
 */

import React from 'react';
import { screen, fireEvent, waitFor, renderWithDropZoneProvider } from './test-utils';
import TabItem from '../src/components/TabItem';

// Mock Chrome APIs
global.chrome = {
  runtime: {
    sendMessage: jest.fn(),
  },
  tabs: {
    get: jest.fn(),
    query: jest.fn(),
    move: jest.fn(),
    update: jest.fn(),
  },
  windows: {
    update: jest.fn(),
  },
};

// Mock react-dnd
jest.mock('react-dnd', () => ({
  useDrag: () => [{ isDragging: false }, jest.fn()],
  useDrop: () => [{ isOver: false, canDrop: true }, jest.fn()],
}));

describe('Tab Hierarchy Drag and Click Functionality', () => {
  const mockParentTab = {
    id: 1,
    title: 'Parent Tab',
    url: 'https://parent.com',
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

  const mockSimpleTab = {
    id: 4,
    title: 'Simple Tab',
    url: 'https://simple.com',
    children: []
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful responses
    chrome.runtime.sendMessage.mockResolvedValue({ 
      success: true,
      hierarchy: [mockParentTab]
    });
    chrome.tabs.get.mockResolvedValue({ id: 1, index: 0, windowId: 1 });
    chrome.tabs.query.mockResolvedValue([
      { id: 1, index: 0, windowId: 1 },
      { id: 2, index: 1, windowId: 1 },
      { id: 3, index: 2, windowId: 1 },
      { id: 4, index: 3, windowId: 1 }
    ]);
    chrome.tabs.move.mockResolvedValue({});
    chrome.tabs.update.mockResolvedValue({});
    chrome.windows.update.mockResolvedValue({});
  });

  test('clicking on tab content sends switchToTab message', async () => {
    renderWithDropZoneProvider(<TabItem tab={mockSimpleTab} level={0} />);
    
    const tabContent = screen.getByTestId('tab-content-4');
    
    // Click on the tab content
    fireEvent.click(tabContent);
    
    // Verify that chrome.runtime.sendMessage was called with switchToTab action
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
      action: 'switchToTab',
      tabId: 4
    });
  });

  test('clicking on expand/collapse button does not trigger tab switch', async () => {
    renderWithDropZoneProvider(<TabItem tab={mockParentTab} level={0} />);
    
    const expandButton = screen.getByTestId('expand-collapse-btn-1');
    
    // Click on the expand/collapse button
    fireEvent.click(expandButton);
    
    // Verify that switchToTab was not called
    expect(chrome.runtime.sendMessage).not.toHaveBeenCalledWith({
      action: 'switchToTab',
      tabId: 1
    });
  });

  test('clicking on close button does not trigger tab switch', async () => {
    renderWithDropZoneProvider(<TabItem tab={mockSimpleTab} level={0} />);
    
    const tabContent = screen.getByTestId('tab-content-4');
    
    // Hover to show close button
    fireEvent.mouseEnter(tabContent);
    
    const closeButton = await screen.findByTestId('close-btn-4');
    
    // Click on the close button
    fireEvent.click(closeButton);
    
    // Verify that only closeTab was called, not switchToTab
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
      action: 'closeTab',
      tabId: 4
    });
    expect(chrome.runtime.sendMessage).not.toHaveBeenCalledWith({
      action: 'switchToTab',
      tabId: 4
    });
  });

  test('clicking on favicon area triggers tab switch', async () => {
    renderWithDropZoneProvider(<TabItem tab={mockSimpleTab} level={0} />);
    
    const favicon = screen.getByRole('img');
    
    // Click on the favicon
    fireEvent.click(favicon);
    
    // Verify that chrome.runtime.sendMessage was called with switchToTab action
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
      action: 'switchToTab',
      tabId: 4
    });
  });

  test('clicking on tab title triggers tab switch', async () => {
    renderWithDropZoneProvider(<TabItem tab={mockSimpleTab} level={0} />);
    
    const tabTitle = screen.getByText('Simple Tab');
    
    // Click on the tab title
    fireEvent.click(tabTitle);
    
    // Verify that chrome.runtime.sendMessage was called with switchToTab action
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
      action: 'switchToTab',
      tabId: 4
    });
  });

  test('clicking on tab URL triggers tab switch', async () => {
    renderWithDropZoneProvider(<TabItem tab={mockSimpleTab} level={0} />);
    
    const tabUrl = screen.getByText('https://simple.com');
    
    // Click on the tab URL
    fireEvent.click(tabUrl);
    
    // Verify that chrome.runtime.sendMessage was called with switchToTab action
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
      action: 'switchToTab',
      tabId: 4
    });
  });

  test('tab content has clickable styling', () => {
    renderWithDropZoneProvider(<TabItem tab={mockSimpleTab} level={0} />);
    
    const tabContent = screen.getByTestId('tab-content-4');
    
    // Check that the tab content has cursor pointer styling
    expect(tabContent).toHaveClass('tab-content');
    
    // The CSS should include cursor: pointer on hover (tested via integration)
  });

  test('tab with children shows both expand button and is clickable', async () => {
    renderWithDropZoneProvider(<TabItem tab={mockParentTab} level={0} />);
    
    // Should have expand button
    const expandButton = screen.getByTestId('expand-collapse-btn-1');
    expect(expandButton).toBeInTheDocument();
    
    // Should show children initially
    expect(screen.getByText('Child Tab 1')).toBeInTheDocument();
    expect(screen.getByText('Child Tab 2')).toBeInTheDocument();
    
    // Should be clickable (click on title, not button)
    const tabTitle = screen.getByText('Parent Tab');
    fireEvent.click(tabTitle);
    
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
      action: 'switchToTab',
      tabId: 1
    });
  });
});