import React from 'react';
import { useTutorial } from './TutorialContext';

const TutorialControls = () => {
  const { 
    currentStep, 
    totalSteps, 
    currentStepData,
    nextStep, 
    previousStep, 
    skipTutorial, 
    completeTutorial,
    isAnimating 
  } = useTutorial();

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;
  const showControls = currentStepData?.showControls !== false;

  if (!showControls) return null;

  return (
    <div className="tutorial-controls">
      {/* Skip button - always available except on completion */}
      {!currentStepData?.isCompletion && (
        <button
          className="tutorial-btn tutorial-btn-skip"
          onClick={skipTutorial}
          disabled={isAnimating}
          aria-label="Skip tutorial"
        >
          Skip Tutorial
        </button>
      )}

      <div className="tutorial-nav-buttons">
        {/* Previous button */}
        {!isFirstStep && !currentStepData?.isCompletion && (
          <button
            className="tutorial-btn tutorial-btn-secondary"
            onClick={previousStep}
            disabled={isAnimating}
            aria-label="Previous step"
          >
            ← Previous
          </button>
        )}

        {/* Next/Finish button */}
        <button
          className={`tutorial-btn ${isLastStep || currentStepData?.isCompletion ? 'tutorial-btn-completion' : 'tutorial-btn-primary'}`}
          onClick={currentStepData?.isCompletion ? completeTutorial : nextStep}
          disabled={isAnimating}
          aria-label={
            currentStepData?.isCompletion 
              ? 'Finish tutorial' 
              : isLastStep 
                ? 'Finish' 
                : 'Next step'
          }
        >
          {currentStepData?.isCompletion ? (
            <>
              🚀 Let's Go!
            </>
          ) : isLastStep ? (
            'Finish'
          ) : (
            'Next →'
          )}
        </button>
      </div>

      {/* Keyboard shortcut hints */}
      <div className="tutorial-keyboard-hints">
        <span className="keyboard-hint">
          <kbd>Esc</kbd> to skip
        </span>
        {!isLastStep && (
          <span className="keyboard-hint">
            <kbd>→</kbd> next
          </span>
        )}
        {!isFirstStep && (
          <span className="keyboard-hint">
            <kbd>←</kbd> previous
          </span>
        )}
      </div>
    </div>
  );
};

export default TutorialControls;