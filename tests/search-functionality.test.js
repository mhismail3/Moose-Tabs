/**
 * Test for Search Functionality
 * Tests the search bar with fuzzy matching for tab titles and URLs
 */

import React from 'react';
import { screen, fireEvent, renderWithProviders } from './test-utils';
import TabTreeComponent from '../src/components/TabTreeComponent';

describe('Search Functionality', () => {
  const mockTabHierarchy = [
    {
      id: 1,
      title: 'Google Search',
      url: 'https://www.google.com/search?q=react',
      children: [
        {
          id: 2,
          title: 'React Documentation',
          url: 'https://reactjs.org/docs',
          children: []
        }
      ]
    },
    {
      id: 3,
      title: 'GitHub Repository',
      url: 'https://github.com/facebook/react',
      children: []
    },
    {
      id: 4,
      title: 'Stack Overflow',
      url: 'https://stackoverflow.com/questions/tagged/reactjs',
      children: []
    }
  ];

  test('renders search bar', () => {
    renderWithProviders(<TabTreeComponent tabHierarchy={mockTabHierarchy} />);
    
    const searchBar = screen.getByPlaceholderText('Search tabs');
    expect(searchBar).toBeInTheDocument();
    expect(searchBar).toHaveAttribute('aria-label', 'Search tabs');
  });

  test('renders search bar even when no tabs available', () => {
    renderWithProviders(<TabTreeComponent tabHierarchy={[]} />);
    
    const searchBar = screen.getByPlaceholderText('Search tabs');
    expect(searchBar).toBeInTheDocument();
    
    const emptyState = screen.getByText('No tabs available');
    expect(emptyState).toBeInTheDocument();
  });

  test('filters tabs by title using fuzzy matching', () => {
    renderWithProviders(<TabTreeComponent tabHierarchy={mockTabHierarchy} />);
    
    // Initially all tabs should be visible
    expect(screen.getByText('Google Search')).toBeInTheDocument();
    expect(screen.getByText('GitHub Repository')).toBeInTheDocument();
    expect(screen.getByText('Stack Overflow')).toBeInTheDocument();
    
    const searchBar = screen.getByPlaceholderText('Search tabs');
    
    // Search for "git" - should match "GitHub Repository"
    fireEvent.change(searchBar, { target: { value: 'git' } });
    
    expect(screen.queryByText('Google Search')).not.toBeInTheDocument();
    expect(screen.getByText('GitHub Repository')).toBeInTheDocument();
    expect(screen.queryByText('Stack Overflow')).not.toBeInTheDocument();
  });

  test('filters tabs by URL using fuzzy matching', () => {
    renderWithProviders(<TabTreeComponent tabHierarchy={mockTabHierarchy} />);
    
    const searchBar = screen.getByPlaceholderText('Search tabs');
    
    // Search for "stackoverflow" - should match by URL
    fireEvent.change(searchBar, { target: { value: 'stackoverflow' } });
    
    expect(screen.queryByText('Google Search')).not.toBeInTheDocument();
    expect(screen.queryByText('GitHub Repository')).not.toBeInTheDocument();
    expect(screen.getByText('Stack Overflow')).toBeInTheDocument();
  });

  test('fuzzy matching works with partial characters', () => {
    renderWithProviders(<TabTreeComponent tabHierarchy={mockTabHierarchy} />);
    
    const searchBar = screen.getByPlaceholderText('Search tabs');
    
    // Search for "ggl" - should fuzzy match "Google"
    fireEvent.change(searchBar, { target: { value: 'ggl' } });
    
    expect(screen.getByText('Google Search')).toBeInTheDocument();
    expect(screen.queryByText('GitHub Repository')).not.toBeInTheDocument();
    expect(screen.queryByText('Stack Overflow')).not.toBeInTheDocument();
  });

  test('includes parent when child matches search', () => {
    renderWithProviders(<TabTreeComponent tabHierarchy={mockTabHierarchy} />);
    
    const searchBar = screen.getByPlaceholderText('Search tabs');
    
    // Search for "documentation" - should match child and include parent
    fireEvent.change(searchBar, { target: { value: 'documentation' } });
    
    expect(screen.getByText('Google Search')).toBeInTheDocument(); // Parent included
    expect(screen.getByText('React Documentation')).toBeInTheDocument(); // Child matches
    expect(screen.queryByText('GitHub Repository')).not.toBeInTheDocument();
    expect(screen.queryByText('Stack Overflow')).not.toBeInTheDocument();
  });

  test('shows "no matches" message when search has no results', () => {
    renderWithProviders(<TabTreeComponent tabHierarchy={mockTabHierarchy} />);
    
    const searchBar = screen.getByPlaceholderText('Search tabs');
    
    // Search for something that won't match
    fireEvent.change(searchBar, { target: { value: 'xyznomatch' } });
    
    expect(screen.getByText('No tabs match your search')).toBeInTheDocument();
    expect(screen.queryByText('Google Search')).not.toBeInTheDocument();
    expect(screen.queryByText('GitHub Repository')).not.toBeInTheDocument();
    expect(screen.queryByText('Stack Overflow')).not.toBeInTheDocument();
  });

  test('clearing search shows all tabs again', () => {
    renderWithProviders(<TabTreeComponent tabHierarchy={mockTabHierarchy} />);
    
    const searchBar = screen.getByPlaceholderText('Search tabs');
    
    // Search for something specific
    fireEvent.change(searchBar, { target: { value: 'git' } });
    expect(screen.queryByText('Google Search')).not.toBeInTheDocument();
    
    // Clear search
    fireEvent.change(searchBar, { target: { value: '' } });
    
    // All tabs should be visible again
    expect(screen.getByText('Google Search')).toBeInTheDocument();
    expect(screen.getByText('GitHub Repository')).toBeInTheDocument();
    expect(screen.getByText('Stack Overflow')).toBeInTheDocument();
  });

  test('search is case insensitive', () => {
    renderWithProviders(<TabTreeComponent tabHierarchy={mockTabHierarchy} />);
    
    const searchBar = screen.getByPlaceholderText('Search tabs');
    
    // Search with uppercase
    fireEvent.change(searchBar, { target: { value: 'GOOGLE' } });
    
    expect(screen.getByText('Google Search')).toBeInTheDocument();
    expect(screen.queryByText('GitHub Repository')).not.toBeInTheDocument();
    expect(screen.queryByText('Stack Overflow')).not.toBeInTheDocument();
  });

  test('clear button appears when search has text', () => {
    renderWithProviders(<TabTreeComponent tabHierarchy={mockTabHierarchy} />);
    
    const searchBar = screen.getByPlaceholderText('Search tabs');
    const clearButton = screen.getByLabelText('Clear search');
    
    // Initially clear button should not be visible
    expect(clearButton).not.toHaveClass('visible');
    
    // Type in search
    fireEvent.change(searchBar, { target: { value: 'test' } });
    
    // Clear button should now be visible
    expect(clearButton).toHaveClass('visible');
  });

  test('clear button clears search when clicked', () => {
    renderWithProviders(<TabTreeComponent tabHierarchy={mockTabHierarchy} />);
    
    const searchBar = screen.getByPlaceholderText('Search tabs');
    const clearButton = screen.getByLabelText('Clear search');
    
    // Enter search text
    fireEvent.change(searchBar, { target: { value: 'github' } });
    expect(searchBar.value).toBe('github');
    expect(screen.queryByText('Google Search')).not.toBeInTheDocument();
    
    // Click clear button
    fireEvent.click(clearButton);
    
    // Search should be cleared and all tabs visible again
    expect(searchBar.value).toBe('');
    expect(screen.getByText('Google Search')).toBeInTheDocument();
    expect(screen.getByText('GitHub Repository')).toBeInTheDocument();
    expect(screen.getByText('Stack Overflow')).toBeInTheDocument();
    expect(clearButton).not.toHaveClass('visible');
  });

  test('clear button has correct accessibility attributes', () => {
    renderWithProviders(<TabTreeComponent tabHierarchy={mockTabHierarchy} />);
    
    const clearButton = screen.getByLabelText('Clear search');
    
    expect(clearButton).toHaveAttribute('aria-label', 'Clear search');
    expect(clearButton).toHaveAttribute('type', 'button');
    expect(clearButton).toHaveTextContent('×');
  });
});