/**
 * Test for "No tabs available" issue fix
 * Tests that the extension properly handles service worker suspension/restart scenarios
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../src/App';

// Mock Chrome APIs
global.chrome = {
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    }
  },
  i18n: {
    getMessage: jest.fn((key, substitutions = []) => {
      const messages = {
        'app_title': 'Moose Tabs',
        'loading_text': 'Loading tab hierarchy...',
        'no_tabs_available': 'No tabs available',
        'refresh_button': 'Refresh',
        'error_retry_button': 'Retry'
      };
      return messages[key] || key;
    }),
    getUILanguage: jest.fn(() => 'en'),
    getAcceptLanguages: jest.fn(() => Promise.resolve(['en']))
  }
};

describe('No Tabs Available Issue Fix', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('shows refresh button when no tabs are available', async () => {
    // Mock empty hierarchy response
    chrome.runtime.sendMessage.mockResolvedValue({
      success: true,
      hierarchy: []
    });

    render(<App />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading tab hierarchy...')).not.toBeInTheDocument();
    });

    // Should show no tabs message with refresh button
    expect(screen.getByText('No tabs available')).toBeInTheDocument();
    expect(screen.getByText('Refresh')).toBeInTheDocument();
  });

  test('refresh button reloads the page', async () => {
    // Mock empty hierarchy response
    chrome.runtime.sendMessage.mockResolvedValue({
      success: true,
      hierarchy: []
    });

    // Mock window.location.reload
    const mockReload = jest.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: mockReload },
      writable: true
    });

    render(<App />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading tab hierarchy...')).not.toBeInTheDocument();
    });

    // Click the refresh button
    const refreshButton = screen.getByText('Refresh');
    fireEvent.click(refreshButton);

    // Should have called window.location.reload
    expect(mockReload).toHaveBeenCalled();
  });

  test('shows normal hierarchy when tabs are available', async () => {
    // Mock hierarchy with tabs
    const hierarchy = [
      {
        id: 1,
        title: 'Test Tab',
        url: 'https://test.com',
        windowId: 1,
        children: []
      }
    ];

    chrome.runtime.sendMessage.mockResolvedValue({
      success: true,
      hierarchy: hierarchy
    });

    render(<App />);

    // Wait for hierarchy to load
    await waitFor(() => {
      expect(screen.getByText('Test Tab')).toBeInTheDocument();
    });

    // Should not show no tabs message
    expect(screen.queryByText('No tabs available')).not.toBeInTheDocument();
    expect(screen.queryByText('Refresh')).not.toBeInTheDocument();
  });

  test('handles error state with retry button', async () => {
    // Mock error response
    chrome.runtime.sendMessage.mockRejectedValue(new Error('Connection failed'));

    render(<App />);

    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByText(/Error:/)).toBeInTheDocument();
    });

    // Should show retry button
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  test('notifies background script when sidebar becomes active', async () => {
    chrome.runtime.sendMessage.mockResolvedValue({
      success: true,
      hierarchy: []
    });

    render(<App />);

    // Should have sent sidebarActive message
    await waitFor(() => {
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        action: 'sidebarActive',
        timestamp: expect.any(Number)
      });
    });
  });

  test('polls for updates when message passing fails', async () => {
    // First call succeeds, subsequent calls for polling also succeed
    chrome.runtime.sendMessage.mockResolvedValue({
      success: true,
      hierarchy: []
    });

    render(<App />);

    // Advance timers to trigger polling
    jest.advanceTimersByTime(1000);

    // Should have called sendMessage multiple times (sidebarActive + getTabHierarchy + poll)
    await waitFor(() => {
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        action: 'getTabHierarchy'
      });
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        action: 'sidebarActive',
        timestamp: expect.any(Number)
      });
      // Should be called at least 3 times due to polling
      expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(3);
    });
  });
});