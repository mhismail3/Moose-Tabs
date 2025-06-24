/**
 * Test for Task 4.2: Internationalization (i18n)
 * Tests the internationalization functionality using Chrome extension i18n API
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import App from '../src/App';

// Mock the react-dnd library
jest.mock('react-dnd', () => ({
  useDrag: () => [{ isDragging: false }, jest.fn()],
  useDrop: () => [{ isOver: false, canDrop: true }, jest.fn()],
  DndProvider: ({ children }) => children,
  HTML5Backend: {},
}));

// Mock Chrome APIs with i18n support
global.chrome = {
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
    },
  },
  i18n: {
    getMessage: jest.fn(),
    getUILanguage: jest.fn(),
    getAcceptLanguages: jest.fn(),
  },
};

describe('Task 4.2: Internationalization (i18n)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default Chrome API responses
    chrome.runtime.sendMessage.mockResolvedValue({
      success: true,
      hierarchy: []
    });
    
    // Default to English language
    chrome.i18n.getUILanguage.mockReturnValue('en');
    chrome.i18n.getAcceptLanguages.mockResolvedValue(['en']);
  });

  describe('Basic i18n functionality', () => {
    test('should use chrome.i18n.getMessage for app title', async () => {
      // Mock the getMessage function to return English text
      chrome.i18n.getMessage.mockImplementation((key) => {
        const messages = {
          'app_title': 'Moose Tabs',
          'loading_text': 'Loading tab hierarchy...',
          'error_retry_button': 'Retry'
        };
        return messages[key] || key;
      });

      render(<App />);

      // Wait for component to render
      await waitFor(() => {
        expect(chrome.i18n.getMessage).toHaveBeenCalledWith('app_title', []);
      });

      // Verify that the app title is displayed using i18n
      expect(screen.getByText('🐃 Moose Tabs')).toBeInTheDocument();
    });

    test('should use chrome.i18n.getMessage for loading text', async () => {
      chrome.i18n.getMessage.mockImplementation((key) => {
        const messages = {
          'app_title': 'Moose Tabs',
          'loading_text': 'Loading tab hierarchy...',
          'error_retry_button': 'Retry'
        };
        return messages[key] || key;
      });

      render(<App />);

      // Should show loading text initially
      await waitFor(() => {
        expect(chrome.i18n.getMessage).toHaveBeenCalledWith('loading_text', []);
      });
    });

    test('should use chrome.i18n.getMessage for error messages', async () => {
      // Mock an error response
      chrome.runtime.sendMessage.mockRejectedValue(new Error('Connection failed'));
      
      chrome.i18n.getMessage.mockImplementation((key) => {
        const messages = {
          'app_title': 'Moose Tabs',
          'loading_text': 'Loading tab hierarchy...',
          'error_retry_button': 'Retry',
          'error_communication': 'Error communicating with background script'
        };
        return messages[key] || key;
      });

      render(<App />);

      // Wait for error to be displayed
      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });

      expect(chrome.i18n.getMessage).toHaveBeenCalledWith('error_retry_button', []);
    });
  });

  describe('Spanish language support', () => {
    test('should display Spanish text when language is Spanish', async () => {
      // Mock Spanish language
      chrome.i18n.getUILanguage.mockReturnValue('es');
      chrome.i18n.getMessage.mockImplementation((key) => {
        const messages = {
          'app_title': 'Pestañas Moose',
          'loading_text': 'Cargando jerarquía de pestañas...',
          'error_retry_button': 'Reintentar'
        };
        return messages[key] || key;
      });

      render(<App />);

      // Wait for component to render
      await waitFor(() => {
        expect(chrome.i18n.getMessage).toHaveBeenCalledWith('app_title', []);
      });

      // Verify Spanish text is used (note: the 🐃 emoji is still prepended)
      expect(screen.getByText('🐃 Pestañas Moose')).toBeInTheDocument();
    });

    test('should use Spanish loading text', async () => {
      chrome.i18n.getUILanguage.mockReturnValue('es');
      chrome.i18n.getMessage.mockImplementation((key) => {
        const messages = {
          'app_title': 'Pestañas Moose',
          'loading_text': 'Cargando jerarquía de pestañas...',
          'error_retry_button': 'Reintentar'
        };
        return messages[key] || key;
      });

      render(<App />);

      await waitFor(() => {
        expect(chrome.i18n.getMessage).toHaveBeenCalledWith('loading_text', []);
      });
      
      expect(screen.getByText('Cargando jerarquía de pestañas...')).toBeInTheDocument();
    });
  });

  describe('Language detection', () => {
    test('should detect current UI language', () => {
      chrome.i18n.getUILanguage.mockReturnValue('en-US');
      
      const language = chrome.i18n.getUILanguage();
      expect(language).toBe('en-US');
      expect(chrome.i18n.getUILanguage).toHaveBeenCalled();
    });

    test('should get accept languages list', async () => {
      chrome.i18n.getAcceptLanguages.mockResolvedValue(['en-US', 'es', 'fr']);
      
      const languages = await chrome.i18n.getAcceptLanguages();
      expect(languages).toEqual(['en-US', 'es', 'fr']);
      expect(chrome.i18n.getAcceptLanguages).toHaveBeenCalled();
    });
  });

  describe('Message key fallbacks', () => {
    test('should handle missing message keys gracefully', async () => {
      chrome.i18n.getMessage.mockImplementation((key) => {
        // Simulate Chrome's behavior of returning empty string for missing keys
        return key === 'nonexistent_key' ? '' : 'Default message';
      });

      const result = chrome.i18n.getMessage('nonexistent_key');
      expect(result).toBe('');
    });

    test('should handle message substitutions', async () => {
      chrome.i18n.getMessage.mockImplementation((key, substitutions) => {
        if (key === 'tab_count' && substitutions) {
          return `You have ${substitutions[0]} tabs open`;
        }
        return 'Default message';
      });

      const result = chrome.i18n.getMessage('tab_count', ['5']);
      expect(result).toBe('You have 5 tabs open');
    });
  });
});