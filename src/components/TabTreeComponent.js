import React, { useState, useMemo } from 'react';
import TabItem from './TabItem';
import { getMessage } from '../utils/i18n';
import './TabTree.css';

function TabTreeComponent({ tabHierarchy = [] }) {
  const [searchTerm, setSearchTerm] = useState('');

  // Fuzzy matching function
  const fuzzyMatch = (text, search) => {
    if (!search) return true;
    
    const searchLower = search.toLowerCase();
    const textLower = text.toLowerCase();
    
    // Simple fuzzy matching: check if all characters of search exist in order in text
    let searchIndex = 0;
    for (let i = 0; i < textLower.length && searchIndex < searchLower.length; i++) {
      if (textLower[i] === searchLower[searchIndex]) {
        searchIndex++;
      }
    }
    return searchIndex === searchLower.length;
  };

  // Recursively filter tabs based on search term
  const filterTabs = (tabs) => {
    if (!searchTerm.trim()) return tabs;
    
    return tabs.reduce((filtered, tab) => {
      const matchesTitle = fuzzyMatch(tab.title || '', searchTerm);
      const matchesUrl = fuzzyMatch(tab.url || '', searchTerm);
      
      if (matchesTitle || matchesUrl) {
        // If parent matches, include all children
        filtered.push(tab);
      } else if (tab.children && tab.children.length > 0) {
        // Check if any children match
        const filteredChildren = filterTabs(tab.children);
        if (filteredChildren.length > 0) {
          // Include parent with filtered children
          filtered.push({
            ...tab,
            children: filteredChildren
          });
        }
      }
      
      return filtered;
    }, []);
  };

  const filteredHierarchy = useMemo(() => filterTabs(tabHierarchy), [tabHierarchy, searchTerm]);

  if (!tabHierarchy || tabHierarchy.length === 0) {
    return (
      <div data-testid="tab-tree-container" className="tab-tree">
        <div className="search-bar-container">
          <input
            type="text"
            className="search-bar"
            placeholder="Search tabs"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Search tabs"
          />
        </div>
        <div className="empty-state">{getMessage('no_tabs_available', [], 'No tabs available')}</div>
      </div>
    );
  }

  return (
    <div data-testid="tab-tree-container" className="tab-tree">
      <div className="search-bar-container">
        <input
          type="text"
          className="search-bar"
          placeholder="Search tabs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          aria-label="Search tabs"
        />
      </div>
      <div 
        className="tab-tree-content"
        role="tree"
        aria-label={getMessage('tree_aria_label', [], 'Tab hierarchy tree')}
      >
        {filteredHierarchy.length === 0 && searchTerm.trim() ? (
          <div className="empty-state">No tabs match your search</div>
        ) : (
          filteredHierarchy.map((tab, index) => (
            <TabItem 
              key={tab.id} 
              tab={tab} 
              level={0} 
              isFirst={index === 0}
              totalSiblings={filteredHierarchy.length}
              positionInSet={index + 1}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default TabTreeComponent;