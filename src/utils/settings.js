/**
 * Settings Management Utility
 * Handles extension settings storage, retrieval, and defaults
 */

// Default settings configuration
export const DEFAULT_SETTINGS = {
  // Theme preferences
  theme: {
    mode: 'auto', // 'light', 'dark', 'auto'
  },
  
  // Appearance settings
  appearance: {
    viewDensity: 'compact', // 'compact', 'normal', 'comfortable'
    showTabUrls: true,
    showFavicons: true,
    reducedMotion: false,
  },
  
  // Tab management
  tabManagement: {
    defaultExpandState: 'expanded', // 'expanded', 'collapsed'
    autoGroupByDomain: false,
    confirmTabClose: false,
    dragSensitivity: 'normal', // 'low', 'normal', 'high'
  },
  
  // Search preferences
  search: {
    caseSensitive: false,
    searchInUrls: true,
    highlightResults: true,
  },
  
  // Tutorial settings
  tutorial: {
    autoStart: true,
    completed: false,
    currentStep: 0,
  },
  
  // Accessibility
  accessibility: {
    highContrast: false,
    announceChanges: true,
  }
};

/**
 * Get all settings from storage with defaults
 * @returns {Promise<Object>} Settings object
 */
export async function getSettings() {
  try {
    const result = await chrome.storage.local.get('userSettings');
    const storedSettings = result.userSettings || {};
    
    // Deep merge with defaults to handle new settings
    return deepMerge(DEFAULT_SETTINGS, storedSettings);
  } catch (error) {
    console.error('Error loading settings:', error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Save settings to storage
 * @param {Object} settings - Settings object to save
 * @returns {Promise<void>}
 */
export async function saveSettings(settings) {
  try {
    await chrome.storage.local.set({ userSettings: settings });
    console.log('Settings saved successfully');
  } catch (error) {
    console.error('Error saving settings:', error);
    throw error;
  }
}

/**
 * Get a specific setting by path
 * @param {string} path - Dot notation path (e.g., 'theme.mode')
 * @returns {Promise<any>} Setting value
 */
export async function getSetting(path) {
  const settings = await getSettings();
  return getNestedValue(settings, path);
}

/**
 * Update a specific setting by path
 * @param {string} path - Dot notation path (e.g., 'theme.mode')
 * @param {any} value - New value
 * @returns {Promise<void>}
 */
export async function updateSetting(path, value) {
  const settings = await getSettings();
  setNestedValue(settings, path, value);
  await saveSettings(settings);
}

/**
 * Reset all settings to defaults
 * @returns {Promise<void>}
 */
export async function resetSettings() {
  await saveSettings(DEFAULT_SETTINGS);
}

/**
 * Export settings as JSON
 * @returns {Promise<string>} JSON string of settings
 */
export async function exportSettings() {
  const settings = await getSettings();
  return JSON.stringify(settings, null, 2);
}

/**
 * Import settings from JSON
 * @param {string} jsonString - JSON string of settings
 * @returns {Promise<void>}
 */
export async function importSettings(jsonString) {
  try {
    const importedSettings = JSON.parse(jsonString);
    // Validate and merge with defaults to ensure all required fields exist
    const mergedSettings = deepMerge(DEFAULT_SETTINGS, importedSettings);
    await saveSettings(mergedSettings);
  } catch (error) {
    console.error('Error importing settings:', error);
    throw new Error('Invalid settings file format');
  }
}

/**
 * Check if settings have been customized from defaults
 * @returns {Promise<boolean>} True if settings differ from defaults
 */
export async function hasCustomSettings() {
  const settings = await getSettings();
  return !deepEqual(settings, DEFAULT_SETTINGS);
}

/**
 * Open settings page in a new tab
 */
export function openSettingsPage() {
  const settingsUrl = chrome.runtime.getURL('settings.html');
  chrome.tabs.create({ url: settingsUrl });
}

// Utility functions

/**
 * Deep merge two objects
 * @param {Object} target - Target object
 * @param {Object} source - Source object
 * @returns {Object} Merged object
 */
function deepMerge(target, source) {
  const result = { ...target };
  
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
  }
  
  return result;
}

/**
 * Get nested value by dot notation path
 * @param {Object} obj - Object to search
 * @param {string} path - Dot notation path
 * @returns {any} Value at path
 */
function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Set nested value by dot notation path
 * @param {Object} obj - Object to modify
 * @param {string} path - Dot notation path
 * @param {any} value - Value to set
 */
function setNestedValue(obj, path, value) {
  const keys = path.split('.');
  const lastKey = keys.pop();
  const target = keys.reduce((current, key) => {
    if (!(key in current)) current[key] = {};
    return current[key];
  }, obj);
  target[lastKey] = value;
}

/**
 * Deep equality check
 * @param {any} a - First value
 * @param {any} b - Second value
 * @returns {boolean} True if deeply equal
 */
function deepEqual(a, b) {
  if (a === b) return true;
  
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    
    const keys = Object.keys(a);
    if (keys.length !== Object.keys(b).length) return false;
    
    return keys.every(key => deepEqual(a[key], b[key]));
  }
  
  return false;
}