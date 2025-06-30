import React, { useState } from 'react';
import { useSettings } from '../../contexts/SettingsContext';

function SearchSettings() {
  const { settings, updateSingleSetting, error } = useSettings();
  const [saveStatus, setSaveStatus] = useState(null);

  const search = settings?.search || {};

  const handleSettingChange = async (path, value) => {
    try {
      setSaveStatus(null);
      await updateSingleSetting(`search.${path}`, value);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(null), 5000);
    }
  };

  const toggleSetting = (path) => {
    const currentValue = search[path];
    handleSettingChange(path, !currentValue);
  };

  return (
    <div className="settings-section">
      <h2 className="settings-section-title">
        <span>🔍</span>
        Search & Filtering
      </h2>
      <p className="settings-section-description">
        Customize how search works when looking for tabs in your extension.
      </p>

      <div className="settings-group">
        <h3 className="settings-group-title">Search Behavior</h3>
        
        <div className="setting-item">
          <div className="setting-info">
            <h4 className="setting-label">Case Sensitive Search</h4>
            <p className="setting-description">
              Make search distinguish between uppercase and lowercase letters
            </p>
          </div>
          <div className="setting-control">
            <button
              className={`toggle-switch ${search.caseSensitive ? 'active' : ''}`}
              onClick={() => toggleSetting('caseSensitive')}
              aria-label={`${search.caseSensitive ? 'Disable' : 'Enable'} case sensitive search`}
            />
          </div>
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <h4 className="setting-label">Search in URLs</h4>
            <p className="setting-description">
              Include tab URLs in search results, not just titles
            </p>
          </div>
          <div className="setting-control">
            <button
              className={`toggle-switch ${search.searchInUrls ? 'active' : ''}`}
              onClick={() => toggleSetting('searchInUrls')}
              aria-label={`${search.searchInUrls ? 'Disable' : 'Enable'} searching in URLs`}
            />
          </div>
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <h4 className="setting-label">Highlight Results</h4>
            <p className="setting-description">
              Highlight matching text in search results
            </p>
          </div>
          <div className="setting-control">
            <button
              className={`toggle-switch ${search.highlightResults ? 'active' : ''}`}
              onClick={() => toggleSetting('highlightResults')}
              aria-label={`${search.highlightResults ? 'Disable' : 'Enable'} result highlighting`}
            />
          </div>
        </div>
      </div>

      {/* Status Messages */}
      {saveStatus === 'success' && (
        <div className="status-message status-success">
          <span>✅</span>
          <span>Search settings saved successfully!</span>
        </div>
      )}
      
      {saveStatus === 'error' && (
        <div className="status-message status-error">
          <span>❌</span>
          <span>Failed to save search settings. Please try again.</span>
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

export default SearchSettings;