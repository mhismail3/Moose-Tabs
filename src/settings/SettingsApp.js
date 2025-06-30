import React, { useEffect } from 'react';
import { SettingsProvider } from '../contexts/SettingsContext';
import SettingsContainer from './components/SettingsContainer';
import { initializeEnhancedTheme } from '../utils/enhancedThemeDetection';
import '../styles/design-tokens.css';
import '../styles/themes.css';
import './settings.css';

function SettingsApp() {
  useEffect(() => {
    // Initialize enhanced theme for settings page
    const initTheme = async () => {
      try {
        await initializeEnhancedTheme();
      } catch (error) {
        console.error('Failed to initialize enhanced theme in settings:', error);
        // Fallback to basic theme
        const { initializeTheme } = await import('../utils/themeDetection');
        initializeTheme();
      }
    };
    
    initTheme();
    
    // Hide loading indicator
    if (window.hideLoading) {
      window.hideLoading();
    }
    
    // Set page title
    document.title = 'Moose Tabs - Settings';
  }, []);

  return (
    <SettingsProvider>
      <div className="settings-app">
        <SettingsContainer />
      </div>
    </SettingsProvider>
  );
}

export default SettingsApp;