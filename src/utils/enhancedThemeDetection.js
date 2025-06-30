/**
 * Enhanced Theme Detection with Settings Support
 * Handles theme detection with user preference overrides
 */

import { getSystemTheme, applyTheme, watchSystemTheme } from './themeDetection';
import { getSetting } from './settings';

/**
 * Get the effective theme based on user settings
 * @returns {Promise<string>} 'light' or 'dark'
 */
export async function getEffectiveTheme() {
  try {
    const themeMode = await getSetting('theme.mode');
    
    switch (themeMode) {
      case 'light':
        return 'light';
      case 'dark':
        return 'dark';
      case 'auto':
      default:
        return getSystemTheme();
    }
  } catch (error) {
    console.warn('Failed to load theme settings, falling back to system theme:', error);
    return getSystemTheme();
  }
}

/**
 * Apply the effective theme based on user settings
 * @returns {Promise<string>} Applied theme
 */
export async function applyEffectiveTheme() {
  const theme = await getEffectiveTheme();
  applyTheme(theme);
  return theme;
}

/**
 * Initialize enhanced theme system with settings support
 * @param {Function} callback - Optional callback for theme changes
 * @returns {Promise<Function>} Cleanup function
 */
export async function initializeEnhancedTheme(callback) {
  // Apply initial theme based on settings
  const initialTheme = await applyEffectiveTheme();
  
  if (callback) {
    callback(initialTheme);
  }

  // Set up system theme watching (only affects auto mode)
  const systemThemeCleanup = watchSystemTheme(async (systemTheme) => {
    const themeMode = await getSetting('theme.mode');
    
    // Only apply system theme changes if in auto mode
    if (themeMode === 'auto') {
      applyTheme(systemTheme);
      if (callback) {
        callback(systemTheme);
      }
    }
  });

  // Listen for settings changes
  const handleSettingsMessage = async (message) => {
    if (message.action === 'settingsUpdated' && message.changedPath === 'theme.mode') {
      const newTheme = await applyEffectiveTheme();
      if (callback) {
        callback(newTheme);
      }
    }
  };

  if (chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener(handleSettingsMessage);
  }

  // Return cleanup function
  return () => {
    systemThemeCleanup();
    if (chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.removeListener(handleSettingsMessage);
    }
  };
}

/**
 * Force apply a specific theme mode (used by settings page for preview)
 * @param {string} mode - 'light', 'dark', or 'auto'
 * @returns {Promise<string>} Applied theme
 */
export async function applyThemeMode(mode) {
  let theme;
  
  switch (mode) {
    case 'light':
      theme = 'light';
      break;
    case 'dark':
      theme = 'dark';
      break;
    case 'auto':
    default:
      theme = getSystemTheme();
      break;
  }
  
  applyTheme(theme);
  return theme;
}