/**
 * Theme Detection Utility
 * Handles system theme detection and application for Chrome extensions
 */

/**
 * Detect the current system theme preference
 * @returns {string} 'light' or 'dark'
 */
export function getSystemTheme() {
  // Check if matchMedia is available (should be in most modern browsers)
  if (window.matchMedia) {
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    return darkModeQuery.matches ? 'dark' : 'light';
  }
  
  // Fallback to light theme if matchMedia is not available
  return 'light';
}

/**
 * Apply theme to the document root
 * @param {string} theme - 'light' or 'dark'
 */
export function applyTheme(theme) {
  const root = document.documentElement;
  
  // Remove existing theme classes
  root.classList.remove('theme-light', 'theme-dark');
  
  // Add the new theme class
  root.classList.add(`theme-${theme}`);
  
  // Set a data attribute for CSS targeting
  root.setAttribute('data-theme', theme);
  
  console.log(`Applied theme: ${theme}`);
}

/**
 * Set up a listener for system theme changes
 * @param {Function} callback - Function to call when theme changes
 * @returns {Function} Cleanup function to remove the listener
 */
export function watchSystemTheme(callback) {
  if (!window.matchMedia) {
    console.warn('matchMedia not available - theme watching disabled');
    return () => {}; // Return empty cleanup function
  }
  
  const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
  
  const handleThemeChange = (e) => {
    const newTheme = e.matches ? 'dark' : 'light';
    console.log(`System theme changed to: ${newTheme}`);
    callback(newTheme);
  };
  
  // Add the listener
  darkModeQuery.addEventListener('change', handleThemeChange);
  
  // Return cleanup function
  return () => {
    darkModeQuery.removeEventListener('change', handleThemeChange);
  };
}

/**
 * Initialize theme system - detect and apply current theme
 * @param {Function} callback - Optional callback for theme changes
 * @returns {Function} Cleanup function
 */
export function initializeTheme(callback) {
  // Apply initial theme
  const initialTheme = getSystemTheme();
  applyTheme(initialTheme);
  
  // Call callback with initial theme if provided
  if (callback) {
    callback(initialTheme);
  }
  
  // Set up theme change watching
  return watchSystemTheme((newTheme) => {
    applyTheme(newTheme);
    if (callback) {
      callback(newTheme);
    }
  });
}