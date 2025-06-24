import React from 'react';
import TabItem from './TabItem';
import { getMessage } from '../utils/i18n';
import './TabTreeComponent.css';

function TabTreeComponent({ tabHierarchy = [] }) {
  if (!tabHierarchy || tabHierarchy.length === 0) {
    return (
      <div data-testid="tab-tree-container" className="tab-tree">
        <div className="empty-state">{getMessage('no_tabs_available', [], 'No tabs available')}</div>
      </div>
    );
  }

  return (
    <div 
      data-testid="tab-tree-container" 
      className="tab-tree"
      role="tree"
      aria-label={getMessage('tree_aria_label', [], 'Tab hierarchy tree')}
    >
      {tabHierarchy.map((tab, index) => (
        <TabItem 
          key={tab.id} 
          tab={tab} 
          level={0} 
          isFirst={index === 0}
          totalSiblings={tabHierarchy.length}
          positionInSet={index + 1}
        />
      ))}
    </div>
  );
}

export default TabTreeComponent;