import React from 'react';
import { getLogger } from './logger';

/**
 * Error Boundary Component
 * Catches React errors and provides fallback UI with recovery options
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      attemptedRecovery: false
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error
    const logger = getLogger();
    logger.error('React Error Boundary caught error', {
      error: error.toString(),
      stack: error.stack,
      componentStack: errorInfo?.componentStack
    });

    this.setState({ errorInfo });
  }

  handleRetry = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null,
      attemptedRecovery: true 
    });
  };

  handleRefresh = () => {
    window.location.reload();
  };

  handleReportError = () => {
    const { error, errorInfo } = this.state;
    const logger = getLogger();
    
    // Export logs for the user
    logger.exportLogsAsFile();
    
    // Show instructions
    alert('Logs have been downloaded. Please include them when reporting the issue.');
  };

  render() {
    if (this.state.hasError) {
      const { error, attemptedRecovery } = this.state;
      const { fallback, onError } = this.props;

      // Call onError callback if provided
      if (onError) {
        onError(error);
      }

      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      // Default error UI
      return (
        <div style={styles.container}>
          <div style={styles.content}>
            <div style={styles.icon}>⚠️</div>
            <h2 style={styles.title}>Something went wrong</h2>
            <p style={styles.message}>
              {attemptedRecovery 
                ? 'The error persists. Try refreshing the page.'
                : 'An error occurred while displaying this content.'}
            </p>
            
            {error && (
              <details style={styles.details}>
                <summary style={styles.summary}>Error details</summary>
                <pre style={styles.errorText}>
                  {error.toString()}
                </pre>
              </details>
            )}
            
            <div style={styles.actions}>
              {!attemptedRecovery && (
                <button 
                  style={styles.primaryButton}
                  onClick={this.handleRetry}
                >
                  Try Again
                </button>
              )}
              <button 
                style={styles.secondaryButton}
                onClick={this.handleRefresh}
              >
                Refresh Page
              </button>
              <button 
                style={styles.secondaryButton}
                onClick={this.handleReportError}
              >
                Export Logs
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Inline styles to ensure they work even if CSS fails to load
const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '200px',
    padding: '20px',
    backgroundColor: '#f8f9fa',
    color: '#333'
  },
  content: {
    textAlign: 'center',
    maxWidth: '400px'
  },
  icon: {
    fontSize: '48px',
    marginBottom: '16px'
  },
  title: {
    margin: '0 0 8px 0',
    fontSize: '18px',
    fontWeight: '600'
  },
  message: {
    margin: '0 0 16px 0',
    fontSize: '14px',
    color: '#666'
  },
  details: {
    marginBottom: '16px',
    textAlign: 'left'
  },
  summary: {
    cursor: 'pointer',
    fontSize: '13px',
    color: '#666'
  },
  errorText: {
    margin: '8px 0 0 0',
    padding: '8px',
    backgroundColor: '#fff',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '11px',
    overflow: 'auto',
    maxHeight: '100px',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word'
  },
  actions: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'center',
    flexWrap: 'wrap'
  },
  primaryButton: {
    padding: '8px 16px',
    backgroundColor: '#6366f1',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  secondaryButton: {
    padding: '8px 16px',
    backgroundColor: '#fff',
    color: '#333',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer'
  }
};

/**
 * Higher-order component to wrap any component with error boundary
 */
export function withErrorBoundary(Component, fallback = null, onError = null) {
  return function WrappedComponent(props) {
    return (
      <ErrorBoundary fallback={fallback} onError={onError}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

/**
 * Error boundary hook - provides error state for function components
 * Note: This does NOT catch React rendering errors (use ErrorBoundary for that)
 * This is for async operation errors
 */
export function useErrorHandler() {
  const [error, setError] = React.useState(null);
  
  const handleError = React.useCallback((err) => {
    const logger = getLogger();
    logger.error('Error handled by useErrorHandler', {
      error: err?.toString(),
      stack: err?.stack
    });
    setError(err);
  }, []);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  const withErrorHandling = React.useCallback(async (fn) => {
    try {
      return await fn();
    } catch (err) {
      handleError(err);
      throw err;
    }
  }, [handleError]);

  return {
    error,
    handleError,
    clearError,
    withErrorHandling
  };
}

/**
 * Try-catch wrapper for async functions with logging
 */
export async function tryCatch(fn, fallbackValue = null, errorMessage = 'Operation failed') {
  try {
    return await fn();
  } catch (error) {
    const logger = getLogger();
    logger.error(errorMessage, { error: error?.toString(), stack: error?.stack });
    return fallbackValue;
  }
}

/**
 * Create a safe version of a function that logs errors
 */
export function safeCall(fn, fallbackValue = null) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      const logger = getLogger();
      logger.error(`Error in ${fn.name || 'anonymous function'}`, {
        error: error?.toString(),
        args: args?.slice(0, 3) // Log first 3 args only
      });
      return fallbackValue;
    }
  };
}

export default ErrorBoundary;



