/**
 * Basic test for tutorial system integration
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import TabTreeComponent from '../src/components/TabTreeComponent';
import { TUTORIAL_STEPS } from '../src/components/tutorial/TutorialContext';
import '@testing-library/jest-dom';

// Mock chrome APIs
global.chrome = {
  runtime: {
    sendMessage: jest.fn()
  },
  storage: {
    local: {
      get: jest.fn().mockResolvedValue({}),
      set: jest.fn().mockResolvedValue(),
      remove: jest.fn().mockResolvedValue()
    }
  }
};

// Wrapper component for testing
const TestWrapper = ({ children }) => (
  <DndProvider backend={HTML5Backend}>
    {children}
  </DndProvider>
);

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

describe('Tutorial Basic Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should render TabTreeComponent without crashing with tutorial system', () => {
    expect(() => {
      render(
        <TestWrapper>
          <TabTreeComponent tabHierarchy={mockTabHierarchy} />
        </TestWrapper>
      );
    }).not.toThrow();
  });

  test('should have tutorial steps configuration', () => {
    expect(TUTORIAL_STEPS).toBeDefined();
    expect(TUTORIAL_STEPS.length).toBe(8);
    expect(TUTORIAL_STEPS[0].id).toBe('welcome');
    expect(TUTORIAL_STEPS[TUTORIAL_STEPS.length - 1].id).toBe('completion');
  });

  test('should render tutorial components without errors', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    render(
      <TestWrapper>
        <TabTreeComponent tabHierarchy={mockTabHierarchy} />
      </TestWrapper>
    );

    // Should not have any console errors from missing components
    expect(consoleSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('Warning: Failed to resolve entry')
    );
    
    consoleSpy.mockRestore();
  });

  test('should render tab tree content', () => {
    render(
      <TestWrapper>
        <TabTreeComponent tabHierarchy={mockTabHierarchy} />
      </TestWrapper>
    );

    // Basic tab tree elements should be present
    expect(screen.getByPlaceholderText('Search tabs')).toBeInTheDocument();
    expect(screen.getByText('Google')).toBeInTheDocument();
    expect(screen.getByText(/Window 100/)).toBeInTheDocument();
  });
});