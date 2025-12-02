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
  
  // Display settings
  display: {
    mode: 'popup', // 'popup', 'sidebar'
    popupWidth: 400,
    popupHeight: 600,
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
  },

  // AI Integration
  ai: {
    enabled: true,
    provider: 'openrouter', // 'openrouter', 'openai', 'anthropic', 'gemini', 'groq', 'custom'
    model: 'auto-free', // Uses free models with automatic fallback
    customEndpoint: '',
    autoOrganize: false,
    organizationStrategy: 'smart', // 'smart', 'domain', 'topic', 'activity'
  }
};

// Provider configurations for AI
// Free models with automatic fallback
export const AI_PROVIDERS = {
  openrouter: {
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    // Free models to try in order (uses OpenRouter's model fallback feature)
    freeModels: [
      'mistralai/mistral-7b-instruct:free',
      'huggingfaceh4/zephyr-7b-beta:free', 
      'openchat/openchat-7b:free',
      'undi95/toppy-m-7b:free',
    ],
    models: [
      { id: 'auto-free', name: 'Auto (Free Models Only)', free: true },
      // Paid models as backup if user adds credits
      { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini (Paid)', free: false },
    ],
    requiresKey: true,
  },
  openai: {
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    models: [
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', free: false },
      { id: 'gpt-4o', name: 'GPT-4o', free: false },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', free: false },
    ],
    requiresKey: true,
  },
  anthropic: {
    name: 'Anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    models: [
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', free: false },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', free: false },
    ],
    requiresKey: true,
  },
  gemini: {
    name: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    models: [
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', free: false },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', free: false },
    ],
    requiresKey: true,
  },
  groq: {
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    models: [
      { id: 'llama-3.2-3b-preview', name: 'Llama 3.2 3B', free: false },
      { id: 'llama-3.2-1b-preview', name: 'Llama 3.2 1B', free: false },
      { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', free: false },
    ],
    requiresKey: true,
  },
  custom: {
    name: 'Custom Endpoint',
    baseUrl: '',
    models: [],
    requiresKey: false,
  }
};

// Models that should be migrated to auto-free
const DEPRECATED_MODELS = [
  'meta-llama/llama-3.2-1b-instruct:free',
  'meta-llama/llama-3.2-3b-instruct:free',
  'google/gemma-2-9b-it:free',
  'qwen/qwen-2-7b-instruct:free',
  'microsoft/phi-3-mini-128k-instruct:free',
  'google/gemini-2.0-flash-exp:free',
  'nousresearch/deephermes-3-llama-3-8b-preview:free',
  'qwen/qwen3-14b:free',
  'qwen/qwen3-32b:free',
  'openrouter/auto', // This uses paid models, migrate to auto-free
];

/**
 * Get all settings from storage with defaults
 * @returns {Promise<Object>} Settings object
 */
export async function getSettings() {
  try {
    const result = await chrome.storage.local.get('userSettings');
    const storedSettings = result.userSettings || {};
    
    // Deep merge with defaults to handle new settings
    const settings = deepMerge(DEFAULT_SETTINGS, storedSettings);
    
    // Auto-migrate deprecated/unreliable models to auto-free
    if (settings.ai?.model && DEPRECATED_MODELS.includes(settings.ai.model)) {
      console.log(`Migrating model ${settings.ai.model} to auto-free`);
      settings.ai.model = 'auto-free';
      // Save the migrated settings
      await chrome.storage.local.set({ userSettings: settings });
    }
    
    return settings;
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
  // Don't export sensitive data like API keys
  const exportable = { ...settings };
  if (exportable.ai) {
    exportable.ai = { ...exportable.ai };
    // Note: API keys are stored separately for security
  }
  return JSON.stringify(exportable, null, 2);
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

/**
 * Get API key for a provider (stored separately for security)
 * @param {string} provider - Provider name
 * @returns {Promise<string|null>} API key or null
 */
export async function getApiKey(provider) {
  try {
    const result = await chrome.storage.local.get('aiApiKeys');
    const keys = result.aiApiKeys || {};
    return keys[provider] || null;
  } catch (error) {
    console.error('Error getting API key:', error);
    return null;
  }
}

/**
 * Save API key for a provider
 * @param {string} provider - Provider name
 * @param {string} apiKey - API key to save
 * @returns {Promise<void>}
 */
export async function saveApiKey(provider, apiKey) {
  try {
    const result = await chrome.storage.local.get('aiApiKeys');
    const keys = result.aiApiKeys || {};
    keys[provider] = apiKey;
    await chrome.storage.local.set({ aiApiKeys: keys });
    console.log(`API key saved for ${provider}`);
  } catch (error) {
    console.error('Error saving API key:', error);
    throw error;
  }
}

/**
 * Remove API key for a provider
 * @param {string} provider - Provider name
 * @returns {Promise<void>}
 */
export async function removeApiKey(provider) {
  try {
    const result = await chrome.storage.local.get('aiApiKeys');
    const keys = result.aiApiKeys || {};
    delete keys[provider];
    await chrome.storage.local.set({ aiApiKeys: keys });
    console.log(`API key removed for ${provider}`);
  } catch (error) {
    console.error('Error removing API key:', error);
    throw error;
  }
}

/**
 * Check if API key exists for a provider
 * @param {string} provider - Provider name
 * @returns {Promise<boolean>} True if key exists
 */
export async function hasApiKey(provider) {
  const key = await getApiKey(provider);
  return !!key;
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
