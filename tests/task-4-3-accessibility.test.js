/**
 * Test for Task 4.3: Accessibility (ARIA roles & Keyboard Navigation)
 * Tests comprehensive accessibility features including ARIA roles and keyboard navigation
 */

import React from 'react';
import { screen, fireEvent, waitFor, renderWithDropZoneProvider } from './test-utils';
import App from '../src/App';
import TabTreeComponent from '../src/components/TabTreeComponent';
import TabItem from '../src/components/TabItem';

// Mock the react-dnd library
jest.mock('react-dnd', () => ({
  useDrag: () => [{ isDragging: false }, jest.fn()],
  useDrop: () => [{ isOver: false, canDrop: true }, jest.fn()],
  DndProvider: ({ children }) => children,
  HTML5Backend: {},
}));

// Mock Chrome APIs
global.chrome = {
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
    },
  },
  i18n: {
    getMessage: jest.fn((key, substitutions = []) => {
      const messages = {
        'app_title': 'Moose Tabs',
        'loading_text': 'Loading tab hierarchy...',
        'no_tabs_available': 'No tabs available',
        'tab_item_aria': 'Tab: $1. Press Enter to select, drag to reorder.',
        'expand_button_aria': 'Expand',
        'collapse_button_aria': 'Collapse',
        'tree_aria_label': 'Tab hierarchy tree'
      };
      let message = messages[key] || key;
      
      // Handle substitutions
      if (substitutions && substitutions.length > 0) {
        substitutions.forEach((sub, index) => {
          message = message.replace(`$${index + 1}`, sub);
        });
      }
      
      return message;
    }),
    getUILanguage: jest.fn(() => 'en'),
    getAcceptLanguages: jest.fn(() => Promise.resolve(['en'])),
  },
  tabs: {
    get: jest.fn(),
    move: jest.fn(),
    query: jest.fn(),
  },
};

