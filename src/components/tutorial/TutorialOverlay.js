import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useTutorial } from './TutorialContext';
import TutorialTooltip from './TutorialTooltip';
import TutorialControls from './TutorialControls';
import './Tutorial.css';

const TutorialOverlay = () => {
  const { 
    isActive, 
    currentStepData, 
    stepTargetElement, 
    isAnimating,
    currentStep,
    totalSteps
  } = useTutorial();

  const [spotlight, setSpotlight] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const overlayRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  // Calculate spotlight position and size based on target element
  const calculateSpotlight = useCallback(() => {
    if (!stepTargetElement || !currentStepData) return null;

    const rect = stepTargetElement.getBoundingClientRect();
    const padding = 8; // Extra padding around the highlighted element
    
    return {
      x: rect.left - padding,
      y: rect.top - padding,
      width: rect.width + (padding * 2),
      height: rect.height + (padding * 2),
      borderRadius: window.getComputedStyle(stepTargetElement).borderRadius || '8px'
    };
  }, [stepTargetElement, currentStepData]);

  // Calculate tooltip position based on target and preferred position
  const calculateTooltipPosition = useCallback(() => {
    if (!stepTargetElement || !currentStepData) return { x: 0, y: 0 };

    const targetRect = stepTargetElement.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const tooltipWidth = 320; // Estimated tooltip width
    const tooltipHeight = 180; // Increased estimate to account for demo content
    const offset = 16; // Distance from target element
    const margin = 12; // Minimum margin from viewport edges

    let x = 0;
    let y = 0;
    let preferredPosition = currentStepData.position;

    // Helper function to check if position fits in sidebar viewport
    const fitsInViewport = (testX, testY) => {
      const sidebarContainer = document.querySelector('.sidebar-container') || document.querySelector('#root');
      if (sidebarContainer) {
        const containerRect = sidebarContainer.getBoundingClientRect();
        return testX >= containerRect.left + margin && 
               testX + tooltipWidth <= containerRect.right - margin &&
               testY >= containerRect.top + margin && 
               testY + tooltipHeight <= containerRect.bottom - margin;
      }
      // Fallback to viewport bounds
      return testX >= margin && 
             testX + tooltipWidth <= viewportWidth - margin &&
             testY >= margin && 
             testY + tooltipHeight <= viewportHeight - margin;
    };

    // Try preferred position first
    switch (preferredPosition) {
      case 'top':
        x = targetRect.left + (targetRect.width / 2) - (tooltipWidth / 2);
        y = targetRect.top - tooltipHeight - offset;
        break;
      case 'bottom':
        x = targetRect.left + (targetRect.width / 2) - (tooltipWidth / 2);
        y = targetRect.bottom + offset;
        break;
      case 'left':
        x = targetRect.left - tooltipWidth - offset;
        y = targetRect.top + (targetRect.height / 2) - (tooltipHeight / 2);
        break;
      case 'right':
        x = targetRect.right + offset;
        y = targetRect.top + (targetRect.height / 2) - (tooltipHeight / 2);
        break;
      case 'center':
      default:
        // Center within the sidebar viewport, accounting for sidebar width
        const sidebarContainer = document.querySelector('.sidebar-container') || document.querySelector('#root');
        if (sidebarContainer) {
          const containerRect = sidebarContainer.getBoundingClientRect();
          x = containerRect.left + (containerRect.width / 2) - (tooltipWidth / 2);
          y = containerRect.top + (containerRect.height / 2) - (tooltipHeight / 2);
        } else {
          // Fallback to viewport center
          x = (viewportWidth / 2) - (tooltipWidth / 2);
          y = (viewportHeight / 2) - (tooltipHeight / 2);
        }
        return { x, y };
    }

    // If preferred position doesn't fit, try alternatives in order of preference
    if (!fitsInViewport(x, y)) {
      const alternatives = ['bottom', 'right', 'top', 'left'].filter(pos => pos !== preferredPosition);
      
      for (const altPosition of alternatives) {
        let altX, altY;
        
        switch (altPosition) {
          case 'top':
            altX = targetRect.left + (targetRect.width / 2) - (tooltipWidth / 2);
            altY = targetRect.top - tooltipHeight - offset;
            break;
          case 'bottom':
            altX = targetRect.left + (targetRect.width / 2) - (tooltipWidth / 2);
            altY = targetRect.bottom + offset;
            break;
          case 'left':
            altX = targetRect.left - tooltipWidth - offset;
            altY = targetRect.top + (targetRect.height / 2) - (tooltipHeight / 2);
            break;
          case 'right':
            altX = targetRect.right + offset;
            altY = targetRect.top + (targetRect.height / 2) - (tooltipHeight / 2);
            break;
        }
        
        if (fitsInViewport(altX, altY)) {
          x = altX;
          y = altY;
          break;
        }
      }
    }

    // Final fallback: ensure tooltip is visible within sidebar with minimal constraints
    const sidebarContainer = document.querySelector('.sidebar-container') || document.querySelector('#root');
    if (sidebarContainer) {
      const containerRect = sidebarContainer.getBoundingClientRect();
      x = Math.max(containerRect.left + margin, Math.min(x, containerRect.right - tooltipWidth - margin));
      y = Math.max(containerRect.top + margin, Math.min(y, containerRect.bottom - tooltipHeight - margin));
    } else {
      // Fallback to viewport constraints
      x = Math.max(margin, Math.min(x, viewportWidth - tooltipWidth - margin));
      y = Math.max(margin, Math.min(y, viewportHeight - tooltipHeight - margin));
    }

    return { x, y };
  }, [stepTargetElement, currentStepData]);

  // Update spotlight and tooltip positions when target changes
  useEffect(() => {
    if (currentStepData && currentStepData.type === 'highlight' && stepTargetElement) {
      const newSpotlight = calculateSpotlight();
      const newTooltipPos = calculateTooltipPosition();
      
      setSpotlight(newSpotlight);
      setTooltipPosition(newTooltipPos);
    } else {
      setSpotlight(null);
    }
  }, [stepTargetElement, currentStepData, calculateSpotlight, calculateTooltipPosition]);

  // Handle visibility with fade in/out
  useEffect(() => {
    if (isActive) {
      setIsVisible(true);
    } else {
      // Fade out before hiding
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isActive]);

  // Add target element highlight class
  useEffect(() => {
    if (stepTargetElement && currentStepData?.type === 'highlight') {
      stepTargetElement.classList.add('tutorial-target');
      stepTargetElement.classList.add(`tutorial-animation-${currentStepData.animation || 'pulse'}`);
      
      return () => {
        stepTargetElement.classList.remove('tutorial-target');
        stepTargetElement.classList.remove(`tutorial-animation-${currentStepData.animation || 'pulse'}`);
      };
    }
  }, [stepTargetElement, currentStepData]);

  // Handle scroll events to update positions
  useEffect(() => {
    const handleScroll = () => {
      if (currentStepData?.type === 'highlight' && stepTargetElement) {
        const newSpotlight = calculateSpotlight();
        const newTooltipPos = calculateTooltipPosition();
        setSpotlight(newSpotlight);
        setTooltipPosition(newTooltipPos);
      }
    };

    const handleResize = () => {
      if (currentStepData?.type === 'highlight' && stepTargetElement) {
        const newSpotlight = calculateSpotlight();
        const newTooltipPos = calculateTooltipPosition();
        setSpotlight(newSpotlight);
        setTooltipPosition(newTooltipPos);
      }
    };

    if (isActive) {
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleResize);
      
      return () => {
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [isActive, currentStepData, stepTargetElement, calculateSpotlight, calculateTooltipPosition]);

  if (!isVisible || !currentStepData) return null;

  const isOverlayStep = currentStepData.type === 'overlay';
  const isHighlightStep = currentStepData.type === 'highlight';

  return (
    <div 
      ref={overlayRef}
      className={`tutorial-overlay ${isActive ? 'active' : ''} ${isAnimating ? 'animating' : ''}`}
      role="dialog"
      aria-labelledby="tutorial-title"
      aria-describedby="tutorial-description"
      aria-live="polite"
    >
      {/* Dark backdrop - only for overlay steps (spotlight creates its own darkening) */}
      {isOverlayStep && <div className="tutorial-backdrop" />}
      
      {/* Spotlight for highlighted elements - includes its own dark overlay via box-shadow */}
      {isHighlightStep && spotlight && (
        <div 
          className="tutorial-spotlight"
          style={{
            left: spotlight.x,
            top: spotlight.y,
            width: spotlight.width,
            height: spotlight.height,
            borderRadius: spotlight.borderRadius
          }}
        />
      )}

      {/* Tooltip component */}
      <TutorialTooltip 
        step={currentStepData}
        position={tooltipPosition}
        isOverlay={isOverlayStep}
        targetElement={stepTargetElement}
      />

      {/* Progress indicator */}
      <div className="tutorial-progress">
        <div className="tutorial-progress-bar">
          <div 
            className="tutorial-progress-fill"
            style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
          />
        </div>
        <span className="tutorial-progress-text">
          {currentStep + 1} of {totalSteps}
        </span>
      </div>

      {/* Controls */}
      <TutorialControls />
    </div>
  );
};

export default TutorialOverlay;