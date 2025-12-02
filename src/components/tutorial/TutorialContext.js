import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getSetting } from '../../utils/settings';

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
    title: 'Welcome to Moose Tabs',
    description: 'A quick tour to help you get the most out of your tab manager. This takes about a minute.',
    position: 'center',
    showControls: true,
    animation: 'fadeIn',
    duration: 'normal'
  },
  {
    id: 'search',
    type: 'highlight',
    target: '.search-bar',
    title: 'Quick Search',
    description: 'Find any tab instantly with fuzzy search. Just start typing — partial matches work too.',
    position: 'bottom',
    showDemo: true,
    demoText: 'goog',
    animation: 'slideDown',
    duration: 'normal'
  },
  {
    id: 'hierarchy',
    type: 'highlight',
    target: '.expand-collapse-btn',
    fallbackTarget: '.tab-content',
    title: 'Tab Hierarchy',
    description: 'Organize tabs into parent-child groups. Use the arrow to expand or collapse nested tabs.',
    position: 'bottom',
    animation: 'slideLeft',
    duration: 'normal'
  },
  {
    id: 'dragdrop',
    type: 'highlight',
    target: '.tab-content',
    title: 'Drag to Organize',
    description: 'Drag tabs to rearrange them. Drop toward the right edge to nest as a child, or left to keep as siblings.',
    position: 'bottom',
    animation: 'pulse',
    duration: 'long'
  },
  {
    id: 'windows',
    type: 'highlight',
    target: '.window-label',
    title: 'Window Groups',
    description: 'Tabs are grouped by browser window. The count shows all tabs including nested children.',
    position: 'bottom',
    animation: 'pulse',
    duration: 'normal'
  },
  {
    id: 'window-editing',
    type: 'highlight',
    target: '.window-label',
    title: 'Rename Windows',
    description: 'Double-click any window label to give it a custom name — great for separating work and personal.',
    position: 'bottom',
    animation: 'glow',
    duration: 'normal'
  },
  {
    id: 'tab-actions',
    type: 'highlight',
    target: '.tab-content',
    title: 'Quick Actions',
    description: 'Click a tab to switch to it. Hover to reveal the close button for quick cleanup.',
    position: 'bottom',
    animation: 'glow',
    duration: 'normal'
  },
  {
    id: 'completion',
    type: 'overlay',
    title: 'You\'re Ready',
    description: 'You\'ve learned the essentials. Start organizing your tabs and enjoy a cleaner browsing experience.',
    position: 'center',
    showControls: true,
    animation: 'fadeIn',
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
        // Check if auto-start is enabled in settings
        const autoStart = await getSetting('tutorial.autoStart');
        console.log('🎯 Tutorial: Auto-start setting:', autoStart);
        
        if (autoStart === false) {
          console.log('🎯 Tutorial: Auto-start disabled in settings');
          setIsLoading(false);
          return;
        }
        
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