import React, { useEffect, useState } from 'react';
import { useTutorial } from './TutorialContext';

const TutorialTooltip = ({ step, position, isOverlay, targetElement }) => {
  const { nextStep, isAnimating } = useTutorial();
  const [showDemo, setShowDemo] = useState(false);
  const [demoText, setDemoText] = useState('');

  // Handle demo animations for interactive steps
  useEffect(() => {
    if (step.showDemo && !isAnimating) {
      const startDemo = () => {
        setShowDemo(true);
        
        if (step.demoText) {
          // Typing animation for search demo
          let currentText = '';
          let charIndex = 0;
          const typeText = () => {
            if (charIndex < step.demoText.length) {
              currentText += step.demoText[charIndex];
              setDemoText(currentText);
              charIndex++;
              setTimeout(typeText, 80);
            }
          };
          
          setTimeout(typeText, 800);
        }
      };

      const timer = setTimeout(startDemo, 400);
      return () => clearTimeout(timer);
    }
  }, [step, isAnimating]);

  // Auto-advance for certain demo steps
  useEffect(() => {
    if (step.showDemo && showDemo && step.id === 'search') {
      const timer = setTimeout(() => {
        nextStep();
      }, 3500);
      
      return () => clearTimeout(timer);
    }
  }, [step, showDemo, nextStep]);

  const getArrowDirection = () => {
    if (isOverlay) return null;
    
    switch (step.position) {
      case 'top': return 'down';
      case 'bottom': return 'up';
      case 'left': return 'right';
      case 'right': return 'left';
      default: return null;
    }
  };

  const getArrowPosition = () => {
    if (!targetElement || isOverlay) return {};
    
    switch (step.position) {
      case 'top':
        return {
          bottom: '-6px',
          left: '50%',
          transform: 'translateX(-50%)'
        };
      case 'bottom':
        return {
          top: '-6px',
          left: '50%',
          transform: 'translateX(-50%)'
        };
      case 'left':
        return {
          right: '-6px',
          top: '50%',
          transform: 'translateY(-50%)'
        };
      case 'right':
        return {
          left: '-6px',
          top: '50%',
          transform: 'translateY(-50%)'
        };
      default:
        return {};
    }
  };

  const arrowDirection = getArrowDirection();
  const arrowStyle = getArrowPosition();

  // Checkmark SVG for completion
  const CheckmarkIcon = () => (
    <svg 
      className="celebration-checkmark" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="3" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );

  return (
    <div 
      className={`tutorial-tooltip ${isOverlay ? 'overlay-style' : 'highlight-style'}`}
      style={isOverlay ? {} : { 
        position: 'absolute',
        left: position.x,
        top: position.y,
        transform: 'none'
      }}
    >
      {/* Arrow pointer for highlight tooltips */}
      {!isOverlay && arrowDirection && (
        <div 
          className={`tutorial-arrow tutorial-arrow-${arrowDirection}`}
          style={arrowStyle}
        />
      )}

      {/* Content */}
      <div className="tutorial-tooltip-content">
        <h3 id="tutorial-title" className="tutorial-title">
          {step.title}
        </h3>
        
        <p id="tutorial-description" className="tutorial-description">
          {step.description}
        </p>

        {/* Demo content for search step */}
        {step.showDemo && showDemo && step.id === 'search' && (
          <div className="tutorial-demo">
            <div className="tutorial-demo-search">
              <div className="demo-search-bar">
                <span className="demo-typing">{demoText}</span>
                <span className="demo-cursor">|</span>
              </div>
            </div>
          </div>
        )}

        {/* Elegant completion celebration */}
        {step.isCompletion && (
          <div className="tutorial-celebration">
            {/* Subtle confetti dots */}
            <div className="celebration-confetti">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="confetti-dot" />
              ))}
            </div>
            
            {/* Success ring with checkmark */}
            <div className="celebration-success-ring">
              <CheckmarkIcon />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TutorialTooltip;
