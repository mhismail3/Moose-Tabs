export function useKeyboardNavigation(hasChildren, isExpanded, setIsExpanded) {
  // Focus management utilities
  const focusNextItem = (currentElement) => {
    const treeItems = getAllTreeItems();
    const currentIndex = treeItems.indexOf(currentElement);
    const nextIndex = Math.min(currentIndex + 1, treeItems.length - 1);
    if (treeItems[nextIndex]) {
      updateTabIndexes(treeItems, nextIndex);
      treeItems[nextIndex].focus();
    }
  };

  const focusPreviousItem = (currentElement) => {
    const treeItems = getAllTreeItems();
    const currentIndex = treeItems.indexOf(currentElement);
    const prevIndex = Math.max(currentIndex - 1, 0);
    if (treeItems[prevIndex]) {
      updateTabIndexes(treeItems, prevIndex);
      treeItems[prevIndex].focus();
    }
  };

  const getAllTreeItems = () => {
    const tree = document.querySelector('[role="tree"]');
    if (!tree) return [];
    return Array.from(tree.querySelectorAll('[role="treeitem"]'));
  };

  const updateTabIndexes = (treeItems, focusedIndex) => {
    treeItems.forEach((item, index) => {
      item.setAttribute('tabIndex', index === focusedIndex ? '0' : '-1');
    });
  };

  // Keyboard navigation handlers
  const handleKeyDown = (e) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        focusNextItem(e.target);
        break;
      case 'ArrowUp':
        e.preventDefault();
        focusPreviousItem(e.target);
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (hasChildren && !isExpanded) {
          setIsExpanded(true);
        } else {
          focusNextItem(e.target);
        }
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (hasChildren && isExpanded) {
          setIsExpanded(false);
        } else {
          focusPreviousItem(e.target);
        }
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        // Could implement tab selection here
        break;
      default:
        break;
    }
  };

  return {
    handleKeyDown
  };
}