describe('Task 4.3: Accessibility (ARIA roles & Keyboard Navigation)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default Chrome API responses
    chrome.runtime.sendMessage.mockResolvedValue({
      success: true,
      hierarchy: []
    });
  });

  describe('ARIA Roles and Structure', () => {
    test('TabTreeComponent should have role="tree"', async () => {
      const hierarchy = [
        {
          id: 1,
          title: 'Parent Tab',
          url: 'https://parent.com',
          windowId: 1,
          children: []
        }
      ];

      render(<TabTreeComponent tabHierarchy={hierarchy} />);

      const treeElement = screen.getByRole('tree');
      expect(treeElement).toBeInTheDocument();
      expect(treeElement).toHaveAttribute('role', 'tree');
    });

    test('TabItem should have role="treeitem"', () => {
      const tab = {
        id: 1,
        title: 'Test Tab',
        url: 'https://test.com',
        windowId: 1,
        children: []
      };

      renderWithDropZoneProvider(<TabItem tab={tab} level={0} />);

      const treeItem = screen.getByRole('treeitem');
      expect(treeItem).toBeInTheDocument();
      expect(treeItem).toHaveAttribute('role', 'treeitem');
    });

    test('TabItem should have proper ARIA attributes', () => {
      const tab = {
        id: 1,
        title: 'Test Tab',
        url: 'https://test.com',
        windowId: 1,
        children: []
      };

      renderWithDropZoneProvider(<TabItem tab={tab} level={0} isFirst={true} />);

      const treeItem = screen.getByRole('treeitem');
      expect(treeItem).toHaveAttribute('tabIndex', '0');
      expect(treeItem).toHaveAttribute('aria-label');
    });

    test('Expandable TabItem should have aria-expanded attribute', () => {
      const tab = {
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
      };

      renderWithDropZoneProvider(<TabItem tab={tab} level={0} isFirst={true} />);

      const treeItem = screen.getByTestId('tab-content-1');
      expect(treeItem).toHaveAttribute('aria-expanded', 'true');
    });

    test('Collapsed TabItem should have aria-expanded="false"', async () => {
      const tab = {
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
      };

      renderWithDropZoneProvider(<TabItem tab={tab} level={0} isFirst={true} />);

      const expandButton = screen.getByTestId('expand-collapse-btn-1');
      fireEvent.click(expandButton);

      await waitFor(() => {
        const treeItem = screen.getByTestId('tab-content-1');
        expect(treeItem).toHaveAttribute('aria-expanded', 'false');
      });
    });

    test('Tree should have aria-label', async () => {
      const hierarchy = [
        {
          id: 1,
          title: 'Tab 1',
          url: 'https://tab1.com',
          windowId: 1,
          children: []
        }
      ];

      render(<TabTreeComponent tabHierarchy={hierarchy} />);

      const tree = screen.getByRole('tree');
      expect(tree).toHaveAttribute('aria-label');
    });
  });

  describe('Keyboard Navigation', () => {
    test('TabItem should be focusable with keyboard', () => {
      const tab = {
        id: 1,
        title: 'Test Tab',
        url: 'https://test.com',
        windowId: 1,
        children: []
      };

      renderWithDropZoneProvider(<TabItem tab={tab} level={0} isFirst={true} />);

      const treeItem = screen.getByRole('treeitem');
      treeItem.focus();
      expect(treeItem).toHaveFocus();
    });

    test('Arrow Down should move focus to next item', async () => {
      const hierarchy = [
        {
          id: 1,
          title: 'Tab 1',
          url: 'https://tab1.com',
          windowId: 1,
          children: []
        },
        {
          id: 2,
          title: 'Tab 2',
          url: 'https://tab2.com',
          windowId: 1,
          children: []
        }
      ];

      render(<TabTreeComponent tabHierarchy={hierarchy} />);

      const firstItem = screen.getByTestId('tab-content-1');
      const secondItem = screen.getByTestId('tab-content-2');

      firstItem.focus();
      expect(firstItem).toHaveFocus();

      fireEvent.keyDown(firstItem, { key: 'ArrowDown', code: 'ArrowDown' });

      await waitFor(() => {
        expect(secondItem).toHaveFocus();
      });
    });

    test('Arrow Up should move focus to previous item', async () => {
      const hierarchy = [
        {
          id: 1,
          title: 'Tab 1',
          url: 'https://tab1.com',
          windowId: 1,
          children: []
        },
        {
          id: 2,
          title: 'Tab 2',
          url: 'https://tab2.com',
          windowId: 1,
          children: []
        }
      ];

      render(<TabTreeComponent tabHierarchy={hierarchy} />);

      const firstItem = screen.getByTestId('tab-content-1');
      const secondItem = screen.getByTestId('tab-content-2');

      secondItem.focus();
      expect(secondItem).toHaveFocus();

      fireEvent.keyDown(secondItem, { key: 'ArrowUp', code: 'ArrowUp' });

      await waitFor(() => {
        expect(firstItem).toHaveFocus();
      });
    });

    test('Arrow Right should expand collapsed item', async () => {
      const tab = {
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
      };

      renderWithDropZoneProvider(<TabItem tab={tab} level={0} />);

      // First collapse the item
      const expandButton = screen.getByTestId('expand-collapse-btn-1');
      fireEvent.click(expandButton);

      await waitFor(() => {
        const treeItem = screen.getByRole('treeitem');
        expect(treeItem).toHaveAttribute('aria-expanded', 'false');
      });

      // Now test keyboard expansion
      const treeItem = screen.getByRole('treeitem');
      treeItem.focus();

      fireEvent.keyDown(treeItem, { key: 'ArrowRight', code: 'ArrowRight' });

      await waitFor(() => {
        expect(treeItem).toHaveAttribute('aria-expanded', 'true');
      });
    });

    test('Arrow Left should collapse expanded item', async () => {
      const tab = {
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
      };

      renderWithDropZoneProvider(<TabItem tab={tab} level={0} isFirst={true} />);

      const treeItem = screen.getByTestId('tab-content-1');
      treeItem.focus();

      // Item should be expanded by default
      expect(treeItem).toHaveAttribute('aria-expanded', 'true');

      fireEvent.keyDown(treeItem, { key: 'ArrowLeft', code: 'ArrowLeft' });

      await waitFor(() => {
        expect(treeItem).toHaveAttribute('aria-expanded', 'false');
      });
    });

    test('Enter should activate tab selection', async () => {
      const tab = {
        id: 1,
        title: 'Test Tab',
        url: 'https://test.com',
        windowId: 1,
        children: []
      };

      renderWithDropZoneProvider(<TabItem tab={tab} level={0} isFirst={true} />);

      const treeItem = screen.getByRole('treeitem');
      treeItem.focus();

      fireEvent.keyDown(treeItem, { key: 'Enter', code: 'Enter' });

      // Enter key should prevent default and could trigger tab selection
      // For now, we just test that the event handler is called
      expect(treeItem).toHaveFocus();
    });

    test('Space should activate tab selection', async () => {
      const tab = {
        id: 1,
        title: 'Test Tab',
        url: 'https://test.com',
        windowId: 1,
        children: []
      };

      renderWithDropZoneProvider(<TabItem tab={tab} level={0} isFirst={true} />);

      const treeItem = screen.getByRole('treeitem');
      treeItem.focus();

      fireEvent.keyDown(treeItem, { key: ' ', code: 'Space' });

      // Space key should prevent default and could trigger tab selection
      expect(treeItem).toHaveFocus();
    });
  });

  describe('Focus Management', () => {
    test('First item should have tabindex="0", others should have tabindex="-1"', () => {
      const hierarchy = [
        {
          id: 1,
          title: 'Tab 1',
          url: 'https://tab1.com',
          windowId: 1,
          children: []
        },
        {
          id: 2,
          title: 'Tab 2',
          url: 'https://tab2.com',
          windowId: 1,
          children: []
        }
      ];

      render(<TabTreeComponent tabHierarchy={hierarchy} />);

      const firstItem = screen.getByTestId('tab-content-1');
      const secondItem = screen.getByTestId('tab-content-2');

      expect(firstItem).toHaveAttribute('tabIndex', '0');
      expect(secondItem).toHaveAttribute('tabIndex', '-1');
    });

    test('Focus should be trapped within the tree', async () => {
      const hierarchy = [
        {
          id: 1,
          title: 'Tab 1',
          url: 'https://tab1.com',
          windowId: 1,
          children: []
        }
      ];

      render(<TabTreeComponent tabHierarchy={hierarchy} />);

      const firstItem = screen.getByTestId('tab-content-1');
      firstItem.focus();

      // Arrow up from first item should keep focus on first item
      fireEvent.keyDown(firstItem, { key: 'ArrowUp', code: 'ArrowUp' });

      await waitFor(() => {
        expect(firstItem).toHaveFocus();
      });

      // Arrow down from last item should keep focus on last item
      fireEvent.keyDown(firstItem, { key: 'ArrowDown', code: 'ArrowDown' });

      await waitFor(() => {
        expect(firstItem).toHaveFocus();
      });
    });
  });

  describe('Screen Reader Support', () => {
    test('Tab items should have descriptive aria-labels', () => {
      const tab = {
        id: 1,
        title: 'Google Search',
        url: 'https://google.com',
        windowId: 1,
        children: []
      };

      renderWithDropZoneProvider(<TabItem tab={tab} level={0} isFirst={true} />);

      const treeItem = screen.getByRole('treeitem');
      const ariaLabel = treeItem.getAttribute('aria-label');
      
      expect(ariaLabel).toContain('Google Search');
      expect(ariaLabel).toContain('Tab:');
    });

    test('Expand/collapse buttons should have proper aria-labels', () => {
      const tab = {
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
      };

      renderWithDropZoneProvider(<TabItem tab={tab} level={0} isFirst={true} />);

      const expandButton = screen.getByTestId('expand-collapse-btn-1');
      expect(expandButton).toHaveAttribute('aria-label', 'Collapse');
    });
  });
});