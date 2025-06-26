/**
 * Test for Task 3.1: Collapse/Expand Tab Branches
 * TDD Test: Component test for TabItem with expand/collapse functionality
 */

import { screen, fireEvent, renderWithDropZoneProvider } from './test-utils';
import TabItem from '../src/components/TabItem';

describe('Task 3.1: TabItem Collapse/Expand Functionality', () => {
  const mockTabWithChildren = {
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

  const mockTabWithoutChildren = {
    id: 4,
    title: 'Leaf Tab',
    url: 'https://leaf.com',
    children: []
  };

  test('renders tab item with expand/collapse button when it has children', () => {
    renderWithDropZoneProvider(<TabItem tab={mockTabWithChildren} level={0} />);
    
    // Should show the tab content
    expect(screen.getByText('Parent Tab')).toBeInTheDocument();
    expect(screen.getByText('https://parent.com')).toBeInTheDocument();
    
    // Should show expand/collapse button when has children
    const expandButton = screen.getByTestId('expand-collapse-btn-1');
    expect(expandButton).toBeInTheDocument();
    
    // Should show children by default (expanded state)
    expect(screen.getByText('Child Tab 1')).toBeInTheDocument();
    expect(screen.getByText('Child Tab 2')).toBeInTheDocument();
  });

  test('does not render expand/collapse button when tab has no children', () => {
    renderWithDropZoneProvider(<TabItem tab={mockTabWithoutChildren} level={0} />);
    
    // Should show the tab content
    expect(screen.getByText('Leaf Tab')).toBeInTheDocument();
    expect(screen.getByText('https://leaf.com')).toBeInTheDocument();
    
    // Should NOT show expand/collapse button when no children
    expect(screen.queryByTestId('expand-collapse-btn-4')).not.toBeInTheDocument();
  });

  test('toggles child visibility when expand/collapse button is clicked', () => {
    renderWithDropZoneProvider(<TabItem tab={mockTabWithChildren} level={0} />);
    
    const expandButton = screen.getByTestId('expand-collapse-btn-1');
    
    // Initially expanded - children should be visible
    expect(screen.getByText('Child Tab 1')).toBeInTheDocument();
    expect(screen.getByText('Child Tab 2')).toBeInTheDocument();
    
    // Click to collapse
    fireEvent.click(expandButton);
    
    // Children should be hidden
    expect(screen.queryByText('Child Tab 1')).not.toBeInTheDocument();
    expect(screen.queryByText('Child Tab 2')).not.toBeInTheDocument();
    
    // Parent should still be visible
    expect(screen.getByText('Parent Tab')).toBeInTheDocument();
    
    // Click to expand again
    fireEvent.click(expandButton);
    
    // Children should be visible again
    expect(screen.getByText('Child Tab 1')).toBeInTheDocument();
    expect(screen.getByText('Child Tab 2')).toBeInTheDocument();
  });

  test('expand/collapse button shows correct icon based on state', () => {
    renderWithDropZoneProvider(<TabItem tab={mockTabWithChildren} level={0} />);
    
    const expandButton = screen.getByTestId('expand-collapse-btn-1');
    
    // Initially expanded - should show collapse icon (▼)
    expect(expandButton).toHaveTextContent('▼');
    
    // Click to collapse
    fireEvent.click(expandButton);
    
    // Should show expand icon (►)
    expect(expandButton).toHaveTextContent('►');
    
    // Click to expand again
    fireEvent.click(expandButton);
    
    // Should show collapse icon again (▼)
    expect(expandButton).toHaveTextContent('▼');
  });

  test('maintains proper indentation levels for nested tabs', () => {
    renderWithDropZoneProvider(<TabItem tab={mockTabWithChildren} level={2} />);
    
    // Parent should have level 2 indentation
    const parentContent = screen.getByTestId('tab-content-1');
    expect(parentContent).toHaveClass('tab-level-2');
    expect(parentContent).toHaveStyle('margin-left: 0px'); // No margin-left per new design
    
    // Children should have level 3 indentation
    const child1Content = screen.getByTestId('tab-content-2');
    const child2Content = screen.getByTestId('tab-content-3');
    expect(child1Content).toHaveClass('tab-level-3');
    expect(child2Content).toHaveClass('tab-level-3');
    expect(child1Content).toHaveStyle('margin-left: 0px'); // No margin-left per new design
    expect(child2Content).toHaveStyle('margin-left: 0px'); // No margin-left per new design
  });

  test('handles deeply nested tabs correctly', () => {
    const deeplyNestedTab = {
      id: 1,
      title: 'Level 1',
      url: 'https://level1.com',
      children: [
        {
          id: 2,
          title: 'Level 2',
          url: 'https://level2.com',
          children: [
            {
              id: 3,
              title: 'Level 3',
              url: 'https://level3.com',
              children: []
            }
          ]
        }
      ]
    };

    renderWithDropZoneProvider(<TabItem tab={deeplyNestedTab} level={0} />);
    
    // All levels should be visible initially
    expect(screen.getByText('Level 1')).toBeInTheDocument();
    expect(screen.getByText('Level 2')).toBeInTheDocument();
    expect(screen.getByText('Level 3')).toBeInTheDocument();
    
    // Collapse level 1
    const level1Button = screen.getByTestId('expand-collapse-btn-1');
    fireEvent.click(level1Button);
    
    // Level 2 and 3 should be hidden
    expect(screen.queryByText('Level 2')).not.toBeInTheDocument();
    expect(screen.queryByText('Level 3')).not.toBeInTheDocument();
    
    // Level 1 should still be visible
    expect(screen.getByText('Level 1')).toBeInTheDocument();
  });

  test('independent collapse state for sibling tabs', () => {
    const siblingTabs = [
      {
        id: 1,
        title: 'Parent 1',
        url: 'https://parent1.com',
        children: [
          { id: 2, title: 'Child 1A', url: 'https://child1a.com', children: [] }
        ]
      },
      {
        id: 3,
        title: 'Parent 2',
        url: 'https://parent2.com',
        children: [
          { id: 4, title: 'Child 2A', url: 'https://child2a.com', children: [] }
        ]
      }
    ];

    renderWithDropZoneProvider(
      <div>
        <TabItem tab={siblingTabs[0]} level={0} />
        <TabItem tab={siblingTabs[1]} level={0} />
      </div>
    );
    
    // Both parents and children should be visible initially
    expect(screen.getByText('Parent 1')).toBeInTheDocument();
    expect(screen.getByText('Child 1A')).toBeInTheDocument();
    expect(screen.getByText('Parent 2')).toBeInTheDocument();
    expect(screen.getByText('Child 2A')).toBeInTheDocument();
    
    // Collapse Parent 1 only
    const parent1Button = screen.getByTestId('expand-collapse-btn-1');
    fireEvent.click(parent1Button);
    
    // Parent 1's child should be hidden
    expect(screen.queryByText('Child 1A')).not.toBeInTheDocument();
    
    // Parent 2's child should still be visible
    expect(screen.getByText('Child 2A')).toBeInTheDocument();
    expect(screen.getByText('Parent 2')).toBeInTheDocument();
  });
});