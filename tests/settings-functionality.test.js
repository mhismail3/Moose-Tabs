// Settings Functionality Tests
// These tests verify that all settings properly affect the extension behavior

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

// Mock Chrome APIs first
global.chrome = {
  runtime: {
    sendMessage: jest.fn(() => Promise.resolve({ success: true })),
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    }
  },
  storage: {
    local: {
      get: jest.fn(() => Promise.resolve({})),
      set: jest.fn(() => Promise.resolve())
    }
  }
};

// Mock all the hooks and components that components depend on
jest.mock('../src/components/hooks/useDragDrop', () => ({
  useDragDrop: () => ({
    isDragging: false,
    isOver: false,
    canDrop: false,
    showInvalid: false,
    dropZoneType: null,
    dragDropRef: { current: null }
  })
}));

jest.mock('../src/components/hooks/useKeyboardNavigation', () => ({
  useKeyboardNavigation: () => ({
    handleKeyDown: jest.fn()
  })
}));

jest.mock('../src/components/hooks/useTabAnimations', () => ({
  useTabAnimations: () => ({
    subscribe: jest.fn(() => () => {}),
    isAnimating: jest.fn(() => false)
  })
}));

jest.mock('../src/utils/i18n', () => ({
  getMessage: jest.fn((key, params, fallback) => fallback || key),
  getTabItemAriaLabel: jest.fn((title) => `Tab: ${title}`)
}));

jest.mock('../src/utils/settings', () => ({
  getSettings: jest.fn(() => Promise.resolve({})),
  getSetting: jest.fn(() => Promise.resolve(true)),
  updateSetting: jest.fn(() => Promise.resolve()),
  saveSettings: jest.fn(() => Promise.resolve())
}));

// Mock the contexts
jest.mock('../src/contexts/SettingsContext', () => ({
  SettingsProvider: ({ children }) => children,
  useSettings: jest.fn()
}));

jest.mock('../src/components/tutorial/TutorialContext', () => ({
  TutorialProvider: ({ children }) => children,
  useTutorial: () => ({
    isActive: false,
    currentStep: 0,
    nextStep: jest.fn(),
    previousStep: jest.fn(),
    skipTutorial: jest.fn()
  })
}));

jest.mock('../src/components/context/DropZoneContext', () => ({
  DropZoneProvider: ({ children }) => children
}));

// Import components after mocking
import TabItem from '../src/components/TabItem';
import TabTreeComponent from '../src/components/TabTreeComponent';
import { useSettings } from '../src/contexts/SettingsContext';

describe('Appearance Settings', () => {
  const mockTab = {
    id: 1,
    title: 'Test Tab',
    url: 'https://example.com',
    windowId: 1,
    index: 0,
    children: []
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Show Tab URLs Setting', () => {
    test('shows URLs when setting is enabled', () => {
      useSettings.mockReturnValue({
        settings: {
          appearance: { showTabUrls: true, showFavicons: true },
          tabManagement: { defaultExpandState: 'expanded', confirmTabClose: false }
        },
        loading: false,
        error: null
      });
      
      render(<TabItem tab={mockTab} />);

      expect(screen.getByText('https://example.com')).toBeInTheDocument();
    });

    test('hides URLs when setting is disabled', () => {
      useSettings.mockReturnValue({
        settings: {
          appearance: { showTabUrls: false, showFavicons: true },
          tabManagement: { defaultExpandState: 'expanded', confirmTabClose: false }
        },
        loading: false,
        error: null
      });
      
      render(<TabItem tab={mockTab} />);

      expect(screen.queryByText('https://example.com')).not.toBeInTheDocument();
    });
  });

  describe('Show Favicons Setting', () => {
    test('shows favicons when setting is enabled', () => {
      useSettings.mockReturnValue({
        settings: {
          appearance: { showTabUrls: true, showFavicons: true },
          tabManagement: { defaultExpandState: 'expanded', confirmTabClose: false }
        },
        loading: false,
        error: null
      });
      
      render(<TabItem tab={mockTab} />);

      expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument();
    });

    test('hides favicons when setting is disabled', () => {
      useSettings.mockReturnValue({
        settings: {
          appearance: { showTabUrls: true, showFavicons: false },
          tabManagement: { defaultExpandState: 'expanded', confirmTabClose: false }
        },
        loading: false,
        error: null
      });
      
      render(<TabItem tab={mockTab} />);

      expect(screen.queryByRole('img', { hidden: true })).not.toBeInTheDocument();
    });
  });

  describe('View Density Setting', () => {
    test('applies compact view density class', () => {
      useSettings.mockReturnValue({
        settings: {
          appearance: { viewDensity: 'compact' },
          search: { caseSensitive: false, searchInUrls: true },
          accessibility: { highContrast: false }
        },
        loading: false,
        error: null
      });
      
      render(<TabTreeComponent tabHierarchy={[mockTab]} />);

      expect(screen.getByRole('tree')).toHaveClass('view-density-compact');
    });

    test('applies normal view density class', () => {
      useSettings.mockReturnValue({
        settings: {
          appearance: { viewDensity: 'normal' },
          search: { caseSensitive: false, searchInUrls: true },
          accessibility: { highContrast: false }
        },
        loading: false,
        error: null
      });
      
      render(<TabTreeComponent tabHierarchy={[mockTab]} />);

      expect(screen.getByRole('tree')).toHaveClass('view-density-normal');
    });

    test('applies comfortable view density class', () => {
      useSettings.mockReturnValue({
        settings: {
          appearance: { viewDensity: 'comfortable' },
          search: { caseSensitive: false, searchInUrls: true },
          accessibility: { highContrast: false }
        },
        loading: false,
        error: null
      });
      
      render(<TabTreeComponent tabHierarchy={[mockTab]} />);

      expect(screen.getByRole('tree')).toHaveClass('view-density-comfortable');
    });
  });

  describe('Reduced Motion Setting', () => {
    test('applies reduced motion class when enabled', () => {
      useSettings.mockReturnValue({
        settings: {
          appearance: { reducedMotion: true },
          search: { caseSensitive: false, searchInUrls: true },
          accessibility: { highContrast: false }
        },
        loading: false,
        error: null
      });
      
      render(<TabTreeComponent tabHierarchy={[mockTab]} />);

      expect(screen.getByRole('tree')).toHaveClass('reduced-motion');
    });

    test('does not apply reduced motion class when disabled', () => {
      useSettings.mockReturnValue({
        settings: {
          appearance: { reducedMotion: false },
          search: { caseSensitive: false, searchInUrls: true },
          accessibility: { highContrast: false }
        },
        loading: false,
        error: null
      });
      
      render(<TabTreeComponent tabHierarchy={[mockTab]} />);

      expect(screen.getByRole('tree')).not.toHaveClass('reduced-motion');
    });
  });
});

