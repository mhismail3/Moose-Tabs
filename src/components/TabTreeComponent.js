import React from 'react';
import TabItem from './TabItem';
import './TabTreeComponent.css';

function TabTreeComponent({ tabHierarchy = [] }) {
  if (!tabHierarchy || tabHierarchy.length === 0) {
    return (
      <div data-testid="tab-tree-container" className="tab-tree">
        <div className="empty-state">No tabs available</div>
      </div>
    );
  }

  return (
    <div data-testid="tab-tree-container" className="tab-tree">
      {tabHierarchy.map(tab => (
        <TabItem key={tab.id} tab={tab} level={0} />
      ))}
    </div>
  );
}

export default TabTreeComponent;