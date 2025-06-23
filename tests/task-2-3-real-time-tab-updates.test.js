/**
 * Test for Task 2.3: Real-time UI Updates
 * TDD Test: Simulate tab being added in background and verify TabTreeComponent updates
 */

import { render, screen, act } from '@testing-library/react';
import TabTreeComponent from '../src/components/TabTreeComponent';

// Mock Chrome APIs for testing
global.chrome = {
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    }
  }
};

describe('Task 2.3: Real-time Tab Updates in TabTreeComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });
  
  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('TabTreeComponent updates when new tab is added in background', async () => {
    // Initial hierarchy with one tab
    const initialHierarchy = [
      { id: 1, title: 'Initial Tab', url: 'https://example.com', children: [] }
    ];
    
    // Render component with initial data
    const { rerender } = render(<TabTreeComponent tabHierarchy={initialHierarchy} />);
    
    // Verify initial tab is displayed
    expect(screen.getByText('Initial Tab')).toBeInTheDocument();
    expect(screen.getByText('https://example.com')).toBeInTheDocument();
    expect(screen.queryByText('New Background Tab')).not.toBeInTheDocument();
    
    // Simulate background script adding a new tab
    const updatedHierarchy = [
      { id: 1, title: 'Initial Tab', url: 'https://example.com', children: [] },
      { id: 2, title: 'New Background Tab', url: 'https://newsite.com', children: [] }
    ];
    
    // Re-render with updated hierarchy (simulating real-time update)
    rerender(<TabTreeComponent tabHierarchy={updatedHierarchy} />);
    
    // Verify new tab appears in the UI
    expect(screen.getByText('Initial Tab')).toBeInTheDocument();
    expect(screen.getByText('New Background Tab')).toBeInTheDocument();
    expect(screen.getByText('https://newsite.com')).toBeInTheDocument();
  });

  test('TabTreeComponent updates when tab is removed in background', async () => {
    // Initial hierarchy with two tabs
    const initialHierarchy = [
      { id: 1, title: 'Tab One', url: 'https://one.com', children: [] },
      { id: 2, title: 'Tab Two', url: 'https://two.com', children: [] }
    ];
    
    // Render component with initial data
    const { rerender } = render(<TabTreeComponent tabHierarchy={initialHierarchy} />);
    
    // Verify both tabs are displayed
    expect(screen.getByText('Tab One')).toBeInTheDocument();
    expect(screen.getByText('Tab Two')).toBeInTheDocument();
    
    // Simulate background script removing a tab
    const updatedHierarchy = [
      { id: 1, title: 'Tab One', url: 'https://one.com', children: [] }
    ];
    
    // Re-render with updated hierarchy (simulating real-time update)
    rerender(<TabTreeComponent tabHierarchy={updatedHierarchy} />);
    
    // Verify removed tab is no longer displayed
    expect(screen.getByText('Tab One')).toBeInTheDocument();
    expect(screen.queryByText('Tab Two')).not.toBeInTheDocument();
  });

  test('TabTreeComponent updates when tab hierarchy changes in background', async () => {
    // Initial hierarchy with flat structure
    const initialHierarchy = [
      { id: 1, title: 'Parent Tab', url: 'https://parent.com', children: [] },
      { id: 2, title: 'Child Tab', url: 'https://child.com', children: [] }
    ];
    
    // Render component with initial data
    const { rerender } = render(<TabTreeComponent tabHierarchy={initialHierarchy} />);
    
    // Verify initial flat structure
    expect(screen.getByText('Parent Tab')).toBeInTheDocument();
    expect(screen.getByText('Child Tab')).toBeInTheDocument();
    
    // Check that child tab is not indented (level 0)
    const childTabElement = screen.getByTestId('tab-2');
    expect(childTabElement).toHaveClass('tab-level-0');
    
    // Simulate background script detecting parent-child relationship
    const updatedHierarchy = [
      { 
        id: 1, 
        title: 'Parent Tab', 
        url: 'https://parent.com', 
        children: [
          { id: 2, title: 'Child Tab', url: 'https://child.com', children: [] }
        ]
      }
    ];
    
    // Re-render with updated hierarchy (simulating real-time update)
    rerender(<TabTreeComponent tabHierarchy={updatedHierarchy} />);
    
    // Verify hierarchical structure is now displayed
    expect(screen.getByText('Parent Tab')).toBeInTheDocument();
    expect(screen.getByText('Child Tab')).toBeInTheDocument();
    
    // Check that child tab is now indented (level 1)
    const updatedChildTabElement = screen.getByTestId('tab-2');
    expect(updatedChildTabElement).toHaveClass('tab-level-1');
  });

  test('TabTreeComponent handles rapid hierarchy changes smoothly', async () => {
    // Start with empty hierarchy
    const emptyHierarchy = [];
    
    // Render component with empty data
    const { rerender } = render(<TabTreeComponent tabHierarchy={emptyHierarchy} />);
    
    // Verify empty state
    expect(screen.getByText('No tabs available')).toBeInTheDocument();
    
    // Simulate rapid tab additions (as might happen during background processing)
    const changes = [
      [{ id: 1, title: 'Tab 1', url: 'https://one.com', children: [] }],
      [
        { id: 1, title: 'Tab 1', url: 'https://one.com', children: [] },
        { id: 2, title: 'Tab 2', url: 'https://two.com', children: [] }
      ],
      [
        { id: 1, title: 'Tab 1', url: 'https://one.com', children: [
          { id: 2, title: 'Tab 2', url: 'https://two.com', children: [] }
        ]},
      ],
      [
        { id: 1, title: 'Tab 1', url: 'https://one.com', children: [
          { id: 2, title: 'Tab 2', url: 'https://two.com', children: [] }
        ]},
        { id: 3, title: 'Tab 3', url: 'https://three.com', children: [] }
      ]
    ];
    
    // Apply changes rapidly
    for (const hierarchy of changes) {
      rerender(<TabTreeComponent tabHierarchy={hierarchy} />);
    }
    
    // Verify final state is correct
    expect(screen.getByText('Tab 1')).toBeInTheDocument();
    expect(screen.getByText('Tab 2')).toBeInTheDocument();
    expect(screen.getByText('Tab 3')).toBeInTheDocument();
    
    // Verify hierarchy structure is maintained
    const tab2Element = screen.getByTestId('tab-2');
    const tab3Element = screen.getByTestId('tab-3');
    expect(tab2Element).toHaveClass('tab-level-1'); // Child of Tab 1
    expect(tab3Element).toHaveClass('tab-level-0'); // Root level
  });
});