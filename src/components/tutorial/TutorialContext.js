import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const TutorialContext = createContext();

export const useTutorial = () => {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }
  return context;
};

// Tutorial steps configuration
export const TUTORIAL_STEPS = [
  {
    id: 'welcome',
    type: 'overlay',
    title: '🎉 Welcome to Moose Tabs!',
    description: 'Let\'s take a quick tour to help you master your tab organization. This will only take a minute!',
    position: 'center',
    showControls: true,
    animation: 'fadeIn',
    duration: 'normal'
  },
  {
    id: 'search',
    type: 'highlight',
    target: '.search-bar',
    title: '🔍 Smart Search',
    description: 'Use the search bar to quickly find any tab. It supports fuzzy matching, so you can type partial words!',
    position: 'bottom',
    showDemo: true,
    demoText: 'Try typing "goog" to find Google tabs',
    animation: 'slideDown',
    duration: 'normal'
  },
  {
    id: 'hierarchy',
    type: 'highlight',
    target: '.expand-collapse-btn',
    fallbackTarget: '.tab-content',
    title: '📁 Tab Hierarchy',
    description: 'Tabs can have parent-child relationships! When tabs have children, you\'ll see arrows to expand/collapse tab groups.',
    position: 'bottom',
    animation: 'slideLeft',
    duration: 'normal'
  },
  {
    id: 'dragdrop',
    type: 'highlight',
    target: '.tab-content',
    title: '🎯 Drag & Drop',
    description: 'Drag tabs to reorganize them! Drop on the right side to make a child, or left side for siblings.',
    position: 'bottom',
    animation: 'pulse',
    duration: 'long'
  },
  {
    id: 'windows',
    type: 'highlight',
    target: '.window-label',
    title: '🪟 Window Groups',
    description: 'Tabs are automatically grouped by browser window. Each group shows the total tab count including children.',
    position: 'bottom',
    animation: 'bounce',
    duration: 'normal'
  },
  {
    id: 'window-editing',
    type: 'highlight',
    target: '.window-label',
    title: '✏️ Custom Window Names',
    description: 'Double-click any window label to give it a custom name! Perfect for organizing work and personal windows.',
    position: 'bottom',
    animation: 'shake',
    duration: 'normal'
  },
  {
    id: 'tab-actions',
    type: 'highlight',
    target: '.tab-content',
    title: '⚡ Tab Actions',
    description: 'Click any tab to switch to it instantly. Hover to see the close button for easy tab management.',
    position: 'bottom',
    animation: 'glow',
    duration: 'normal'
  },
  {
    id: 'completion',
    type: 'overlay',
    title: '🚀 You\'re all set!',
    description: 'You\'ve mastered the basics of Moose Tabs! Start organizing your tabs like a pro. Happy browsing! 🎊',
    position: 'center',
    showControls: true,
    animation: 'celebration',
    duration: 'long',
    isCompletion: true
  }
];

