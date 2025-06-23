/**
 * Test for Tab Move Synchronization
 * Tests the improved tab move handling between browser and sidebar
 */

// Mock Chrome APIs for testing
global.chrome = {
  tabs: {
    get: jest.fn(),
    query: jest.fn(),
    move: jest.fn()
  }
};

// Import TabTree for testing
const TabTree = require('../public/TabTree.js');

describe('Tab Move Synchronization', () => {
  let tabTree;

  beforeEach(() => {
    tabTree = new TabTree();
    jest.clearAllMocks();
  });

  test('tab indices are properly tracked after move operations', () => {
    // Add initial tabs
    tabTree.addTab({ id: 1, title: 'Tab 1', url: 'https://example1.com', windowId: 1, index: 0 });
    tabTree.addTab({ id: 2, title: 'Tab 2', url: 'https://example2.com', windowId: 1, index: 1 });
    tabTree.addTab({ id: 3, title: 'Tab 3', url: 'https://example3.com', windowId: 1, index: 2 });

    // Verify initial order
    const initialHierarchy = tabTree.getHierarchy();
    expect(initialHierarchy).toHaveLength(3);
    expect(initialHierarchy[0].id).toBe(1);
    expect(initialHierarchy[1].id).toBe(2);
    expect(initialHierarchy[2].id).toBe(3);

    // Simulate moving tab 3 to position 0 (like browser would)
    tabTree.updateTab(1, { index: 1 }); // Tab 1 moves to index 1
    tabTree.updateTab(2, { index: 2 }); // Tab 2 moves to index 2  
    tabTree.updateTab(3, { index: 0 }); // Tab 3 moves to index 0

    // Check the new order
    const newHierarchy = tabTree.getHierarchy();
    expect(newHierarchy).toHaveLength(3);
    expect(newHierarchy[0].id).toBe(3); // Tab 3 should be first now
    expect(newHierarchy[1].id).toBe(1); // Tab 1 should be second
    expect(newHierarchy[2].id).toBe(2); // Tab 2 should be third
  });

  test('hierarchy respects tab index ordering across windows', () => {
    // Add tabs from different windows
    tabTree.addTab({ id: 1, title: 'Window 1 Tab 1', url: 'https://w1t1.com', windowId: 1, index: 0 });
    tabTree.addTab({ id: 2, title: 'Window 1 Tab 2', url: 'https://w1t2.com', windowId: 1, index: 1 });
    tabTree.addTab({ id: 3, title: 'Window 2 Tab 1', url: 'https://w2t1.com', windowId: 2, index: 0 });
    tabTree.addTab({ id: 4, title: 'Window 2 Tab 2', url: 'https://w2t2.com', windowId: 2, index: 1 });

    const hierarchy = tabTree.getHierarchy();
    
    // Should have all 4 tabs, sorted by window first, then index
    expect(hierarchy).toHaveLength(4);
    
    // Window 1 tabs should come first (windowId 1 < 2)
    expect(hierarchy[0].windowId).toBe(1);
    expect(hierarchy[0].index).toBe(0);
    expect(hierarchy[1].windowId).toBe(1);
    expect(hierarchy[1].index).toBe(1);
    
    // Window 2 tabs should come second
    expect(hierarchy[2].windowId).toBe(2);
    expect(hierarchy[2].index).toBe(0);
    expect(hierarchy[3].windowId).toBe(2);
    expect(hierarchy[3].index).toBe(1);
  });

  test('tab moves within same window maintain proper ordering', () => {
    // Add 5 tabs in window 1
    for (let i = 1; i <= 5; i++) {
      tabTree.addTab({ 
        id: i, 
        title: `Tab ${i}`, 
        url: `https://example${i}.com`, 
        windowId: 1, 
        index: i - 1 
      });
    }

    // Move tab 5 to position 1 (after tab 1)
    // This simulates: drag tab 5 and drop it after tab 1
    // Browser would update indices like: 1(0), 5(1), 2(2), 3(3), 4(4)
    tabTree.updateTab(2, { index: 2 }); // Tab 2 shifts right
    tabTree.updateTab(3, { index: 3 }); // Tab 3 shifts right  
    tabTree.updateTab(4, { index: 4 }); // Tab 4 shifts right
    tabTree.updateTab(5, { index: 1 }); // Tab 5 moves to position 1

    const hierarchy = tabTree.getHierarchy();
    const tabIds = hierarchy.map(tab => tab.id);
    
    expect(tabIds).toEqual([1, 5, 2, 3, 4]); // Expected order after move
  });
});