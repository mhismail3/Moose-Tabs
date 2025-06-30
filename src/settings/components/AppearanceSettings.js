import React, { useState } from 'react';
import { useSettings } from '../../contexts/SettingsContext';

function AppearanceSettings() {
  const { settings, updateSingleSetting, error } = useSettings();
  const [saveStatus, setSaveStatus] = useState(null);

  const appearance = settings?.appearance || {};

  const handleSettingChange = async (path, value) => {
    try {
      setSaveStatus(null);
      await updateSingleSetting(`appearance.${path}`, value);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(null), 5000);
    }
  };

  const toggleSetting = (path) => {
    const currentValue = appearance[path];
    handleSettingChange(path, !currentValue);
  };

  return (
    <div className="settings-section">
      <h2 className="settings-section-title">
        <span>👁️</span>
        Display Options
      </h2>
      <p className="settings-section-description">
        Customize how tabs and information are displayed in the extension.
      </p>

      <div className="settings-group">
        <h3 className="settings-group-title">Layout & Density</h3>
        
        <div className="setting-item">
          <div className="setting-info">
            <h4 className="setting-label">View Density</h4>
            <p className="setting-description">
              Choose how much information to show in each tab item
            </p>
          </div>
          <div className="setting-control">
            <div className="select-control">
              <select
                className="select-input"
                value={appearance.viewDensity || 'normal'}
                onChange={(e) => handleSettingChange('viewDensity', e.target.value)}
              >
                <option value="compact">Compact</option>
                <option value="normal">Normal</option>
                <option value="comfortable">Comfortable</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="settings-group">
        <h3 className="settings-group-title">Tab Information</h3>
        
        <div className="setting-item">
          <div className="setting-info">
            <h4 className="setting-label">Show Tab URLs</h4>
            <p className="setting-description">
              Display the full URL below each tab title for easier identification
            </p>
          </div>
          <div className="setting-control">
            <button
              className={`toggle-switch ${appearance.showTabUrls ? 'active' : ''}`}
              onClick={() => toggleSetting('showTabUrls')}
              aria-label={`${appearance.showTabUrls ? 'Hide' : 'Show'} tab URLs`}
            />
          </div>
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <h4 className="setting-label">Show Favicons</h4>
            <p className="setting-description">
              Display website icons next to tab titles
            </p>
          </div>
          <div className="setting-control">
            <button
              className={`toggle-switch ${appearance.showFavicons ? 'active' : ''}`}
              onClick={() => toggleSetting('showFavicons')}
              aria-label={`${appearance.showFavicons ? 'Hide' : 'Show'} favicons`}
            />
          </div>
        </div>
      </div>

      <div className="settings-group">
        <h3 className="settings-group-title">Motion & Animation</h3>
        
        <div className="setting-item">
          <div className="setting-info">
            <h4 className="setting-label">Reduced Motion</h4>
            <p className="setting-description">
              Minimize animations and transitions for a calmer experience
            </p>
          </div>
          <div className="setting-control">
            <button
              className={`toggle-switch ${appearance.reducedMotion ? 'active' : ''}`}
              onClick={() => toggleSetting('reducedMotion')}
              aria-label={`${appearance.reducedMotion ? 'Disable' : 'Enable'} reduced motion`}
            />
          </div>
        </div>
      </div>

      {/* Status Messages */}
      {saveStatus === 'success' && (
        <div className="status-message status-success">
          <span>✅</span>
          <span>Display settings saved successfully!</span>
        </div>
      )}
      
      {saveStatus === 'error' && (
        <div className="status-message status-error">
          <span>❌</span>
          <span>Failed to save display settings. Please try again.</span>
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

export default AppearanceSettings;