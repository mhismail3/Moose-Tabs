// Settings Integration Tests
// These tests verify that settings persist correctly and integrate across different parts of the extension

import { getSettings, saveSettings, updateSetting, getSetting } from '../src/utils/settings';

// Mock Chrome APIs
global.chrome = {
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn()
    }
  }
};

describe('Settings Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset Chrome storage mock
    chrome.storage.local.get.mockResolvedValue({});
    chrome.storage.local.set.mockResolvedValue();
  });

  describe('Settings Persistence', () => {
    test('saves and retrieves settings correctly', async () => {
      const testSettings = {
        appearance: {
          viewDensity: 'compact',
          showTabUrls: false,
          showFavicons: true,
          reducedMotion: true
        },
        tabManagement: {
          defaultExpandState: 'collapsed',
          confirmTabClose: true
        },
        search: {
          caseSensitive: true,
          searchInUrls: false
        },
        accessibility: {
          highContrast: true
        }
      };

      // Save settings
      await saveSettings(testSettings);

      // Verify Chrome storage was called with correct data
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        userSettings: testSettings
      });

      // Mock the retrieval
      chrome.storage.local.get.mockResolvedValue({
        userSettings: testSettings
      });

      // Retrieve settings
      const retrievedSettings = await getSettings();

      // Verify the custom settings are present (getSettings merges with defaults)
      expect(retrievedSettings.appearance.viewDensity).toBe(testSettings.appearance.viewDensity);
      expect(retrievedSettings.appearance.showTabUrls).toBe(testSettings.appearance.showTabUrls);
      expect(retrievedSettings.tabManagement.defaultExpandState).toBe(testSettings.tabManagement.defaultExpandState);
      expect(retrievedSettings.tabManagement.confirmTabClose).toBe(testSettings.tabManagement.confirmTabClose);
      expect(retrievedSettings.search.caseSensitive).toBe(testSettings.search.caseSensitive);
      expect(retrievedSettings.search.searchInUrls).toBe(testSettings.search.searchInUrls);
      expect(retrievedSettings.accessibility.highContrast).toBe(testSettings.accessibility.highContrast);
    });

    test('updates individual settings correctly', async () => {
      const initialSettings = {
        appearance: {
          viewDensity: 'normal',
          showTabUrls: true
        }
      };

      // Mock initial settings in storage
      chrome.storage.local.get.mockResolvedValue({
        userSettings: initialSettings
      });

      // Update a single setting
      await updateSetting('appearance.viewDensity', 'compact');

      // Verify the update was saved with merged defaults
      const lastCall = chrome.storage.local.set.mock.calls[0][0];
      expect(lastCall).toHaveProperty('userSettings');
      expect(lastCall.userSettings.appearance.viewDensity).toBe('compact');
      expect(lastCall.userSettings.appearance.showTabUrls).toBe(true);
    });

    test('retrieves individual settings correctly', async () => {
      const testSettings = {
        appearance: {
          viewDensity: 'comfortable'
        },
        search: {
          caseSensitive: true
        }
      };

      chrome.storage.local.get.mockResolvedValue({
        userSettings: testSettings
      });

      const viewDensity = await getSetting('appearance.viewDensity');
      const caseSensitive = await getSetting('search.caseSensitive');
      const nonExistent = await getSetting('nonexistent.setting');

      expect(viewDensity).toBe('comfortable');
      expect(caseSensitive).toBe(true);
      expect(nonExistent).toBeUndefined();
    });

    test('handles nested settings paths correctly', async () => {
      const testSettings = {
        deeply: {
          nested: {
            setting: {
              value: 'test'
            }
          }
        }
      };

      chrome.storage.local.get.mockResolvedValue({
        userSettings: testSettings
      });

      await updateSetting('deeply.nested.setting.value', 'updated');

      const lastCall = chrome.storage.local.set.mock.calls[0][0];
      expect(lastCall).toHaveProperty('userSettings');
      expect(lastCall.userSettings.deeply.nested.setting.value).toBe('updated');
    });

    test('preserves existing settings when updating', async () => {
      const existingSettings = {
        appearance: {
          viewDensity: 'normal',
          showTabUrls: true,
          showFavicons: true
        },
        search: {
          caseSensitive: false
        }
      };

      chrome.storage.local.get.mockResolvedValue({
        userSettings: existingSettings
      });

      // Update only one setting
      await updateSetting('appearance.viewDensity', 'compact');

      // Verify other settings are preserved
      const lastCall = chrome.storage.local.set.mock.calls[0][0];
      expect(lastCall).toHaveProperty('userSettings');
      expect(lastCall.userSettings.appearance.viewDensity).toBe('compact');
      expect(lastCall.userSettings.appearance.showTabUrls).toBe(true);
      expect(lastCall.userSettings.appearance.showFavicons).toBe(true);
      expect(lastCall.userSettings.search.caseSensitive).toBe(false);
    });
  });

  describe('Default Settings', () => {
    test('returns default settings when storage is empty', async () => {
      chrome.storage.local.get.mockResolvedValue({});

      const settings = await getSettings();

      // Verify default settings structure
      expect(settings).toHaveProperty('theme');
      expect(settings).toHaveProperty('appearance');
      expect(settings).toHaveProperty('tabManagement');
      expect(settings).toHaveProperty('search');
      expect(settings).toHaveProperty('tutorial');
      expect(settings).toHaveProperty('accessibility');

      // Verify some default values
      expect(settings.theme.mode).toBe('auto');
      expect(settings.appearance.viewDensity).toBe('compact');
      expect(settings.appearance.showTabUrls).toBe(true);
      expect(settings.appearance.showFavicons).toBe(true);
      expect(settings.tabManagement.defaultExpandState).toBe('expanded');
      expect(settings.search.caseSensitive).toBe(false);
      expect(settings.accessibility.highContrast).toBe(false);
    });

    test('merges partial settings with defaults', async () => {
      const partialSettings = {
        appearance: {
          viewDensity: 'compact'
          // Missing other appearance settings
        }
        // Missing other categories
      };

      chrome.storage.local.get.mockResolvedValue({
        userSettings: partialSettings
      });

      const settings = await getSettings();

      // Should have the custom setting
      expect(settings.appearance.viewDensity).toBe('compact');

      // Should still have defaults for missing settings
      expect(settings.appearance.showTabUrls).toBe(true);
      expect(settings.tabManagement.defaultExpandState).toBe('expanded');
      expect(settings.search.caseSensitive).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('handles storage errors gracefully', async () => {
      chrome.storage.local.get.mockRejectedValue(new Error('Storage error'));

      const settings = await getSettings();

      // Should return default settings on error
      expect(settings).toHaveProperty('appearance');
      expect(settings.appearance.viewDensity).toBe('compact');
    });

    test('handles invalid setting paths gracefully', async () => {
      chrome.storage.local.get.mockResolvedValue({
        userSettings: { appearance: { viewDensity: 'normal' } }
      });

      // Should not throw for invalid paths
      await expect(updateSetting('invalid..path', 'value')).resolves.not.toThrow();
      await expect(getSetting('invalid..path')).resolves.toBeUndefined();
    });
  });
});