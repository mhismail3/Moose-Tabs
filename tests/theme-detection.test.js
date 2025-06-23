/**
 * Test for JavaScript-based Theme Detection
 * Tests the enhanced theme detection system for Chrome extensions
 */

import { getSystemTheme, applyTheme, watchSystemTheme, initializeTheme } from '../src/utils/themeDetection';

// Mock matchMedia for testing
const createMockMatchMedia = (matches) => {
  return jest.fn().mockImplementation((query) => {
    return {
      matches,
      media: query,
      onchange: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    };
  });
};

describe('Theme Detection Utility', () => {
  let originalMatchMedia;

  beforeEach(() => {
    // Store original matchMedia
    originalMatchMedia = window.matchMedia;
    
    // Reset document classes
    document.documentElement.className = '';
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    // Restore original matchMedia
    window.matchMedia = originalMatchMedia;
  });

  describe('getSystemTheme', () => {
    test('returns dark when system prefers dark mode', () => {
      window.matchMedia = createMockMatchMedia(true);
      
      const theme = getSystemTheme();
      
      expect(theme).toBe('dark');
      expect(window.matchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
    });

    test('returns light when system prefers light mode', () => {
      window.matchMedia = createMockMatchMedia(false);
      
      const theme = getSystemTheme();
      
      expect(theme).toBe('light');
    });

    test('returns light when matchMedia is not available', () => {
      window.matchMedia = undefined;
      
      const theme = getSystemTheme();
      
      expect(theme).toBe('light');
    });
  });

  describe('applyTheme', () => {
    test('applies light theme correctly', () => {
      applyTheme('light');
      
      expect(document.documentElement.classList.contains('theme-light')).toBe(true);
      expect(document.documentElement.classList.contains('theme-dark')).toBe(false);
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });

    test('applies dark theme correctly', () => {
      applyTheme('dark');
      
      expect(document.documentElement.classList.contains('theme-dark')).toBe(true);
      expect(document.documentElement.classList.contains('theme-light')).toBe(false);
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    test('removes previous theme when applying new one', () => {
      // Apply light theme first
      applyTheme('light');
      expect(document.documentElement.classList.contains('theme-light')).toBe(true);
      
      // Apply dark theme
      applyTheme('dark');
      expect(document.documentElement.classList.contains('theme-light')).toBe(false);
      expect(document.documentElement.classList.contains('theme-dark')).toBe(true);
    });
  });

  describe('watchSystemTheme', () => {
    test('sets up event listener when matchMedia is available', () => {
      const mockAddEventListener = jest.fn();
      const mockMatchMedia = jest.fn().mockReturnValue({
        matches: false,
        addEventListener: mockAddEventListener,
        removeEventListener: jest.fn(),
      });
      window.matchMedia = mockMatchMedia;
      
      const callback = jest.fn();
      watchSystemTheme(callback);
      
      expect(mockMatchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
      expect(mockAddEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });

    test('returns cleanup function that removes event listener', () => {
      const mockRemoveEventListener = jest.fn();
      const mockMatchMedia = jest.fn().mockReturnValue({
        matches: false,
        addEventListener: jest.fn(),
        removeEventListener: mockRemoveEventListener,
      });
      window.matchMedia = mockMatchMedia;
      
      const callback = jest.fn();
      const cleanup = watchSystemTheme(callback);
      
      // Call cleanup
      cleanup();
      
      expect(mockRemoveEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });

    test('returns empty cleanup function when matchMedia is not available', () => {
      window.matchMedia = undefined;
      
      const callback = jest.fn();
      const cleanup = watchSystemTheme(callback);
      
      expect(typeof cleanup).toBe('function');
      // Should not throw when called
      expect(() => cleanup()).not.toThrow();
    });
  });

  describe('initializeTheme', () => {
    test('applies initial theme and calls callback', () => {
      window.matchMedia = createMockMatchMedia(true); // Dark mode
      const callback = jest.fn();
      
      initializeTheme(callback);
      
      // Should apply dark theme
      expect(document.documentElement.classList.contains('theme-dark')).toBe(true);
      expect(callback).toHaveBeenCalledWith('dark');
    });

    test('works without callback', () => {
      window.matchMedia = createMockMatchMedia(false); // Light mode
      
      expect(() => initializeTheme()).not.toThrow();
      expect(document.documentElement.classList.contains('theme-light')).toBe(true);
    });

    test('returns cleanup function', () => {
      window.matchMedia = createMockMatchMedia(false);
      
      const cleanup = initializeTheme();
      
      expect(typeof cleanup).toBe('function');
    });
  });

  describe('Integration with DOM', () => {
    test('CSS variables are available after theme application', () => {
      // Apply light theme
      applyTheme('light');
      
      // Check that the document has the theme class
      expect(document.documentElement.classList.contains('theme-light')).toBe(true);
      
      // Apply dark theme
      applyTheme('dark');
      
      // Check that the document has the theme class
      expect(document.documentElement.classList.contains('theme-dark')).toBe(true);
    });
  });
});