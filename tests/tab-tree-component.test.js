/**
 * Test for Task 2.2: Displaying the Tab Tree
 * TDD Test: Check if TabTreeComponent renders tab hierarchy with correct indentation
 */

import { screen } from '@testing-library/react';
import { renderWithProviders } from './test-utils';
import TabTreeComponent from '../src/components/TabTreeComponent';

// Mock Chrome APIs for testing
global.chrome = {
  runtime: {
    sendMessage: jest.fn(),
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

// Mock tab hierarchy data (matching TabTree.getHierarchy() format)
const mockTabHierarchy = [
  {
    id: 1,
    title: "Google",
    url: "https://google.com",
    windowId: 1,
    children: [
      {
        id: 2,
        title: "Gmail",
        url: "https://gmail.com",
        windowId: 1,
        parentId: 1,
        children: []
      },
      {
        id: 3,
        title: "Google Drive",
        url: "https://drive.google.com",
        windowId: 1,
        parentId: 1,
        children: [
          {
            id: 4,
            title: "Document 1",
            url: "https://docs.google.com/document/1",
            windowId: 1,
            parentId: 3,
            children: []
          }
        ]
      }
    ]
  },
  {
    id: 5,
    title: "GitHub",
    url: "https://github.com",
    windowId: 1,
    children: []
  }
];

describe('TabTreeComponent', () => {
  test('renders tab hierarchy with correct structure', () => {
    renderWithProviders(<TabTreeComponent tabHierarchy={mockTabHierarchy} />);
    
    // Check that root tabs are rendered
    expect(screen.getByText('Google')).toBeInTheDocument();
    expect(screen.getByText('GitHub')).toBeInTheDocument();
    
    // Check that child tabs are rendered
    expect(screen.getByText('Gmail')).toBeInTheDocument();
    expect(screen.getByText('Google Drive')).toBeInTheDocument();
    expect(screen.getByText('Document 1')).toBeInTheDocument();
  });

  test('renders tabs with proper indentation levels', () => {
    renderWithProviders(<TabTreeComponent tabHierarchy={mockTabHierarchy} />);
    
    // Get tab elements and check their indentation classes
    const googleTab = screen.getByTestId('tab-content-1');
    const gmailTab = screen.getByTestId('tab-content-2');
    const driveTab = screen.getByTestId('tab-content-3');
    const documentTab = screen.getByTestId('tab-content-4');
    const githubTab = screen.getByTestId('tab-content-5');
    
    // Root tabs should have level 0
    expect(googleTab).toHaveClass('tab-level-0');
    expect(githubTab).toHaveClass('tab-level-0');
    
    // First level children should have level 1
    expect(gmailTab).toHaveClass('tab-level-1');
    expect(driveTab).toHaveClass('tab-level-1');
    
    // Second level children should have level 2
    expect(documentTab).toHaveClass('tab-level-2');
  });

  test('renders empty state when no tabs provided', () => {
    renderWithProviders(<TabTreeComponent tabHierarchy={[]} />);
    
    const emptyMessage = screen.getByText(/no tabs/i);
    expect(emptyMessage).toBeInTheDocument();
  });

  test('displays tab titles and URLs correctly', () => {
    renderWithProviders(<TabTreeComponent tabHierarchy={mockTabHierarchy} />);
    
    // Check that titles are displayed
    expect(screen.getByText('Google')).toBeInTheDocument();
    expect(screen.getByText('Gmail')).toBeInTheDocument();
    
    // Check that URLs are displayed (using exact URLs to avoid duplicates)
    expect(screen.getByText('https://google.com')).toBeInTheDocument();
    expect(screen.getByText('https://gmail.com')).toBeInTheDocument();
  });

  test('renders component with proper tree structure classes', () => {
    renderWithProviders(<TabTreeComponent tabHierarchy={mockTabHierarchy} />);
    
    const treeContainer = screen.getByTestId('tab-tree-container');
    expect(treeContainer).toBeInTheDocument();
    expect(treeContainer).toHaveClass('tab-tree');
  });
});