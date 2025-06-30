import React, { useState } from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import ThemeSettings from './ThemeSettings';
import AppearanceSettings from './AppearanceSettings';
import TabManagementSettings from './TabManagementSettings';
import SearchSettings from './SearchSettings';
import TutorialSettings from './TutorialSettings';
import AccessibilitySettings from './AccessibilitySettings';
import DataSettings from './DataSettings';

const SETTINGS_SECTIONS = [
  { id: 'theme', title: 'Theme & Appearance', icon: '🎨', component: ThemeSettings },
  { id: 'appearance', title: 'Display Options', icon: '👁️', component: AppearanceSettings },
  { id: 'tabs', title: 'Tab Management', icon: '📑', component: TabManagementSettings },
  { id: 'search', title: 'Search & Filtering', icon: '🔍', component: SearchSettings },
  { id: 'tutorial', title: 'Tutorial & Help', icon: '🎓', component: TutorialSettings },
  { id: 'accessibility', title: 'Accessibility', icon: '♿', component: AccessibilitySettings },
  { id: 'data', title: 'Data & Privacy', icon: '💾', component: DataSettings }
];

function SettingsContainer() {
  const { settings, loading, error } = useSettings();
  const [activeSection, setActiveSection] = useState('theme');

  if (loading) {
    return (
      <div className="settings-container">
        <div className="settings-loading">
          <div className="settings-spinner"></div>
          <p>Loading settings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="settings-container">
        <div className="status-message status-error">
          <span>⚠️</span>
          <span>Failed to load settings: {error}</span>
        </div>
      </div>
    );
  }

  const ActiveComponent = SETTINGS_SECTIONS.find(section => section.id === activeSection)?.component;

  return (
    <div className="settings-container">
      {/* Header */}
      <header className="settings-header">
        <h1 className="settings-title">Moose Tabs Settings</h1>
        <p className="settings-subtitle">Customize your tab management experience</p>
      </header>

      <div className="settings-content">
        {/* Navigation */}
        <nav className="settings-nav">
          <ul className="settings-nav-list">
            {SETTINGS_SECTIONS.map(section => (
              <li key={section.id} className="settings-nav-item">
                <button
                  className={`settings-nav-link ${activeSection === section.id ? 'active' : ''}`}
                  onClick={() => setActiveSection(section.id)}
                >
                  <span className="settings-nav-icon">{section.icon}</span>
                  <span>{section.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Settings Content */}
        <main className="settings-main">
          {ActiveComponent && <ActiveComponent />}
        </main>
      </div>
    </div>
  );
}

export default SettingsContainer;