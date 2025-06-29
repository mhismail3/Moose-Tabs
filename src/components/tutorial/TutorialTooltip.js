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
              setTimeout(typeText, 100);
            }
          };
          
          setTimeout(typeText, 1000);
        }
      };

      const timer = setTimeout(startDemo, 500);
      return () => clearTimeout(timer);
    }
  }, [step, isAnimating]);

  // Auto-advance for certain demo steps
  useEffect(() => {
    if (step.showDemo && showDemo && step.id === 'search') {
      const timer = setTimeout(() => {
        nextStep();
      }, 4000); // Auto-advance after demo
      
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
    
    const targetRect = targetElement.getBoundingClientRect();
    const tooltipRect = { width: 320, height: 120 }; // Approximate tooltip size
    
    switch (step.position) {
      case 'top':
        return {
          bottom: '-8px',
          left: '50%',
          transform: 'translateX(-50%)'
        };
      case 'bottom':
        return {
          top: '-8px',
          left: '50%',
          transform: 'translateX(-50%)'
        };
      case 'left':
        return {
          right: '-8px',
          top: '50%',
          transform: 'translateY(-50%)'
        };
      case 'right':
        return {
          left: '-8px',
          top: '50%',
          transform: 'translateY(-50%)'
        };
      default:
        return {};
    }
  };

  const arrowDirection = getArrowDirection();
  const arrowStyle = getArrowPosition();

  return (
    <div 
      className={`tutorial-tooltip ${isOverlay ? 'overlay-style' : 'highlight-style'} ${step.animation ? `animation-${step.animation}` : ''}`}
      style={isOverlay ? {} : { 
        position: 'absolute',
        left: position.x,
        top: position.y,
        transform: 'none' // Override any CSS transform
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

        {/* Demo content for search step only */}
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

        {/* Completion celebration */}
        {step.isCompletion && (
          <div className="tutorial-celebration">
            <div className="celebration-particles">
              {[...Array(12)].map((_, i) => (
                <div key={i} className={`particle particle-${i + 1}`}>
                  {['🎉', '🎊', '✨', '🌟'][i % 4]}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TutorialTooltip;