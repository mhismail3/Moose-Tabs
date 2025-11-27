import React, { useRef, useState, useEffect } from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import ThemeSettings from './ThemeSettings';
import AppearanceSettings from './AppearanceSettings';
import DisplaySettings from './DisplaySettings';
import TabManagementSettings from './TabManagementSettings';
import SearchSettings from './SearchSettings';
import TutorialSettings from './TutorialSettings';
import AccessibilitySettings from './AccessibilitySettings';
import DataSettings from './DataSettings';
import AISettings from './AISettings';

const SETTINGS_SECTIONS = [
  { id: 'theme', title: 'Theme & Appearance', icon: '🎨', component: ThemeSettings },
  { id: 'display', title: 'Display Mode', icon: '🖥️', component: DisplaySettings },
  { id: 'appearance', title: 'Display Options', icon: '👁️', component: AppearanceSettings },
  { id: 'tabs', title: 'Tab Management', icon: '📑', component: TabManagementSettings },
  { id: 'search', title: 'Search & Filtering', icon: '🔍', component: SearchSettings },
  { id: 'ai', title: 'AI Organization', icon: '🤖', component: AISettings },
  { id: 'tutorial', title: 'Tutorial & Help', icon: '🎓', component: TutorialSettings },
  { id: 'accessibility', title: 'Accessibility', icon: '♿', component: AccessibilitySettings },
  { id: 'data', title: 'Data & Privacy', icon: '💾', component: DataSettings }
];

function SettingsContainer() {
  const { settings, loading, error } = useSettings();
  const [activeSection, setActiveSection] = useState('theme');
  const sectionRefs = useRef({});

  // Track which section is in view
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      {
        rootMargin: '-20% 0px -70% 0px',
        threshold: 0
      }
    );

    SETTINGS_SECTIONS.forEach(({ id }) => {
      const element = sectionRefs.current[id];
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, [loading]);

  const scrollToSection = (id) => {
    const element = sectionRefs.current[id];
    if (element) {
      const yOffset = -100;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

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

  return (
    <div className="settings-container">
      {/* Ambient Background */}
      <div className="settings-bg-gradient"></div>
      
      {/* Header */}
      <header className="settings-header">
        <div className="settings-header-content">
          <div className="settings-logo">
            <span className="settings-logo-icon">🦌</span>
            <div className="settings-logo-text">
              <h1 className="settings-title">Settings</h1>
              <p className="settings-subtitle">Customize your Moose Tabs experience</p>
            </div>
          </div>
        </div>
      </header>

      {/* Quick Navigation Pills */}
      <nav className="settings-quick-nav">
        <div className="settings-quick-nav-inner">
          {SETTINGS_SECTIONS.map(section => (
            <button
              key={section.id}
              className={`settings-quick-nav-pill ${activeSection === section.id ? 'active' : ''}`}
              onClick={() => scrollToSection(section.id)}
            >
              <span className="pill-icon">{section.icon}</span>
              <span className="pill-text">{section.title}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Settings Content - All sections */}
      <main className="settings-main">
        {SETTINGS_SECTIONS.map((section, index) => {
          const Component = section.component;
          return (
            <section
              key={section.id}
              id={section.id}
              ref={(el) => (sectionRefs.current[section.id] = el)}
              className="settings-section-wrapper"
              style={{ '--section-index': index }}
            >
              <Component />
            </section>
          );
        })}
      </main>

      {/* Footer */}
      <footer className="settings-footer">
        <p>Moose Tabs • Made with care for better tab management</p>
      </footer>
    </div>
  );
}

export default SettingsContainer;
