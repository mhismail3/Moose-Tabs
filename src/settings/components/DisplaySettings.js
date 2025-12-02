import React from 'react';
import { useSettings } from '../../contexts/SettingsContext';

function DisplaySettings() {
  const { settings, updateSingleSetting, loading } = useSettings();

  if (loading || !settings) {
    return <div className="settings-loading">Loading...</div>;
  }

  const displayMode = settings.display?.mode || 'popup';

  const handleDisplayModeChange = async (mode) => {
    await updateSingleSetting('display.mode', mode);
    
    // Notify background script of mode change
    try {
      await chrome.runtime.sendMessage({
        action: 'displayModeChanged',
        mode
      });
    } catch (error) {
      // Ignore if background isn't listening
    }
  };

  return (
    <div className="settings-section">
      <h2 className="settings-section-title">Display Mode</h2>
      <p className="settings-section-description">
        Choose how Moose Tabs appears when you click the extension icon.
      </p>

      <div className="settings-option-group">
        <label className="settings-radio-option">
          <input
            type="radio"
            name="displayMode"
            value="popup"
            checked={displayMode === 'popup'}
            onChange={() => handleDisplayModeChange('popup')}
          />
          <div className="settings-radio-content">
            <span className="settings-radio-label">Popup Dropdown</span>
            <span className="settings-radio-description">
              Opens as a dropdown from the toolbar. Best for quick access and fewer tabs.
            </span>
          </div>
        </label>

        <label className="settings-radio-option">
          <input
            type="radio"
            name="displayMode"
            value="sidebar"
            checked={displayMode === 'sidebar'}
            onChange={() => handleDisplayModeChange('sidebar')}
          />
          <div className="settings-radio-content">
            <span className="settings-radio-label">Sidebar Panel</span>
            <span className="settings-radio-description">
              Opens in Chrome's sidebar panel. Best for extended use and larger tab collections.
            </span>
          </div>
        </label>
      </div>

      <div className="settings-note">
        <strong>Note:</strong> After changing the display mode, you may need to click the extension icon again for the change to take effect.
      </div>
    </div>
  );
}

export default DisplaySettings;



