import React from 'react';
import './TabTreeComponent.css';

function TabTreeComponent({ tabHierarchy = [] }) {
  if (!tabHierarchy || tabHierarchy.length === 0) {
    return (
      <div data-testid="tab-tree-container" className="tab-tree">
        <div className="empty-state">No tabs available</div>
      </div>
    );
  }

  const renderTab = (tab, level = 0) => {
    return (
      <div key={tab.id} className="tab-item">
        <div 
          data-testid={`tab-${tab.id}`}
          className={`tab-content tab-level-${level}`}
          style={{ paddingLeft: `${level * 20}px` }}
        >
          <div className="tab-title">{tab.title}</div>
          <div className="tab-url">{tab.url}</div>
        </div>
        {tab.children && tab.children.length > 0 && (
          <div className="tab-children">
            {tab.children.map(child => renderTab(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div data-testid="tab-tree-container" className="tab-tree">
      {tabHierarchy.map(tab => renderTab(tab, 0))}
    </div>
  );
}

export default TabTreeComponent;