describe('Tab Management Settings', () => {
  const mockParentTab = {
    id: 1,
    title: 'Parent Tab',
    url: 'https://parent.com',
    windowId: 1,
    index: 0,
    children: [
      {
        id: 2,
        title: 'Child Tab',
        url: 'https://child.com',
        windowId: 1,
        index: 1,
        children: []
      }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Default Expand State Setting', () => {
    test('starts expanded when setting is "expanded"', () => {
      useSettings.mockReturnValue({
        settings: {
          tabManagement: { defaultExpandState: 'expanded', confirmTabClose: false },
          appearance: { showTabUrls: true, showFavicons: true }
        },
        loading: false,
        error: null
      });
      
      render(<TabItem tab={mockParentTab} />);

      // Should show child tab
      expect(screen.getByText('Child Tab')).toBeInTheDocument();
    });

    test('starts collapsed when setting is "collapsed"', () => {
      useSettings.mockReturnValue({
        settings: {
          tabManagement: { defaultExpandState: 'collapsed', confirmTabClose: false },
          appearance: { showTabUrls: true, showFavicons: true }
        },
        loading: false,
        error: null
      });
      
      render(<TabItem tab={mockParentTab} />);

      // Should not show child tab initially
      expect(screen.queryByText('Child Tab')).not.toBeInTheDocument();
    });
  });

  describe('Confirm Tab Close Setting', () => {
    beforeEach(() => {
      global.confirm = jest.fn();
    });

    test('shows confirmation when enabled', () => {
      useSettings.mockReturnValue({
        settings: {
          tabManagement: { defaultExpandState: 'expanded', confirmTabClose: true },
          appearance: { showTabUrls: true, showFavicons: true }
        },
        loading: false,
        error: null
      });
      global.confirm.mockReturnValue(true);
      
      render(<TabItem tab={mockParentTab} />);

      // Hover to show close button, then click it
      const tabContent = screen.getByTestId('tab-content-1');
      fireEvent.mouseEnter(tabContent);
      
      const closeButton = screen.getByLabelText(/Close Parent Tab/);
      fireEvent.click(closeButton);

      expect(global.confirm).toHaveBeenCalledWith('Close tab "Parent Tab"?');
    });

    test('does not show confirmation when disabled', () => {
      useSettings.mockReturnValue({
        settings: {
          tabManagement: { defaultExpandState: 'expanded', confirmTabClose: false },
          appearance: { showTabUrls: true, showFavicons: true }
        },
        loading: false,
        error: null
      });
      
      render(<TabItem tab={mockParentTab} />);

      // Hover to show close button, then click it
      const tabContent = screen.getByTestId('tab-content-1');
      fireEvent.mouseEnter(tabContent);
      
      const closeButton = screen.getByLabelText(/Close Parent Tab/);
      fireEvent.click(closeButton);

      expect(global.confirm).not.toHaveBeenCalled();
    });
  });
});

