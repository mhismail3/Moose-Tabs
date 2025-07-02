import React, { useState, useRef } from 'react';
import { useSettings } from '../../contexts/SettingsContext';

function DataSettings() {
  const { settings, resetSettings, exportSettings, importSettings, error } = useSettings();
  const [saveStatus, setSaveStatus] = useState(null);
  const fileInputRef = useRef(null);

  const handleExportSettings = async () => {
    try {
      setSaveStatus(null);
      const exportedData = await exportSettings();
      
      // Create and download file
      const blob = new Blob([exportedData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `moose-tabs-settings-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setSaveStatus('export-success');
      setTimeout(() => setSaveStatus(null), 5000);
    } catch (err) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(null), 5000);
    }
  };

  const handleImportSettings = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setSaveStatus(null);
      const text = await file.text();
      await importSettings(text);
      setSaveStatus('import-success');
      setTimeout(() => setSaveStatus(null), 5000);
    } catch (err) {
      setSaveStatus('import-error');
      setTimeout(() => setSaveStatus(null), 5000);
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleResetSettings = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to reset all settings to their defaults? This cannot be undone.'
    );
    
    if (confirmed) {
      try {
        setSaveStatus(null);
        await resetSettings();
        setSaveStatus('reset-success');
        setTimeout(() => setSaveStatus(null), 5000);
      } catch (err) {
        setSaveStatus('error');
        setTimeout(() => setSaveStatus(null), 5000);
      }
    }
  };

  return (
    <div className="settings-section">
      <h2 className="settings-section-title">
        <span>💾</span>
        Data & Privacy
      </h2>
      <p className="settings-section-description">
        Manage your settings data, privacy preferences, and extension storage.
      </p>

      <div className="settings-group">
        <h3 className="settings-group-title">Settings Backup</h3>
        
        <div className="setting-item">
          <div className="setting-info">
            <h4 className="setting-label">Export Settings</h4>
            <p className="setting-description">
              Download your current settings as a JSON file for backup or transfer
            </p>
          </div>
          <div className="setting-control">
            <button
              className="btn btn-secondary btn-small"
              onClick={handleExportSettings}
            >
              📥 Export Settings
            </button>
          </div>
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <h4 className="setting-label">Import Settings</h4>
            <p className="setting-description">
              Restore settings from a previously exported JSON file
            </p>
          </div>
          <div className="setting-control">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportSettings}
              className="file-input"
              id="import-settings"
            />
            <label
              htmlFor="import-settings"
              className="file-input-label btn btn-secondary btn-small"
            >
              📤 Import Settings
            </label>
          </div>
        </div>
      </div>

      <div className="settings-group">
        <h3 className="settings-group-title">Data Storage</h3>
        
        <div className="setting-item">
          <div className="setting-info">
            <h4 className="setting-label">Storage Information</h4>
            <p className="setting-description">
              All settings are stored locally in your browser using Chrome's storage API. No data is sent to external servers.
            </p>
          </div>
          <div className="setting-control">
            <span className="setting-status">🔒 Local Only</span>
          </div>
        </div>
      </div>

      <div className="settings-group">
        <h3 className="settings-group-title">Reset Options</h3>
        
        <div className="setting-item">
          <div className="setting-info">
            <h4 className="setting-label">Reset All Settings</h4>
            <p className="setting-description">
              Reset all settings to their default values. This action cannot be undone.
            </p>
          </div>
          <div className="setting-control">
            <button
              className="btn btn-danger btn-small"
              onClick={handleResetSettings}
            >
              🔄 Reset to Defaults
            </button>
          </div>
        </div>
      </div>

      {/* Status Messages */}
      {saveStatus === 'export-success' && (
        <div className="status-message status-success">
          <span>📥</span>
          <span>Settings exported successfully! Check your downloads folder.</span>
        </div>
      )}
      
      {saveStatus === 'import-success' && (
        <div className="status-message status-success">
          <span>📤</span>
          <span>Settings imported successfully! The page will refresh to apply changes.</span>
        </div>
      )}
      
      {saveStatus === 'import-error' && (
        <div className="status-message status-error">
          <span>❌</span>
          <span>Failed to import settings. Please check that the file is a valid settings export.</span>
        </div>
      )}
      
      {saveStatus === 'reset-success' && (
        <div className="status-message status-success">
          <span>🔄</span>
          <span>All settings have been reset to defaults!</span>
        </div>
      )}
      
      {saveStatus === 'error' && (
        <div className="status-message status-error">
          <span>❌</span>
          <span>An error occurred. Please try again.</span>
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

export default DataSettings;