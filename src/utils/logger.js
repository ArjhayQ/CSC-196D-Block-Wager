// src/utils/logger.js

const DEBUG = true;

class Logger {
  static prefix(component) {
    return `[${component}]`;
  }

  static log(component, message, data = null) {
    if (DEBUG) {
      const timestamp = new Date().toISOString();
      const prefix = this.prefix(component);
      console.log(`${timestamp} ${prefix} ${message}`, data || '');
    }
  }

  static error(component, message, error = null) {
    if (DEBUG) {
      const timestamp = new Date().toISOString();
      const prefix = this.prefix(component);
      console.error(`${timestamp} ${prefix} ERROR: ${message}`, error || '');
    }
  }

  static warn(component, message, data = null) {
    if (DEBUG) {
      const timestamp = new Date().toISOString();
      const prefix = this.prefix(component);
      console.warn(`${timestamp} ${prefix} WARNING: ${message}`, data || '');
    }
  }
}

export default Logger;