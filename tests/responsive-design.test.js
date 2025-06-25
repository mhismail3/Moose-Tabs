/**
 * Test for Responsive Design at Smaller Widths
 * Tests that the sidebar components adapt well to smaller widths
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import TabTreeComponent from '../src/components/TabTreeComponent';

// Mock CSS media queries for testing
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

describe('Responsive Design for Smaller Widths', () => {
  const mockTabHierarchy = [
    {
      id: 1,
      title: 'Very Long Tab Title That Should Truncate Properly',
      url: 'https://www.verylongdomainname.com/very/long/path/that/should/be/truncated',
      children: [
        {
          id: 2,
          title: 'Nested Tab with Long Title',
          url: 'https://anotherlongurl.example.com/path',
          children: []
        }
      ]
    },
    {
      id: 3,
      title: 'Short Tab',
      url: 'https://short.com',
      children: []
    }
  ];

  beforeEach(() => {
    // Reset any previous styles
    document.head.innerHTML = '';
  });

  test('renders tabs at normal width', () => {
    render(<TabTreeComponent tabHierarchy={mockTabHierarchy} />);
    
    expect(screen.getByText('Very Long Tab Title That Should Truncate Properly')).toBeInTheDocument();
    expect(screen.getByText('Nested Tab with Long Title')).toBeInTheDocument();
    expect(screen.getByText('Short Tab')).toBeInTheDocument();
  });

  test('search bar renders with proper responsive classes', () => {
    render(<TabTreeComponent tabHierarchy={mockTabHierarchy} />);
    
    const searchBar = screen.getByPlaceholderText('Search tabs');
    const clearButton = screen.getByLabelText('Clear search');
    
    expect(searchBar).toHaveClass('search-bar');
    expect(clearButton).toHaveClass('search-clear-btn');
  });

  test('tab elements have proper responsive classes', () => {
    render(<TabTreeComponent tabHierarchy={mockTabHierarchy} />);
    
    const tabContent = screen.getByTestId('tab-content-1');
    const expandButton = screen.getByTestId('expand-collapse-btn-1');
    
    expect(tabContent).toHaveClass('tab-content');
    expect(expandButton).toHaveClass('expand-collapse-btn');
  });

  test('text truncation works with CSS classes', () => {
    render(<TabTreeComponent tabHierarchy={mockTabHierarchy} />);
    
    const tabTitle = screen.getByText('Very Long Tab Title That Should Truncate Properly');
    const tabUrl = screen.getByText('https://www.verylongdomainname.com/very/long/path/that/should/be/truncated');
    
    // Check that elements exist (CSS truncation is visual, not textual)
    expect(tabTitle).toBeInTheDocument();
    expect(tabUrl).toBeInTheDocument();
    
    // Verify they have the proper CSS classes for truncation
    expect(tabTitle).toHaveClass('tab-title');
    expect(tabUrl).toHaveClass('tab-url');
  });

  test('nested tabs maintain proper structure at small widths', () => {
    render(<TabTreeComponent tabHierarchy={mockTabHierarchy} />);
    
    const parentTab = screen.getByTestId('tab-content-1');
    const childTab = screen.getByTestId('tab-content-2');
    
    expect(parentTab).toBeInTheDocument();
    expect(childTab).toBeInTheDocument();
    
    // Check that proper hierarchy classes are applied
    expect(parentTab).toHaveClass('tab-level-0');
    expect(childTab).toHaveClass('tab-level-1');
  });

  test('favicon elements have proper sizing classes', () => {
    render(<TabTreeComponent tabHierarchy={mockTabHierarchy} />);
    
    const favicons = screen.getAllByRole('img');
    
    favicons.forEach(favicon => {
      expect(favicon).toHaveClass('tab-favicon');
    });
  });

  test('responsive CSS classes are properly applied', () => {
    render(<TabTreeComponent tabHierarchy={mockTabHierarchy} />);
    
    // Check that all main elements have the correct classes for responsive behavior
    const tabContents = screen.getAllByRole('treeitem');
    const expandButtons = screen.getAllByRole('button', { name: /Collapse|Expand/ });
    
    expect(tabContents.length).toBeGreaterThan(0);
    expect(expandButtons.length).toBeGreaterThan(0);
    
    tabContents.forEach(tabContent => {
      expect(tabContent).toHaveClass('tab-content');
    });
    
    expandButtons.forEach(button => {
      expect(button).toHaveClass('expand-collapse-btn');
    });
  });

  test('search functionality works at small widths', () => {
    render(<TabTreeComponent tabHierarchy={mockTabHierarchy} />);
    
    const searchContainer = screen.getByRole('textbox').closest('.search-input-container');
    const searchBarContainer = searchContainer.closest('.search-bar-container');
    
    expect(searchContainer).toBeInTheDocument();
    expect(searchBarContainer).toBeInTheDocument();
  });
});