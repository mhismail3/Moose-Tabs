import React, { useState } from 'react';
import { useSettings } from '../../contexts/SettingsContext';

function TutorialSettings() {
  const { settings, updateSingleSetting, error } = useSettings();
  const [saveStatus, setSaveStatus] = useState(null);

  const tutorial = settings?.tutorial || {};

  const handleSettingChange = async (path, value) => {
    try {
      setSaveStatus(null);
      await updateSingleSetting(`tutorial.${path}`, value);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(null), 5000);
    }
  };

  const toggleSetting = (path) => {
    const currentValue = tutorial[path];
    handleSettingChange(path, !currentValue);
  };

  const resetTutorial = async () => {
    try {
      setSaveStatus(null);
      await updateSingleSetting('tutorial.completed', false);
      await updateSingleSetting('tutorial.currentStep', 0);
      setSaveStatus('tutorial-reset');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(null), 5000);
    }
  };

  return (
    <div className="settings-section">
      <h2 className="settings-section-title">
        <span>🎓</span>
        Tutorial & Help
      </h2>
      <p className="settings-section-description">
        Manage tutorial preferences and access help resources.
      </p>

      <div className="settings-group">
        <h3 className="settings-group-title">Tutorial Preferences</h3>
        
        <div className="setting-item">
          <div className="setting-info">
            <h4 className="setting-label">Auto-Start Tutorial</h4>
            <p className="setting-description">
              Automatically show the tutorial when first using the extension
            </p>
          </div>
          <div className="setting-control">
            <button
              className={`toggle-switch ${tutorial.autoStart ? 'active' : ''}`}
              onClick={() => toggleSetting('autoStart')}
              aria-label={`${tutorial.autoStart ? 'Disable' : 'Enable'} auto-start tutorial`}
            />
          </div>
        </div>
      </div>

      <div className="settings-group">
        <h3 className="settings-group-title">Tutorial Actions</h3>
        
        <div className="setting-item">
          <div className="setting-info">
            <h4 className="setting-label">Reset Tutorial Progress</h4>
            <p className="setting-description">
              Clear tutorial progress and show it again from the beginning
            </p>
          </div>
          <div className="setting-control">
            <button
              className="btn btn-secondary btn-small"
              onClick={resetTutorial}
            >
              Reset Tutorial
            </button>
          </div>
        </div>
      </div>

      <div className="settings-group">
        <h3 className="settings-group-title">Help Resources</h3>
        
        <div className="setting-item">
          <div className="setting-info">
            <h4 className="setting-label">Keyboard Shortcuts</h4>
            <p className="setting-description">
              View available keyboard shortcuts for the extension
            </p>
          </div>
          <div className="setting-control">
            <button
              className="btn btn-secondary btn-small"
              onClick={() => {
                // Could open a modal or new tab with shortcuts
                alert('Keyboard shortcuts:\n\n• Search: Type to start searching\n• Clear search: Esc\n• Navigate: Arrow keys\n• Close tab: Delete/Backspace');
              }}
            >
              View Shortcuts
            </button>
          </div>
        </div>
      </div>

      {/* Status Messages */}
      {saveStatus === 'success' && (
        <div className="status-message status-success">
          <span>✅</span>
          <span>Tutorial settings saved successfully!</span>
        </div>
      )}
      
      {saveStatus === 'tutorial-reset' && (
        <div className="status-message status-success">
          <span>🔄</span>
          <span>Tutorial has been reset. It will show again next time you open the extension.</span>
        </div>
      )}
      
      {saveStatus === 'error' && (
        <div className="status-message status-error">
          <span>❌</span>
          <span>Failed to save tutorial settings. Please try again.</span>
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

export default TutorialSettings;