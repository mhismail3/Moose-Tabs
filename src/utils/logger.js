/**
 * Logger Utility
 * Provides structured logging with levels, rotation, and export functionality
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

const LOG_LEVEL_NAMES = {
  0: 'DEBUG',
  1: 'INFO',
  2: 'WARN',
  3: 'ERROR'
};

// Maximum number of log entries to keep
const MAX_LOG_ENTRIES = 1000;

// Maximum age of log entries in milliseconds (1 hour)
const MAX_LOG_AGE = 60 * 60 * 1000;

class Logger {
  constructor() {
    this.logLevel = LOG_LEVELS.INFO;
    this.logs = [];
    this.initialized = false;
    this.callbacks = [];
  }

  /**
   * Initialize the logger
   */
  async initialize() {
    if (this.initialized) return;

    // Try to load saved logs
    try {
      const result = await chrome.storage.local.get('mooseTabsLogs');
      if (result.mooseTabsLogs) {
        this.logs = result.mooseTabsLogs;
        this.cleanOldLogs();
      }
    } catch (error) {
      console.error('Failed to load logs:', error);
    }

    // Try to load log level setting
    try {
      const result = await chrome.storage.local.get('mooseTabsLogLevel');
      if (result.mooseTabsLogLevel !== undefined) {
        this.logLevel = result.mooseTabsLogLevel;
      }
    } catch (error) {
      // Use default log level
    }

    this.initialized = true;
  }

  /**
   * Set the log level
   * @param {string|number} level - Log level name or number
   */
  async setLogLevel(level) {
    if (typeof level === 'string') {
      level = LOG_LEVELS[level.toUpperCase()] ?? LOG_LEVELS.INFO;
    }
    this.logLevel = level;
    
    try {
      await chrome.storage.local.set({ mooseTabsLogLevel: level });
    } catch (error) {
      // Ignore storage errors
    }
  }

  /**
   * Get the current log level name
   */
  getLogLevel() {
    return LOG_LEVEL_NAMES[this.logLevel] || 'INFO';
  }

  /**
   * Add a log entry
   */
  _addLog(level, message, data = null) {
    if (level < this.logLevel) return;

    const entry = {
      timestamp: Date.now(),
      level: LOG_LEVEL_NAMES[level],
      message,
      data: data ? this._sanitizeData(data) : null
    };

    this.logs.push(entry);

    // Notify callbacks
    this.callbacks.forEach(cb => {
      try {
        cb(entry);
      } catch (e) {
        // Ignore callback errors
      }
    });

    // Rotate logs if needed
    if (this.logs.length > MAX_LOG_ENTRIES) {
      this.logs = this.logs.slice(-MAX_LOG_ENTRIES);
    }

    // Save to storage (debounced)
    this._debouncedSave();

    // Also log to console
    this._logToConsole(entry);
  }

  /**
   * Sanitize data for logging (remove sensitive info, circular refs)
   */
  _sanitizeData(data) {
    try {
      // Handle circular references and limit depth
      const seen = new WeakSet();
      const sanitize = (obj, depth = 0) => {
        if (depth > 5) return '[max depth]';
        if (obj === null || obj === undefined) return obj;
        if (typeof obj !== 'object') return obj;
        
        if (seen.has(obj)) return '[circular]';
        seen.add(obj);

        if (Array.isArray(obj)) {
          return obj.slice(0, 100).map(item => sanitize(item, depth + 1));
        }

        const result = {};
        for (const [key, value] of Object.entries(obj)) {
          // Skip sensitive keys
          if (['apiKey', 'password', 'token', 'secret'].some(s => key.toLowerCase().includes(s))) {
            result[key] = '[REDACTED]';
          } else {
            result[key] = sanitize(value, depth + 1);
          }
        }
        return result;
      };

      return sanitize(data);
    } catch (error) {
      return { error: 'Failed to sanitize data' };
    }
  }

  /**
   * Log to console
   */
  _logToConsole(entry) {
    const timestamp = new Date(entry.timestamp).toISOString();
    const prefix = `[Moose Tabs ${entry.level}] ${timestamp}:`;
    
    switch (entry.level) {
      case 'DEBUG':
        console.debug(prefix, entry.message, entry.data || '');
        break;
      case 'INFO':
        console.info(prefix, entry.message, entry.data || '');
        break;
      case 'WARN':
        console.warn(prefix, entry.message, entry.data || '');
        break;
      case 'ERROR':
        console.error(prefix, entry.message, entry.data || '');
        break;
      default:
        console.log(prefix, entry.message, entry.data || '');
    }
  }

  /**
   * Debounced save to storage
   */
  _saveTimer = null;
  _debouncedSave() {
    if (this._saveTimer) {
      clearTimeout(this._saveTimer);
    }
    
    this._saveTimer = setTimeout(async () => {
      try {
        await chrome.storage.local.set({ mooseTabsLogs: this.logs });
      } catch (error) {
        // Ignore storage errors
      }
      this._saveTimer = null;
    }, 2000);
  }

  /**
   * Clean old log entries
   */
  cleanOldLogs() {
    const cutoff = Date.now() - MAX_LOG_AGE;
    this.logs = this.logs.filter(entry => entry.timestamp > cutoff);
  }

  /**
   * Log methods
   */
  debug(message, data = null) {
    this._addLog(LOG_LEVELS.DEBUG, message, data);
  }

  info(message, data = null) {
    this._addLog(LOG_LEVELS.INFO, message, data);
  }

  warn(message, data = null) {
    this._addLog(LOG_LEVELS.WARN, message, data);
  }

  error(message, data = null) {
    this._addLog(LOG_LEVELS.ERROR, message, data);
  }

  /**
   * Get all logs
   */
  getLogs() {
    return [...this.logs];
  }

  /**
   * Get recent logs
   * @param {number} count - Number of logs to return
   * @param {string} level - Optional minimum level filter
   */
  getRecentLogs(count = 100, level = null) {
    let filteredLogs = this.logs;
    
    if (level) {
      const minLevel = LOG_LEVELS[level.toUpperCase()] ?? 0;
      filteredLogs = this.logs.filter(entry => LOG_LEVELS[entry.level] >= minLevel);
    }
    
    return filteredLogs.slice(-count);
  }

  /**
   * Export logs as JSON string
   */
  exportLogs() {
    return JSON.stringify({
      exportedAt: new Date().toISOString(),
      logCount: this.logs.length,
      logs: this.logs
    }, null, 2);
  }

  /**
   * Export logs as downloadable file
   */
  exportLogsAsFile() {
    const data = this.exportLogs();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `moose-tabs-logs-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Clear all logs
   */
  async clearLogs() {
    this.logs = [];
    try {
      await chrome.storage.local.remove('mooseTabsLogs');
    } catch (error) {
      // Ignore storage errors
    }
  }

  /**
   * Subscribe to new log entries
   * @param {Function} callback - Function to call with each new log entry
   * @returns {Function} Unsubscribe function
   */
  subscribe(callback) {
    this.callbacks.push(callback);
    return () => {
      this.callbacks = this.callbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Log a user action
   */
  logAction(action, details = {}) {
    this.info(`User action: ${action}`, details);
  }

  /**
   * Log a tab operation
   */
  logTabOperation(operation, tabId, details = {}) {
    this.info(`Tab ${operation}: ${tabId}`, details);
  }

  /**
   * Log a drag-drop operation
   */
  logDragDrop(phase, details = {}) {
    this.debug(`Drag-drop ${phase}`, details);
  }

  /**
   * Log an API call
   */
  logAPI(endpoint, success, details = {}) {
    if (success) {
      this.debug(`API success: ${endpoint}`, details);
    } else {
      this.warn(`API failure: ${endpoint}`, details);
    }
  }
}

// Singleton instance
let loggerInstance = null;

/**
 * Get the logger singleton
 */
export function getLogger() {
  if (!loggerInstance) {
    loggerInstance = new Logger();
  }
  return loggerInstance;
}

/**
 * Initialize the logger (call early in app startup)
 */
export async function initializeLogger() {
  const logger = getLogger();
  await logger.initialize();
  return logger;
}

// Shorthand exports for convenience
export const logger = {
  debug: (message, data) => getLogger().debug(message, data),
  info: (message, data) => getLogger().info(message, data),
  warn: (message, data) => getLogger().warn(message, data),
  error: (message, data) => getLogger().error(message, data),
  logAction: (action, details) => getLogger().logAction(action, details),
  logTabOperation: (op, tabId, details) => getLogger().logTabOperation(op, tabId, details),
  logDragDrop: (phase, details) => getLogger().logDragDrop(phase, details),
  logAPI: (endpoint, success, details) => getLogger().logAPI(endpoint, success, details),
};

export default Logger;






