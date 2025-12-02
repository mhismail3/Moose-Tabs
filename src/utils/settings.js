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
    superchargedMode: false, // Enable premium features with paid API keys
    superchargedModel: null, // Override model for supercharged mode (null = auto-select best)
  },

  // AI Actions - Custom prompts for tab analysis
  aiActions: {
    customPrompts: [], // User-created prompts
  }
};

// Providers that support supercharged mode (premium features)
export const SUPERCHARGED_PROVIDERS = ['openai', 'anthropic', 'gemini'];

// Recommended models for supercharged mode by provider
export const SUPERCHARGED_MODELS = {
  anthropic: {
    default: 'claude-sonnet-4-5-20250929',
    models: [
      { id: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5 (Recommended)', supportsThinking: true },
      { id: 'claude-opus-4-5-20251101', name: 'Claude Opus 4.5 (Most Intelligent)', supportsThinking: true },
      { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5 (Fastest)', supportsThinking: true },
      { id: 'claude-opus-4-1-20250805', name: 'Claude Opus 4.1', supportsThinking: true },
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', supportsThinking: false },
    ]
  },
  openai: {
    default: 'gpt-5.1',
    models: [
      { id: 'gpt-5.1', name: 'GPT-5.1 (Latest)', supportsThinking: false },
      { id: 'gpt-5', name: 'GPT-5', supportsThinking: false },
      { id: 'o3', name: 'o3 (Reasoning)', supportsThinking: true },
      { id: 'o3-pro', name: 'o3 Pro', supportsThinking: true },
      { id: 'gpt-4.1', name: 'GPT-4.1', supportsThinking: false },
      { id: 'gpt-4o', name: 'GPT-4o', supportsThinking: false },
    ]
  },
  gemini: {
    default: 'gemini-3-pro-preview',
    models: [
      { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro (Latest)', supportsThinking: true },
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', supportsThinking: true },
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', supportsThinking: true },
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', supportsThinking: false },
    ]
  }
};

// Default AI Action prompts
export const DEFAULT_AI_PROMPTS = [
  {
    id: 'summarize',
    name: 'Summarize',
    icon: '📝',
    description: 'Get a summary of what these tabs are about',
    prompt: 'Analyze these browser tabs and provide a concise summary of what they collectively represent. What topics, themes, or tasks do they relate to? Provide a brief overview in 2-3 sentences.',
    category: 'analysis',
    isDefault: true,
  },
  {
    id: 'find-duplicates',
    name: 'Find Duplicates',
    icon: '🔍',
    description: 'Identify tabs with similar or duplicate content',
    prompt: 'Analyze these browser tabs and identify any that appear to be duplicates or have very similar content. List any groups of tabs that cover the same topic or webpage. Format as a list with the tab titles and why they are similar.',
    category: 'cleanup',
    isDefault: true,
  },
  {
    id: 'suggest-categories',
    name: 'Suggest Categories',
    icon: '🏷️',
    description: 'Suggest how to categorize these tabs',
    prompt: 'Analyze these browser tabs and suggest logical categories or groups for organizing them. Provide category names and list which tabs belong to each. Be specific and practical.',
    category: 'organization',
    isDefault: true,
  },
  {
    id: 'cleanup-suggestions',
    name: 'Cleanup Suggestions',
    icon: '🧹',
    description: 'Recommend tabs you might want to close',
    prompt: 'Analyze these browser tabs and suggest which ones might be safe to close. Consider: tabs that seem outdated, tabs with temporary content (search results, expired deals), or tabs that might be duplicates. Explain your reasoning for each suggestion.',
    category: 'cleanup',
    isDefault: true,
  },
  {
    id: 'find-important',
    name: 'Find Important',
    icon: '⭐',
    description: 'Identify potentially important tabs',
    prompt: 'Analyze these browser tabs and identify which ones appear to be most important or high-priority. Consider: tabs related to work, deadlines, important communications, or ongoing tasks. Rank them by likely importance and explain why.',
    category: 'analysis',
    isDefault: true,
  },
  {
    id: 'research-summary',
    name: 'Research Summary',
    icon: '📚',
    description: 'Summarize research across tabs',
    prompt: 'These tabs appear to be part of a research session. Synthesize the information across these tabs into a coherent research summary. What are the main findings, themes, or conclusions that can be drawn from this collection of tabs?',
    category: 'analysis',
    isDefault: true,
  },
  {
    id: 'find-related',
    name: 'Find Related',
    icon: '🔗',
    description: 'Find tabs that are related to each other',
    prompt: 'Analyze these browser tabs and identify connections between them. Which tabs are related to each other and how? Group related tabs together and explain the relationships.',
    category: 'organization',
    isDefault: true,
  },
  {
    id: 'task-analysis',
    name: 'Task Analysis',
    icon: '⏰',
    description: 'Analyze what tasks these tabs represent',
    prompt: 'Analyze these browser tabs and identify what tasks or activities they represent. What is the user likely trying to accomplish? List the apparent tasks and which tabs relate to each task.',
    category: 'analysis',
    isDefault: true,
  },
];

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
      { id: 'openai/gpt-4o', name: 'GPT-4o (Paid)', free: false },
      { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet (Paid)', free: false },
    ],
    requiresKey: true,
  },
  openai: {
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    models: [
      // GPT-5 series (Latest - Dec 2025)
      { id: 'gpt-5.1', name: 'GPT-5.1 (Latest)', free: false },
      { id: 'gpt-5', name: 'GPT-5', free: false },
      { id: 'gpt-5-mini', name: 'GPT-5 Mini', free: false },
      { id: 'gpt-5-nano', name: 'GPT-5 Nano', free: false },
      { id: 'gpt-5-pro', name: 'GPT-5 Pro', free: false },
      // o-series reasoning models
      { id: 'o3', name: 'o3 (Reasoning)', free: false },
      { id: 'o3-pro', name: 'o3 Pro', free: false },
      { id: 'o3-mini', name: 'o3 Mini', free: false },
      { id: 'o4-mini', name: 'o4 Mini', free: false },
      { id: 'o1', name: 'o1', free: false },
      { id: 'o1-pro', name: 'o1 Pro', free: false },
      // GPT-4.1 series
      { id: 'gpt-4.1', name: 'GPT-4.1', free: false },
      { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', free: false },
      { id: 'gpt-4.1-nano', name: 'GPT-4.1 Nano', free: false },
      // GPT-4o series
      { id: 'gpt-4o', name: 'GPT-4o', free: false },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', free: false },
      // Legacy
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', free: false },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo (Legacy)', free: false },
    ],
    requiresKey: true,
  },
  anthropic: {
    name: 'Anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    models: [
      // Claude 4.5 (Latest - Dec 2025)
      { id: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5 (Recommended)', free: false, supportsThinking: true },
      { id: 'claude-opus-4-5-20251101', name: 'Claude Opus 4.5 (Most Intelligent)', free: false, supportsThinking: true },
      { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5 (Fastest)', free: false, supportsThinking: true },
      // Claude 4.1
      { id: 'claude-opus-4-1-20250805', name: 'Claude Opus 4.1', free: false, supportsThinking: true },
      // Claude 3.5
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', free: false },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', free: false },
      // Claude 3
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', free: false },
      { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', free: false },
      { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', free: false },
    ],
    requiresKey: true,
  },
  gemini: {
    name: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    models: [
      // Gemini 3 (Latest - Dec 2025)
      { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro (Latest)', free: false },
      // Gemini 2.5
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', free: false },
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', free: false },
      { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash-Lite', free: false },
      // Gemini 2.0
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', free: false },
      { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash-Lite', free: false },
    ],
    requiresKey: true,
  },
  groq: {
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    models: [
      // Llama 4 (Latest - Dec 2025)
      { id: 'meta-llama/llama-4-maverick-17b-128e-instruct', name: 'Llama 4 Maverick 17B', free: false },
      { id: 'meta-llama/llama-4-scout-17b-16e-instruct', name: 'Llama 4 Scout 17B', free: false },
      // OpenAI Open Source
      { id: 'openai/gpt-oss-120b', name: 'GPT-OSS 120B', free: false },
      { id: 'openai/gpt-oss-20b', name: 'GPT-OSS 20B', free: false },
      // Llama 3.3
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', free: false },
      // Llama 3.1
      { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B', free: false },
      // Qwen
      { id: 'qwen/qwen3-32b', name: 'Qwen 3 32B', free: false },
      // Kimi
      { id: 'moonshotai/kimi-k2-instruct-0905', name: 'Kimi K2', free: false },
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

// AI Actions prompt management

/**
 * Get all AI action prompts (default + custom)
 * @returns {Promise<Array>} Array of prompt objects
 */
export async function getAIPrompts() {
  const settings = await getSettings();
  const customPrompts = settings.aiActions?.customPrompts || [];
  // Combine default prompts with custom prompts
  return [...DEFAULT_AI_PROMPTS, ...customPrompts];
}

/**
 * Get custom AI prompts only
 * @returns {Promise<Array>} Array of custom prompt objects
 */
export async function getCustomAIPrompts() {
  const settings = await getSettings();
  return settings.aiActions?.customPrompts || [];
}

/**
 * Save a custom AI prompt
 * @param {Object} prompt - Prompt object with id, name, icon, description, prompt, category
 * @returns {Promise<void>}
 */
export async function saveCustomAIPrompt(prompt) {
  const settings = await getSettings();
  const customPrompts = settings.aiActions?.customPrompts || [];
  
  // Generate ID if not provided
  if (!prompt.id) {
    prompt.id = `custom-${Date.now()}`;
  }
  prompt.isDefault = false;
  
  // Check if updating existing or adding new
  const existingIndex = customPrompts.findIndex(p => p.id === prompt.id);
  if (existingIndex >= 0) {
    customPrompts[existingIndex] = prompt;
  } else {
    customPrompts.push(prompt);
  }
  
  await updateSetting('aiActions.customPrompts', customPrompts);
}

/**
 * Delete a custom AI prompt
 * @param {string} promptId - ID of the prompt to delete
 * @returns {Promise<void>}
 */
export async function deleteCustomAIPrompt(promptId) {
  const settings = await getSettings();
  const customPrompts = settings.aiActions?.customPrompts || [];
  const filtered = customPrompts.filter(p => p.id !== promptId);
  await updateSetting('aiActions.customPrompts', filtered);
}

/**
 * Get a specific AI prompt by ID
 * @param {string} promptId - ID of the prompt
 * @returns {Promise<Object|null>} Prompt object or null
 */
export async function getAIPromptById(promptId) {
  const allPrompts = await getAIPrompts();
  return allPrompts.find(p => p.id === promptId) || null;
}

// Supercharged mode helpers

/**
 * Check if supercharged mode is available for the current configuration
 * @returns {Promise<Object>} { available: boolean, reason?: string, provider?: string }
 */
export async function checkSuperchargedAvailability() {
  const settings = await getSettings();
  const provider = settings.ai?.provider;
  
  // Check if provider supports supercharged mode
  if (!SUPERCHARGED_PROVIDERS.includes(provider)) {
    return {
      available: false,
      reason: `Supercharged mode requires OpenAI, Anthropic, or Gemini API key. Current: ${provider}`,
      provider,
    };
  }
  
  // Check if API key is configured
  const apiKey = await getApiKey(provider);
  if (!apiKey) {
    return {
      available: false,
      reason: `No API key configured for ${AI_PROVIDERS[provider]?.name || provider}`,
      provider,
    };
  }
  
  return {
    available: true,
    provider,
    supportsThinking: provider === 'anthropic',
  };
}

/**
 * Get the model to use for supercharged mode
 * @param {string} provider - AI provider
 * @returns {Object} { model: string, supportsThinking: boolean }
 */
export function getSuperchargedModel(provider) {
  const config = SUPERCHARGED_MODELS[provider];
  if (!config) {
    return { model: null, supportsThinking: false };
  }
  
  const defaultModel = config.models.find(m => m.id === config.default) || config.models[0];
  return {
    model: defaultModel.id,
    supportsThinking: defaultModel.supportsThinking,
  };
}

/**
 * Get all available supercharged models for a provider
 * @param {string} provider - AI provider
 * @returns {Array} Array of model objects
 */
export function getSuperchargedModelsForProvider(provider) {
  return SUPERCHARGED_MODELS[provider]?.models || [];
}
