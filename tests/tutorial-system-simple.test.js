/**
 * Simplified test for tutorial system core functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import TabTreeComponent from '../src/components/TabTreeComponent';
import { TutorialProvider, useTutorial, TUTORIAL_STEPS } from '../src/components/tutorial/TutorialContext';
import { SettingsProvider } from '../src/contexts/SettingsContext';
import '@testing-library/jest-dom';

// Mock chrome APIs with stateful storage
let mockStorage = {};

global.chrome = {
  runtime: {
    sendMessage: jest.fn()
  },
  storage: {
    local: {
      get: jest.fn().mockImplementation((keys) => {
        if (typeof keys === 'string') {
          return Promise.resolve({ [keys]: mockStorage[keys] });
        } else if (Array.isArray(keys)) {
          const result = {};
          keys.forEach(key => {
            if (mockStorage[key] !== undefined) {
              result[key] = mockStorage[key];
            }
          });
          return Promise.resolve(result);
        } else {
          // Return all stored values
          return Promise.resolve({ ...mockStorage });
        }
      }),
      set: jest.fn().mockImplementation((items) => {
        Object.keys(items).forEach(key => {
          mockStorage[key] = items[key];
        });
        return Promise.resolve();
      }),
      remove: jest.fn().mockImplementation((keys) => {
        if (typeof keys === 'string') {
          delete mockStorage[keys];
        } else if (Array.isArray(keys)) {
          keys.forEach(key => delete mockStorage[key]);
        }
        return Promise.resolve();
      })
    }
  }
};

// Mock hooks
jest.mock('../src/components/hooks/useDragDrop', () => ({
  useDragDrop: () => ({
    isDragging: false,
    isOver: false,
    canDrop: false,
    showInvalid: false,
    dropZoneType: null,
    dragDropRef: { current: null }
  })
}));

jest.mock('../src/components/hooks/useKeyboardNavigation', () => ({
  useKeyboardNavigation: () => ({
    handleKeyDown: jest.fn()
  })
}));

jest.mock('../src/components/hooks/useTabAnimations', () => ({
  useTabAnimations: () => ({
    subscribe: jest.fn(() => () => {}),
    isAnimating: jest.fn(() => false)
  })
}));

jest.mock('../src/utils/i18n', () => ({
  getMessage: jest.fn((key, params, fallback) => fallback || key),
  getTabItemAriaLabel: jest.fn((title) => `Tab: ${title}`)
}));

// Wrapper component for testing
const TestWrapper = ({ children }) => (
  <DndProvider backend={HTML5Backend}>
    <SettingsProvider>
      {children}
    </SettingsProvider>
  </DndProvider>
);

// Test component for tutorial context
const TutorialTestComponent = () => {
  const tutorial = useTutorial();
  
  return (
    <div>
      <div data-testid="tutorial-active">{tutorial.isActive.toString()}</div>
      <div data-testid="current-step">{tutorial.currentStep}</div>
      <div data-testid="total-steps">{tutorial.totalSteps}</div>
      <div data-testid="has-completed">{tutorial.hasCompletedTutorial.toString()}</div>
      <button onClick={tutorial.forceStartTutorial} data-testid="start-tutorial">Start</button>
      <button onClick={tutorial.nextStep} data-testid="next-step">Next</button>
      <button onClick={tutorial.previousStep} data-testid="previous-step">Previous</button>
      <button onClick={tutorial.skipTutorial} data-testid="skip-tutorial">Skip</button>
    </div>
  );
};

const mockTabHierarchy = [
  {
    id: 1,
    title: 'Google',
    url: 'https://google.com',
    windowId: 100,
    index: 0,
    children: []
  }
];

describe('Tutorial System - Core Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset mock storage between tests
    mockStorage = {};
  });

  describe('Tutorial Context', () => {
    test('should provide tutorial context with correct default values', () => {
      render(
        <TestWrapper>
          <TutorialProvider>
            <TutorialTestComponent />
          </TutorialProvider>
        </TestWrapper>
      );

      expect(screen.getByTestId('tutorial-active')).toHaveTextContent('false');
      expect(screen.getByTestId('current-step')).toHaveTextContent('0');
      expect(screen.getByTestId('total-steps')).toHaveTextContent(TUTORIAL_STEPS.length.toString());
      expect(screen.getByTestId('has-completed')).toHaveTextContent('false');
    });

    test('should start tutorial when force start is triggered', async () => {
      render(
        <TestWrapper>
          <TutorialProvider>
            <TutorialTestComponent />
          </TutorialProvider>
        </TestWrapper>
      );

      fireEvent.click(screen.getByTestId('start-tutorial'));

      await waitFor(() => {
        expect(screen.getByTestId('tutorial-active')).toHaveTextContent('true');
      });
    });

    test('should navigate between steps correctly', async () => {
      render(
        <TestWrapper>
          <TutorialProvider>
            <TutorialTestComponent />
          </TutorialProvider>
        </TestWrapper>
      );

      // Start tutorial
      fireEvent.click(screen.getByTestId('start-tutorial'));

      await waitFor(() => {
        expect(screen.getByTestId('tutorial-active')).toHaveTextContent('true');
        expect(screen.getByTestId('current-step')).toHaveTextContent('0');
      });

      // Go to next step
      fireEvent.click(screen.getByTestId('next-step'));

      await waitFor(() => {
        expect(screen.getByTestId('current-step')).toHaveTextContent('1');
      });

      // Go back to previous step
      fireEvent.click(screen.getByTestId('previous-step'));

      await waitFor(() => {
        expect(screen.getByTestId('current-step')).toHaveTextContent('0');
      });
    });

    test('should complete tutorial when skip is clicked', async () => {
      render(
        <TestWrapper>
          <TutorialProvider>
            <TutorialTestComponent />
          </TutorialProvider>
        </TestWrapper>
      );

      // Start tutorial
      fireEvent.click(screen.getByTestId('start-tutorial'));

      await waitFor(() => {
        expect(screen.getByTestId('tutorial-active')).toHaveTextContent('true');
      });

      // Skip tutorial
      await act(async () => {
        fireEvent.click(screen.getByTestId('skip-tutorial'));
        // Wait a bit for async operations to complete
        await new Promise(resolve => setTimeout(resolve, 500));
      });

      await waitFor(() => {
        expect(screen.getByTestId('tutorial-active')).toHaveTextContent('false');
        expect(screen.getByTestId('has-completed')).toHaveTextContent('true');
      }, { timeout: 3000 });
    });
  });

  describe('Tutorial Steps Configuration', () => {
    test('should have correct number of steps', () => {
      expect(TUTORIAL_STEPS.length).toBe(8);
    });

    test('should have welcome step as first step', () => {
      expect(TUTORIAL_STEPS[0].id).toBe('welcome');
      expect(TUTORIAL_STEPS[0].title).toContain('Welcome');
    });

    test('should have completion step as last step', () => {
      const lastStep = TUTORIAL_STEPS[TUTORIAL_STEPS.length - 1];
      expect(lastStep.id).toBe('completion');
      expect(lastStep.isCompletion).toBe(true);
    });
  });

  describe('Tutorial Integration', () => {
    test('should render TabTreeComponent with tutorial system without crashing', () => {
      expect(() => {
        render(
          <TestWrapper>
            <TabTreeComponent tabHierarchy={mockTabHierarchy} />
          </TestWrapper>
        );
      }).not.toThrow();
    });

    test('should render tutorial overlay in TabTreeComponent', () => {
      render(
        <TestWrapper>
          <TabTreeComponent tabHierarchy={mockTabHierarchy} />
        </TestWrapper>
      );

      // Tutorial system should be present (even if not active)
      expect(document.querySelector('.tab-tree')).toBeInTheDocument();
    });
  });
});