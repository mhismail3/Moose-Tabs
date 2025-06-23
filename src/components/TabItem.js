import React, { useState } from 'react';
import './TabItem.css';

function TabItem({ tab, level = 0 }) {
  const [isExpanded, setIsExpanded] = useState(true);

  const hasChildren = tab.children && tab.children.length > 0;


  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="tab-item">
      <div 
        data-testid={`tab-content-${tab.id}`}
        className={`tab-content tab-level-${level}`}
        style={{ paddingLeft: `${level * 20}px` }}
      >
        {hasChildren && (
          <button
            data-testid={`expand-collapse-btn-${tab.id}`}
            className={`expand-collapse-btn${level > 0 ? ' nested' : ''}`}
            onClick={toggleExpanded}
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? '▼' : '►'}
          </button>
        )}
        <div className="tab-info">
          <div className="tab-title">{tab.title}</div>
          <div className="tab-url">{tab.url}</div>
        </div>
      </div>
      {hasChildren && isExpanded && (
        <div className="tab-children">
          {tab.children.map(child => (
            <TabItem 
              key={child.id} 
              tab={child} 
              level={level + 1} 
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default TabItem;