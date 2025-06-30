// Jest setup file to configure global mocks and test environment
import '@testing-library/jest-dom';

// Mock all Chrome APIs globally
global.chrome = {
  runtime: {
    sendMessage: jest.fn(() => Promise.resolve({ success: true })),
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    }
  },
  storage: {
    local: {
      get: jest.fn(() => Promise.resolve({})),
      set: jest.fn(() => Promise.resolve())
    }
  },
  contextMenus: {
    create: jest.fn(),
    onClicked: {
      addListener: jest.fn()
    }
  },
  tabs: {
    create: jest.fn(),
    query: jest.fn(() => Promise.resolve([]))
  }
};

// Mock React hooks used throughout the app
// Create a mock function that can be overridden in individual tests
const mockUseDragDrop = jest.fn(() => ({
  isDragging: false,
  isOver: false,
  canDrop: false,
  showInvalid: false,
  dropZoneType: null,
  dragDropRef: { current: null },
  handleTabMove: jest.fn()
}));

jest.mock('../src/components/hooks/useDragDrop', () => ({
  useDragDrop: mockUseDragDrop
}));

// Export the mock so tests can override it
global.mockUseDragDrop = mockUseDragDrop;

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

// Mock i18n utilities
jest.mock('../src/utils/i18n', () => ({
  getMessage: jest.fn((key, params, fallback) => fallback || key),
  getTabItemAriaLabel: jest.fn((title) => `Tab: ${title}`)
}));

// React DND is mocked via moduleNameMapper in package.json

// Suppress console warnings during tests (optional)
const originalConsoleWarn = console.warn;
console.warn = (...args) => {
  // Only suppress React DevTools warnings, keep other warnings
  if (args[0] && args[0].includes('ReactDOMTestUtils.act is deprecated')) {
    return;
  }
  if (args[0] && args[0].includes('An update to')) {
    return;
  }
  originalConsoleWarn(...args);
};

// Setup fake timers for all tests
beforeEach(() => {
  jest.clearAllMocks();
});