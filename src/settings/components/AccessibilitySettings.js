import React, { useState } from 'react';
import { useSettings } from '../../contexts/SettingsContext';

function AccessibilitySettings() {
  const { settings, updateSingleSetting, error } = useSettings();
  const [saveStatus, setSaveStatus] = useState(null);

  const accessibility = settings?.accessibility || {};

  const handleSettingChange = async (path, value) => {
    try {
      setSaveStatus(null);
      await updateSingleSetting(`accessibility.${path}`, value);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(null), 5000);
    }
  };

  const toggleSetting = (path) => {
    const currentValue = accessibility[path];
    handleSettingChange(path, !currentValue);
  };

  return (
    <div className="settings-section">
      <h2 className="settings-section-title">
        <span>♿</span>
        Accessibility
      </h2>
      <p className="settings-section-description">
        Configure accessibility features to make the extension easier to use with assistive technologies.
      </p>

      <div className="settings-group">
        <h3 className="settings-group-title">Visual Accessibility</h3>
        
        <div className="setting-item">
          <div className="setting-info">
            <h4 className="setting-label">High Contrast Mode</h4>
            <p className="setting-description">
              Increase contrast for better visibility and readability
            </p>
          </div>
          <div className="setting-control">
            <button
              className={`toggle-switch ${accessibility.highContrast ? 'active' : ''}`}
              onClick={() => toggleSetting('highContrast')}
              aria-label={`${accessibility.highContrast ? 'Disable' : 'Enable'} high contrast mode`}
            />
          </div>
        </div>
      </div>

      <div className="settings-group">
        <h3 className="settings-group-title">Screen Reader Support</h3>
        
        <div className="setting-item">
          <div className="setting-info">
            <h4 className="setting-label">Announce Changes</h4>
            <p className="setting-description">
              Announce important changes and updates to screen readers
            </p>
          </div>
          <div className="setting-control">
            <button
              className={`toggle-switch ${accessibility.announceChanges ? 'active' : ''}`}
              onClick={() => toggleSetting('announceChanges')}
              aria-label={`${accessibility.announceChanges ? 'Disable' : 'Enable'} change announcements`}
            />
          </div>
        </div>
      </div>

      <div className="settings-group">
        <h3 className="settings-group-title">System Integration</h3>
        
        <div className="setting-item">
          <div className="setting-info">
            <h4 className="setting-label">Respect System Preferences</h4>
            <p className="setting-description">
              This extension automatically respects your system's accessibility preferences including reduced motion and high contrast settings.
            </p>
          </div>
          <div className="setting-control">
            <span className="setting-status">✓ Enabled</span>
          </div>
        </div>
      </div>

      {/* Status Messages */}
      {saveStatus === 'success' && (
        <div className="status-message status-success">
          <span>✅</span>
          <span>Accessibility settings saved successfully!</span>
        </div>
      )}
      
      {saveStatus === 'error' && (
        <div className="status-message status-error">
          <span>❌</span>
          <span>Failed to save accessibility settings. Please try again.</span>
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

export default AccessibilitySettings;