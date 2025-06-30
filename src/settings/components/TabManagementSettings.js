import React, { useState } from 'react';
import { useSettings } from '../../contexts/SettingsContext';

function TabManagementSettings() {
  const { settings, updateSingleSetting, error } = useSettings();
  const [saveStatus, setSaveStatus] = useState(null);

  const tabManagement = settings?.tabManagement || {};

  const handleSettingChange = async (path, value) => {
    try {
      setSaveStatus(null);
      await updateSingleSetting(`tabManagement.${path}`, value);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(null), 5000);
    }
  };

  const toggleSetting = (path) => {
    const currentValue = tabManagement[path];
    handleSettingChange(path, !currentValue);
  };

  return (
    <div className="settings-section">
      <h2 className="settings-section-title">
        <span>📑</span>
        Tab Management
      </h2>
      <p className="settings-section-description">
        Configure how tabs are organized, grouped, and managed within the extension.
      </p>

      <div className="settings-group">
        <h3 className="settings-group-title">Default Behavior</h3>
        
        <div className="setting-item">
          <div className="setting-info">
            <h4 className="setting-label">Default Expand State</h4>
            <p className="setting-description">
              How tab groups should appear when first loaded
            </p>
          </div>
          <div className="setting-control">
            <div className="select-control">
              <select
                className="select-input"
                value={tabManagement.defaultExpandState || 'expanded'}
                onChange={(e) => handleSettingChange('defaultExpandState', e.target.value)}
              >
                <option value="expanded">Expanded</option>
                <option value="collapsed">Collapsed</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="settings-group">
        <h3 className="settings-group-title">Auto-Organization</h3>
        
        <div className="setting-item">
          <div className="setting-info">
            <h4 className="setting-label">Auto-Group by Domain</h4>
            <p className="setting-description">
              Automatically group tabs from the same website together
            </p>
          </div>
          <div className="setting-control">
            <button
              className={`toggle-switch ${tabManagement.autoGroupByDomain ? 'active' : ''}`}
              onClick={() => toggleSetting('autoGroupByDomain')}
              aria-label={`${tabManagement.autoGroupByDomain ? 'Disable' : 'Enable'} auto-grouping by domain`}
            />
          </div>
        </div>
      </div>

      <div className="settings-group">
        <h3 className="settings-group-title">Tab Actions</h3>
        
        <div className="setting-item">
          <div className="setting-info">
            <h4 className="setting-label">Confirm Tab Close</h4>
            <p className="setting-description">
              Show confirmation dialog before closing tabs
            </p>
          </div>
          <div className="setting-control">
            <button
              className={`toggle-switch ${tabManagement.confirmTabClose ? 'active' : ''}`}
              onClick={() => toggleSetting('confirmTabClose')}
              aria-label={`${tabManagement.confirmTabClose ? 'Disable' : 'Enable'} tab close confirmation`}
            />
          </div>
        </div>
      </div>

      <div className="settings-group">
        <h3 className="settings-group-title">Drag & Drop</h3>
        
        <div className="setting-item">
          <div className="setting-info">
            <h4 className="setting-label">Drag Sensitivity</h4>
            <p className="setting-description">
              How easily tabs respond to drag and drop operations
            </p>
          </div>
          <div className="setting-control">
            <div className="select-control">
              <select
                className="select-input"
                value={tabManagement.dragSensitivity || 'normal'}
                onChange={(e) => handleSettingChange('dragSensitivity', e.target.value)}
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Status Messages */}
      {saveStatus === 'success' && (
        <div className="status-message status-success">
          <span>✅</span>
          <span>Tab management settings saved successfully!</span>
        </div>
      )}
      
      {saveStatus === 'error' && (
        <div className="status-message status-error">
          <span>❌</span>
          <span>Failed to save tab management settings. Please try again.</span>
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

export default TabManagementSettings;