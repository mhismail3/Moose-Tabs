/**
 * Internationalization utility functions for Chrome extensions
 * Provides easy access to chrome.i18n.getMessage with fallbacks
 */

/**
 * Get a localized message using chrome.i18n.getMessage
 * @param {string} key - The message key from messages.json
 * @param {Array|string} substitutions - Optional substitutions for placeholders
 * @param {string} fallback - Fallback text if key is not found
 * @returns {string} The localized message
 */
export function getMessage(key, substitutions = [], fallback = '') {
  try {
    if (typeof chrome !== 'undefined' && chrome.i18n && chrome.i18n.getMessage) {
      const message = chrome.i18n.getMessage(key, substitutions);
      // Chrome returns empty string for missing keys, use fallback in that case
      return message || fallback || key;
    }
    // Fallback for testing environment or when chrome.i18n is not available
    return fallback || key;
  } catch (error) {
    console.warn(`Failed to get i18n message for key "${key}":`, error);
    return fallback || key;
  }
}

/**
 * Get the current UI language
 * @returns {string} The current language code (e.g., 'en', 'es')
 */
export function getCurrentLanguage() {
  try {
    if (typeof chrome !== 'undefined' && chrome.i18n && chrome.i18n.getUILanguage) {
      return chrome.i18n.getUILanguage();
    }
    // Fallback to browser language or default
    return navigator.language || navigator.userLanguage || 'en';
  } catch (error) {
    console.warn('Failed to get current language:', error);
    return 'en';
  }
}

/**
 * Get the list of accepted languages
 * @returns {Promise<Array<string>>} Array of language codes
 */
export async function getAcceptLanguages() {
  try {
    if (typeof chrome !== 'undefined' && chrome.i18n && chrome.i18n.getAcceptLanguages) {
      return new Promise((resolve) => {
        chrome.i18n.getAcceptLanguages(resolve);
      });
    }
    // Fallback for testing or when chrome.i18n is not available
    return [getCurrentLanguage()];
  } catch (error) {
    console.warn('Failed to get accept languages:', error);
    return ['en'];
  }
}

/**
 * Format a message with tab count
 * @param {number} count - Number of tabs
 * @returns {string} Formatted message
 */
export function getTabCountMessage(count) {
  return getMessage('tab_count', [count.toString()], `You have ${count} tabs open`);
}

/**
 * Get ARIA label for tab item
 * @param {string} title - Tab title
 * @returns {string} ARIA label
 */
export function getTabItemAriaLabel(title) {
  return getMessage('tab_item_aria', [title], `Tab: ${title}. Press Enter to select, drag to reorder.`);
}