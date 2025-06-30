import React, { createContext, useContext, useState, useEffect } from 'react';
import { getSettings, saveSettings, updateSetting } from '../utils/settings';

const SettingsContext = createContext();

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
    
    // Listen for settings updates from other extension contexts
    const handleMessage = (message, sender, sendResponse) => {
      if (message.action === 'settingsUpdated' && message.settings) {
        console.log('Settings updated from external source:', message);
        setSettings(message.settings);
        if (sendResponse) {
          sendResponse({ received: true });
        }
      }
    };

    if (chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener(handleMessage);
      
      return () => {
        chrome.runtime.onMessage.removeListener(handleMessage);
      };
    }
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const loadedSettings = await getSettings();
      setSettings(loadedSettings);
    } catch (err) {
      console.error('Failed to load settings:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (newSettings) => {
    try {
      setError(null);
      await saveSettings(newSettings);
      setSettings(newSettings);
      
      // Broadcast settings change to other parts of the extension
      if (chrome.runtime) {
        chrome.runtime.sendMessage({
          action: 'settingsUpdated',
          settings: newSettings
        }).catch(() => {
          // Ignore errors if no listeners
        });
      }
    } catch (err) {
      console.error('Failed to save settings:', err);
      setError(err.message);
      throw err;
    }
  };

  const updateSingleSetting = async (path, value) => {
    try {
      setError(null);
      await updateSetting(path, value);
      
      // Update local state
      const updatedSettings = { ...settings };
      setNestedValue(updatedSettings, path, value);
      setSettings(updatedSettings);
      
      // Broadcast settings change
      if (chrome.runtime) {
        chrome.runtime.sendMessage({
          action: 'settingsUpdated',
          settings: updatedSettings,
          changedPath: path,
          changedValue: value
        }).catch(() => {
          // Ignore errors if no listeners
        });
      }
    } catch (err) {
      console.error('Failed to update setting:', err);
      setError(err.message);
      throw err;
    }
  };

  const resetSettings = async () => {
    try {
      setError(null);
      const { resetSettings: resetFn } = await import('../utils/settings');
      await resetFn();
      await loadSettings(); // Reload to get fresh defaults
    } catch (err) {
      console.error('Failed to reset settings:', err);
      setError(err.message);
      throw err;
    }
  };

  const exportSettings = async () => {
    try {
      const { exportSettings: exportFn } = await import('../utils/settings');
      return await exportFn();
    } catch (err) {
      console.error('Failed to export settings:', err);
      setError(err.message);
      throw err;
    }
  };

  const importSettings = async (jsonString) => {
    try {
      setError(null);
      const { importSettings: importFn } = await import('../utils/settings');
      await importFn(jsonString);
      await loadSettings(); // Reload to get imported settings
    } catch (err) {
      console.error('Failed to import settings:', err);
      setError(err.message);
      throw err;
    }
  };

  // Helper function to get nested values
  const getSetting = (path) => {
    if (!settings) return undefined;
    return getNestedValue(settings, path);
  };

  const value = {
    settings,
    loading,
    error,
    updateSettings,
    updateSingleSetting,
    resetSettings,
    exportSettings,
    importSettings,
    getSetting,
    reloadSettings: loadSettings
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

// Utility function to get nested value by dot notation path
function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

// Utility function to set nested value by dot notation path
function setNestedValue(obj, path, value) {
  const keys = path.split('.');
  const lastKey = keys.pop();
  const target = keys.reduce((current, key) => {
    if (!(key in current)) current[key] = {};
    return current[key];
  }, obj);
  target[lastKey] = value;
}