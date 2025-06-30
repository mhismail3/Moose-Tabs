import React, { useState, useEffect } from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { applyThemeMode } from '../../utils/enhancedThemeDetection';

function ThemeSettings() {
  const { settings, updateSingleSetting, error } = useSettings();
  const [saveStatus, setSaveStatus] = useState(null);

  const themeMode = settings?.theme?.mode || 'auto';

  // Apply theme changes immediately for preview
  useEffect(() => {
    const applyPreview = async () => {
      try {
        await applyThemeMode(themeMode);
      } catch (error) {
        console.error('Failed to apply theme preview:', error);
      }
    };
    
    applyPreview();
  }, [themeMode]);

  const handleThemeChange = async (newMode) => {
    try {
      setSaveStatus(null);
      await updateSingleSetting('theme.mode', newMode);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(null), 5000);
    }
  };

  const getThemeDescription = (mode) => {
    switch (mode) {
      case 'light':
        return 'Always use light theme regardless of system setting';
      case 'dark':
        return 'Always use dark theme regardless of system setting';
      case 'auto':
        return 'Automatically switch between light and dark based on your system preference';
      default:
        return '';
    }
  };

  return (
    <div className="settings-section">
      <h2 className="settings-section-title">
        <span>🎨</span>
        Theme & Appearance
      </h2>
      <p className="settings-section-description">
        Choose how Moose Tabs should look. Changes are applied immediately across all extension windows.
      </p>

      <div className="settings-group">
        <h3 className="settings-group-title">Color Theme</h3>
        
        <div className="setting-item">
          <div className="setting-info">
            <h4 className="setting-label">Theme Mode</h4>
            <p className="setting-description">
              {getThemeDescription(themeMode)}
            </p>
          </div>
          <div className="setting-control">
            <div className="select-control">
              <select
                className="select-input"
                value={themeMode}
                onChange={(e) => handleThemeChange(e.target.value)}
              >
                <option value="auto">Auto (System)</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>
          </div>
        </div>

        {/* Theme Preview */}
        <div className="setting-item">
          <div className="setting-info">
            <h4 className="setting-label">Preview</h4>
            <p className="setting-description">
              This is how the extension will look with your current theme selection.
            </p>
          </div>
          <div className="setting-control">
            <div className="theme-preview">
              <div className="theme-preview-window">
                <div className="theme-preview-header">
                  <div className="theme-preview-controls">
                    <span className="theme-preview-dot"></span>
                    <span className="theme-preview-dot"></span>
                    <span className="theme-preview-dot"></span>
                  </div>
                  <span className="theme-preview-title">Moose Tabs</span>
                </div>
                <div className="theme-preview-content">
                  <div className="theme-preview-tab">
                    <span className="theme-preview-favicon">🌐</span>
                    <span className="theme-preview-text">Example Tab</span>
                  </div>
                  <div className="theme-preview-tab">
                    <span className="theme-preview-favicon">📄</span>
                    <span className="theme-preview-text">Another Tab</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Messages */}
      {saveStatus === 'success' && (
        <div className="status-message status-success">
          <span>✅</span>
          <span>Theme settings saved successfully!</span>
        </div>
      )}
      
      {saveStatus === 'error' && (
        <div className="status-message status-error">
          <span>❌</span>
          <span>Failed to save theme settings. Please try again.</span>
        </div>
      )}

      {error && (
        <div className="status-message status-error">
          <span>⚠️</span>
          <span>Settings error: {error}</span>
        </div>
      )}

    </div>
  );
}

export default ThemeSettings;