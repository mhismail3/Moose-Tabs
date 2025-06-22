/**
 * Test for Task 2.1: Basic React App in Sidebar
 * TDD Test: Check if React application renders "Hello Moose-Tabs" message
 */

import { render, screen } from '@testing-library/react';
import App from '../src/App';

// Mock Chrome APIs for testing
global.chrome = {
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn()
    }
  }
};

// These tests will fail initially - implementing TDD approach
describe('React Sidebar App', () => {
  test('renders Hello Moose-Tabs message', () => {
    render(<App />);
    const helloElement = screen.getByText(/Hello Moose-Tabs/i);
    expect(helloElement).toBeInTheDocument();
  });

  test('mounts React app without errors', () => {
    const { container } = render(<App />);
    expect(container.firstChild).not.toBeNull();
  });

  test('renders app in sidebar container', () => {
    render(<App />);
    const sidebarContainer = screen.getByTestId('sidebar-container');
    expect(sidebarContainer).toBeInTheDocument();
  });
});