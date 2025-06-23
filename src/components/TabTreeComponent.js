import React from 'react';
import TabItem from './TabItem';
import './TabTreeComponent.css';

function TabTreeComponent({ tabHierarchy = [] }) {
  // Debug: Add some test data to verify expand/collapse works
  const debugTestData = [
    {
      id: 999,
      title: 'Debug Parent Tab',
      url: 'https://debug-parent.com',
      children: [
        {
          id: 998,
          title: 'Debug Child 1',
          url: 'https://debug-child1.com',
          children: []
        },
        {
          id: 997,
          title: 'Debug Child 2',
          url: 'https://debug-child2.com',
          children: [
            {
              id: 996,
              title: 'Debug Grandchild',
              url: 'https://debug-grandchild.com',
              children: []
            }
          ]
        }
      ]
    }
  ];

  // Combine real data with debug data
  const combinedHierarchy = [...debugTestData, ...tabHierarchy];

  if (!combinedHierarchy || combinedHierarchy.length === 0) {
    return (
      <div data-testid="tab-tree-container" className="tab-tree">
        <div className="empty-state">No tabs available</div>
      </div>
    );
  }

  return (
    <div data-testid="tab-tree-container" className="tab-tree">
      {combinedHierarchy.map(tab => (
        <TabItem key={tab.id} tab={tab} level={0} />
      ))}
    </div>
  );
}

export default TabTreeComponent;