describe('Search Settings', () => {
  const mockTabs = [
    {
      id: 1,
      title: 'Google Search',
      url: 'https://google.com',
      windowId: 1,
      index: 0,
      children: []
    },
    {
      id: 2,
      title: 'GitHub Repo',
      url: 'https://github.com/user/repo',
      windowId: 1,
      index: 1,
      children: []
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Case Sensitive Search', () => {
    test('performs case-sensitive search when enabled', async () => {
      useSettings.mockReturnValue({
        settings: {
          search: { caseSensitive: true, searchInUrls: true },
          appearance: { viewDensity: 'normal', reducedMotion: false },
          accessibility: { highContrast: false }
        },
        loading: false,
        error: null
      });
      
      render(<TabTreeComponent tabHierarchy={mockTabs} />);

      const searchInput = screen.getByPlaceholderText('Search tabs');
      fireEvent.change(searchInput, { target: { value: 'Google' } });

      await waitFor(() => {
        expect(screen.getByText('Google Search')).toBeInTheDocument();
        expect(screen.queryByText('GitHub Repo')).not.toBeInTheDocument();
      });
    });

    test('performs case-insensitive search when disabled', async () => {
      useSettings.mockReturnValue({
        settings: {
          search: { caseSensitive: false, searchInUrls: true },
          appearance: { viewDensity: 'normal', reducedMotion: false },
          accessibility: { highContrast: false }
        },
        loading: false,
        error: null
      });
      
      render(<TabTreeComponent tabHierarchy={mockTabs} />);

      const searchInput = screen.getByPlaceholderText('Search tabs');
      fireEvent.change(searchInput, { target: { value: 'google' } });

      await waitFor(() => {
        expect(screen.getByText('Google Search')).toBeInTheDocument();
        expect(screen.queryByText('GitHub Repo')).not.toBeInTheDocument();
      });
    });
  });

  describe('Search In URLs Setting', () => {
    test('includes URLs in search when enabled', async () => {
      useSettings.mockReturnValue({
        settings: {
          search: { caseSensitive: false, searchInUrls: true },
          appearance: { viewDensity: 'normal', reducedMotion: false },
          accessibility: { highContrast: false }
        },
        loading: false,
        error: null
      });
      
      render(<TabTreeComponent tabHierarchy={mockTabs} />);

      const searchInput = screen.getByPlaceholderText('Search tabs');
      fireEvent.change(searchInput, { target: { value: 'github.com' } });

      await waitFor(() => {
        expect(screen.getByText('GitHub Repo')).toBeInTheDocument();
        expect(screen.queryByText('Google Search')).not.toBeInTheDocument();
      });
    });

    test('excludes URLs from search when disabled', async () => {
      useSettings.mockReturnValue({
        settings: {
          search: { caseSensitive: false, searchInUrls: false },
          appearance: { viewDensity: 'normal', reducedMotion: false },
          accessibility: { highContrast: false }
        },
        loading: false,
        error: null
      });
      
      render(<TabTreeComponent tabHierarchy={mockTabs} />);

      const searchInput = screen.getByPlaceholderText('Search tabs');
      fireEvent.change(searchInput, { target: { value: 'github.com' } });

      await waitFor(() => {
        // Should show "No tabs match your search" message
        expect(screen.getByText('No tabs match your search')).toBeInTheDocument();
      });
    });
  });
});

describe('Accessibility Settings', () => {
  const mockTab = {
    id: 1,
    title: 'Test Tab',
    url: 'https://example.com',
    windowId: 1,
    index: 0,
    children: []
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('High Contrast Mode', () => {
    test('applies high contrast class when enabled', () => {
      useSettings.mockReturnValue({
        settings: {
          accessibility: { highContrast: true },
          appearance: { viewDensity: 'normal', reducedMotion: false },
          search: { caseSensitive: false, searchInUrls: true }
        },
        loading: false,
        error: null
      });
      
      render(<TabTreeComponent tabHierarchy={[mockTab]} />);

      expect(screen.getByRole('tree')).toHaveClass('high-contrast');
    });

    test('does not apply high contrast class when disabled', () => {
      useSettings.mockReturnValue({
        settings: {
          accessibility: { highContrast: false },
          appearance: { viewDensity: 'normal', reducedMotion: false },
          search: { caseSensitive: false, searchInUrls: true }
        },
        loading: false,
        error: null
      });
      
      render(<TabTreeComponent tabHierarchy={[mockTab]} />);

      expect(screen.getByRole('tree')).not.toHaveClass('high-contrast');
    });
  });
});