export const TutorialProvider = ({ children }) => {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasCompletedTutorial, setHasCompletedTutorial] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [stepTargetElement, setStepTargetElement] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);

  // Check if tutorial has been completed on mount
  useEffect(() => {
    const checkTutorialStatus = async () => {
      console.log('🎯 Tutorial: Checking tutorial status...');
      
      try {
        if (typeof chrome !== 'undefined' && chrome.storage) {
          const result = await chrome.storage.local.get(['tutorialCompleted', 'tutorialSeen', 'lastTutorialCheck']);
          const completed = result.tutorialCompleted || false;
          const tutorialSeen = result.tutorialSeen || false;
          const lastCheck = result.lastTutorialCheck || 0;
          const currentTime = Date.now();
          
          console.log('🎯 Tutorial: Storage result:', result);
          console.log('🎯 Tutorial: Completed status:', completed);
          console.log('🎯 Tutorial: Tutorial seen:', tutorialSeen);
          console.log('🎯 Tutorial: Time since last check:', currentTime - lastCheck, 'ms');
          
          setHasCompletedTutorial(completed);
          
          // Start tutorial if never seen before AND not completed
          // Also allow restart if more than 24 hours have passed (for development)
          const isDevelopment = currentTime - lastCheck > 24 * 60 * 60 * 1000; // 24 hours
          const shouldStart = !completed && (!tutorialSeen || isDevelopment);
          
          if (shouldStart) {
            console.log('🎯 Tutorial: Starting tutorial - Seen:', tutorialSeen, 'Completed:', completed, 'Dev mode:', isDevelopment);
            
            // Mark that we've seen the tutorial and update last check time
            await chrome.storage.local.set({ 
              tutorialSeen: true,
              lastTutorialCheck: currentTime
            });
            
            // Short delay to ensure UI is fully rendered
            setTimeout(() => {
              console.log('🎯 Tutorial: Activating tutorial now!');
              setIsActive(true);
            }, 1500); // Increased delay for better reliability
          } else {
            console.log('🎯 Tutorial: Not starting - already seen or completed');
          }
        } else {
          console.log('🎯 Tutorial: Chrome storage not available - extension context issue');
          // Conservative fallback: only start if this appears to be first load
          const isLikelyFirstLoad = !document.querySelector('.tutorial-overlay');
          if (isLikelyFirstLoad) {
            console.log('🎯 Tutorial: Fallback activation for likely first load');
            setTimeout(() => {
              setIsActive(true);
            }, 2000);
          } else {
            console.log('🎯 Tutorial: Skipping fallback - tutorial elements already exist');
          }
        }
      } catch (error) {
        console.log('🎯 Tutorial: Failed to check tutorial status:', error);
        // Conservative error fallback: only start on apparent first load
        const isLikelyFirstLoad = !document.querySelector('.tutorial-overlay');
        if (isLikelyFirstLoad) {
          setTimeout(() => {
            console.log('🎯 Tutorial: Error fallback activation for likely first load');
            setIsActive(true);
          }, 3000);
        } else {
          console.log('🎯 Tutorial: Skipping error fallback - tutorial elements already exist');
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkTutorialStatus();
  }, []);

  // Find target element for current step
  useEffect(() => {
    if (!isActive || currentStep >= TUTORIAL_STEPS.length) return;

    const step = TUTORIAL_STEPS[currentStep];
    if (step.target) {
      const findElement = () => {
        let element = document.querySelector(step.target);
        
        // Try fallback target if primary target not found
        if (!element && step.fallbackTarget) {
          element = document.querySelector(step.fallbackTarget);
        }
        
        setStepTargetElement(element);
      };

      // Find element immediately
      findElement();

      // Also set up a retry mechanism for dynamically loaded content
      const retryInterval = setInterval(findElement, 100);
      const timeout = setTimeout(() => {
        clearInterval(retryInterval);
      }, 3000); // Stop retrying after 3 seconds

      return () => {
        clearInterval(retryInterval);
        clearTimeout(timeout);
      };
    } else {
      setStepTargetElement(null);
    }
  }, [isActive, currentStep]);

  const startTutorial = useCallback(() => {
    setIsActive(true);
    setCurrentStep(0);
  }, []);

  const nextStep = useCallback(async () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setIsAnimating(true);
      
      // Brief animation delay
      setTimeout(() => {
        setCurrentStep(prev => prev + 1);
        setIsAnimating(false);
      }, 200);
    } else {
      // Tutorial completed
      await completeTutorial();
    }
  }, [currentStep]);

  const previousStep = useCallback(() => {
    if (currentStep > 0) {
      setIsAnimating(true);
      
      setTimeout(() => {
        setCurrentStep(prev => prev - 1);
        setIsAnimating(false);
      }, 200);
    }
  }, [currentStep]);

  const skipTutorial = useCallback(async () => {
    await completeTutorial();
  }, []);

  const completeTutorial = useCallback(async () => {
    console.log('🎯 Tutorial: Completing tutorial...');
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await chrome.storage.local.set({ 
          tutorialCompleted: true,
          tutorialCompletedAt: Date.now(),
          tutorialSeen: true
        });
        console.log('🎯 Tutorial: Completion status saved to storage');
      }
      setHasCompletedTutorial(true);
      setIsActive(false);
      setCurrentStep(0);
    } catch (error) {
      console.log('🎯 Tutorial: Failed to save tutorial completion:', error);
      // Still mark as completed locally
      setHasCompletedTutorial(true);
      setIsActive(false);
    }
  }, []);

  const restartTutorial = useCallback(async () => {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await chrome.storage.local.remove(['tutorialCompleted', 'tutorialCompletedAt', 'tutorialSeen', 'lastTutorialCheck']);
      }
      setHasCompletedTutorial(false);
      setCurrentStep(0);
      setIsActive(true);
      console.log('🎯 Tutorial: Restarted manually');
    } catch (error) {
      console.log('🎯 Tutorial: Failed to reset tutorial:', error);
    }
  }, []);

  // Debugging utility function
  const debugTutorial = useCallback(async () => {
    console.log('🔍 Tutorial Debug Info:');
    console.log('- isActive:', isActive);
    console.log('- currentStep:', currentStep);
    console.log('- hasCompletedTutorial:', hasCompletedTutorial);
    console.log('- isLoading:', isLoading);
    console.log('- stepTargetElement:', stepTargetElement);
    console.log('- isAnimating:', isAnimating);
    
    if (typeof chrome !== 'undefined' && chrome.storage) {
      try {
        const result = await chrome.storage.local.get(['tutorialCompleted', 'tutorialSeen', 'lastTutorialCheck', 'tutorialCompletedAt']);
        console.log('- Storage data:', result);
      } catch (error) {
        console.log('- Storage error:', error);
      }
    } else {
      console.log('- Chrome storage not available');
    }
    
    // Also expose to window for easy access in DevTools
    window.tutorialDebug = {
      isActive,
      currentStep,
      hasCompletedTutorial,
      isLoading,
      stepTargetElement,
      isAnimating,
      forceStart: forceStartTutorial,
      restart: restartTutorial,
      complete: completeTutorial,
      skip: skipTutorial,
      next: nextStep,
      previous: previousStep
    };
    console.log('🔍 Tutorial controls available at window.tutorialDebug');
  }, [isActive, currentStep, hasCompletedTutorial, isLoading, stepTargetElement, isAnimating, forceStartTutorial, restartTutorial, completeTutorial, skipTutorial, nextStep, previousStep]);

  const forceStartTutorial = useCallback(() => {
    console.log('🎯 Tutorial: Force starting tutorial');
    setIsActive(true);
    setCurrentStep(0);
    setHasCompletedTutorial(false);
  }, []);

  // Listen for debug force start events
  useEffect(() => {
    const handleForceStart = () => {
      console.log('🎯 Tutorial: Debug force start received');
      forceStartTutorial();
    };

    document.addEventListener('tutorial:force-start', handleForceStart);
    return () => document.removeEventListener('tutorial:force-start', handleForceStart);
  }, [forceStartTutorial]);

  // Run debug info on mount for development
  useEffect(() => {
    // Delay to ensure state is initialized
    const timer = setTimeout(() => {
      debugTutorial();
    }, 500);
    return () => clearTimeout(timer);
  }, [debugTutorial]);

  const goToStep = useCallback((stepIndex) => {
    if (stepIndex >= 0 && stepIndex < TUTORIAL_STEPS.length) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(stepIndex);
        setIsAnimating(false);
      }, 200);
    }
  }, []);

  const getCurrentStep = useCallback(() => {
    return TUTORIAL_STEPS[currentStep] || null;
  }, [currentStep]);

  const value = {
    // State
    isActive,
    currentStep,
    hasCompletedTutorial,
    isLoading,
    stepTargetElement,
    isAnimating,
    
    // Current step info
    currentStepData: getCurrentStep(),
    totalSteps: TUTORIAL_STEPS.length,
    
    // Actions
    startTutorial,
    nextStep,
    previousStep,
    skipTutorial,
    completeTutorial,
    restartTutorial,
    forceStartTutorial,
    goToStep,
    
    // Utilities
    getCurrentStep,
    debugTutorial,
    steps: TUTORIAL_STEPS
  };

  return (
    <TutorialContext.Provider value={value}>
      {children}
    </TutorialContext.Provider>
  );
};

export default TutorialProvider;