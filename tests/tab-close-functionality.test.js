/**
 * Test for Tab Close Functionality
 * Tests the new close button that appears on hover and closes tabs
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

// Mock react-dnd
jest.mock('react-dnd', () => ({
  useDrag: () => [{ isDragging: false }, jest.fn()],
  useDrop: () => [{ isOver: false, canDrop: true }, jest.fn()],
}));

describe('Tab Close Functionality', () => {
  const mockTab = {
    id: 1,
    title: 'Test Tab',
    url: 'https://example.com',
    children: []
  };

  beforeEach(() => {
    jest.clearAllMocks();
    chrome.runtime.sendMessage.mockResolvedValue({ success: true });
  });

  test('renders tab with favicon', () => {
    renderWithDropZoneProvider(<TabItem tab={mockTab} level={0} />);
    
    const favicon = screen.getByRole('img');
    expect(favicon).toBeInTheDocument();
    expect(favicon).toHaveClass('tab-favicon');
    
    // Check that favicon URL includes the domain
    expect(favicon.src).toContain('example.com');
  });

  test('close button appears on hover', async () => {
    renderWithDropZoneProvider(<TabItem tab={mockTab} level={0} />);
    
    const tabContent = screen.getByTestId('tab-content-1');
    
    // Close button should not be visible initially
    expect(screen.queryByTestId('close-btn-1')).not.toBeInTheDocument();
    
    // Hover over the tab
    fireEvent.mouseEnter(tabContent);
    
    // Close button should appear
    await waitFor(() => {
      expect(screen.getByTestId('close-btn-1')).toBeInTheDocument();
    });
  });

  test('close button disappears when hover ends', async () => {
    renderWithDropZoneProvider(<TabItem tab={mockTab} level={0} />);
    
    const tabContent = screen.getByTestId('tab-content-1');
    
    // Hover over the tab
    fireEvent.mouseEnter(tabContent);
    
    // Close button should appear
    await waitFor(() => {
      expect(screen.getByTestId('close-btn-1')).toBeInTheDocument();
    });
    
    // Stop hovering
    fireEvent.mouseLeave(tabContent);
    
    // Close button should disappear
    await waitFor(() => {
      expect(screen.queryByTestId('close-btn-1')).not.toBeInTheDocument();
    });
  });

  test('clicking close button sends closeTab message', async () => {
    renderWithDropZoneProvider(<TabItem tab={mockTab} level={0} />);
    
    const tabContent = screen.getByTestId('tab-content-1');
    
    // Hover over the tab
    fireEvent.mouseEnter(tabContent);
    
    // Wait for close button to appear
    const closeButton = await screen.findByTestId('close-btn-1');
    
    // Click the close button
    fireEvent.click(closeButton);
    
    // Verify that chrome.runtime.sendMessage was called with correct parameters
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
      action: 'closeTab',
      tabId: 1
    });
  });

  test('close button click event does not propagate', async () => {
    const mockTabClick = jest.fn();
    
    renderWithDropZoneProvider(
      <div onClick={mockTabClick}>
        <TabItem tab={mockTab} level={0} />
      </div>
    );
    
    const tabContent = screen.getByTestId('tab-content-1');
    
    // Hover over the tab
    fireEvent.mouseEnter(tabContent);
    
    // Wait for close button to appear
    const closeButton = await screen.findByTestId('close-btn-1');
    
    // Click the close button
    fireEvent.click(closeButton);
    
    // Parent click handler should not be called
    expect(mockTabClick).not.toHaveBeenCalled();
  });

  test('close button has correct accessibility attributes', async () => {
    renderWithDropZoneProvider(<TabItem tab={mockTab} level={0} />);
    
    const tabContent = screen.getByTestId('tab-content-1');
    
    // Hover over the tab
    fireEvent.mouseEnter(tabContent);
    
    // Wait for close button to appear
    const closeButton = await screen.findByTestId('close-btn-1');
    
    // Check accessibility attributes
    expect(closeButton).toHaveAttribute('aria-label', 'Close Test Tab');
    expect(closeButton).toHaveTextContent('×');
  });

  test('favicon fallback on load error', () => {
    renderWithDropZoneProvider(<TabItem tab={mockTab} level={0} />);
    
    const favicon = screen.getByRole('img');
    
    // Trigger error event
    fireEvent.error(favicon);
    
    // Favicon should show fallback image instead of being hidden
    expect(favicon.src).toContain('data:image/svg+xml;base64');
    expect(favicon.style.display).not.toBe('none');
  });

  test('favicon works with invalid URLs', () => {
    const tabWithInvalidUrl = {
      ...mockTab,
      url: 'not-a-valid-url'
    };
    
    renderWithDropZoneProvider(<TabItem tab={tabWithInvalidUrl} level={0} />);
    
    const favicon = screen.getByRole('img');
    expect(favicon).toBeInTheDocument();
    
    // Should use default favicon for invalid URLs
    expect(favicon.src).toContain('data:image/svg+xml');
  });
});