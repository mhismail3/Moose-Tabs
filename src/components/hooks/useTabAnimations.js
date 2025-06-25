import { useState, useCallback } from 'react';

// Global animation state management
let animationState = {
  animatingTabs: new Set(),
  listeners: new Set()
};

function notifyListeners() {
  animationState.listeners.forEach(listener => listener(animationState.animatingTabs));
}

export function useTabAnimations() {
  const [animatingTabs, setAnimatingTabs] = useState(animationState.animatingTabs);

  // Subscribe to animation state changes
  const subscribe = useCallback(() => {
    const listener = (newAnimatingTabs) => {
      setAnimatingTabs(new Set(newAnimatingTabs));
    };
    animationState.listeners.add(listener);
    
    return () => {
      animationState.listeners.delete(listener);
    };
  }, []);

  // Start animation for specific tabs
  const startAnimation = useCallback((tabIds, direction, isDisplaced = false) => {
    const animationType = isDisplaced ? `displaced-${direction}` : direction;
    tabIds.forEach(tabId => {
      // Clear any existing animations for this tab to prevent conflicts
      const existingAnimations = Array.from(animationState.animatingTabs)
        .filter(key => key.startsWith(`${tabId}-`));
      existingAnimations.forEach(key => animationState.animatingTabs.delete(key));
      
      // Add the new animation
      animationState.animatingTabs.add(`${tabId}-${animationType}`);
    });
    notifyListeners();
    
    // Auto-remove after animation duration - matched to CSS (50% slower)
    const duration = isDisplaced ? 1000 : 1200; // Matched to slowed CSS durations + buffer
    setTimeout(() => {
      tabIds.forEach(tabId => {
        animationState.animatingTabs.delete(`${tabId}-${animationType}`);
      });
      notifyListeners();
    }, duration);
  }, []);

  // Check if a tab is currently animating
  const isAnimating = useCallback((tabId, direction) => {
    return animationState.animatingTabs.has(`${tabId}-${direction}`);
  }, [animatingTabs]);

  return {
    subscribe,
    startAnimation,
    isAnimating,
    animatingTabs
  };
}