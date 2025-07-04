const fs = require('fs');
const path = require('path');

class Logger {
  constructor() {
    this.logLevel = process.env.LOG_LEVEL || 'info';
    this.logDir = process.env.LOG_DIR || 'logs';
    this.maxLogSize = process.env.MAX_LOG_SIZE || 10 * 1024 * 1024; // 10MB
    this.maxLogFiles = process.env.MAX_LOG_FILES || 5;
    
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };
    
    this.colors = {
      error: '\x1b[31m', // Red
      warn: '\x1b[33m',  // Yellow
      info: '\x1b[36m',  // Cyan
      debug: '\x1b[35m', // Magenta
      reset: '\x1b[0m'
    };
    
    this.ensureLogDirectory();
  }

  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  shouldLog(level) {
    return this.levels[level] <= this.levels[this.logLevel];
  }

  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const pid = process.pid;
    
    let logEntry = {
      timestamp,
      level: level.toUpperCase(),
      pid,
      message
    };

    if (Object.keys(meta).length > 0) {
      logEntry.meta = meta;
    }

    return logEntry;
  }

  formatConsoleMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const color = this.colors[level] || '';
    const reset = this.colors.reset;
    
    let consoleMsg = `${color}[${timestamp}] [${level.toUpperCase()}] ${message}${reset}`;
    
    if (Object.keys(meta).length > 0) {
      consoleMsg += `\n${color}Meta: ${JSON.stringify(meta, null, 2)}${reset}`;
    }
    
    return consoleMsg;
  }

  writeToFile(level, logEntry) {
    const filename = `${level}.log`;
    const filepath = path.join(this.logDir, filename);
    const logLine = JSON.stringify(logEntry) + '\n';

    try {
      // Check file size and rotate if necessary
      if (fs.existsSync(filepath)) {
        const stats = fs.statSync(filepath);
        if (stats.size >= this.maxLogSize) {
          this.rotateLogFile(filepath);
        }
      }

      fs.appendFileSync(filepath, logLine);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  rotateLogFile(filepath) {
    try {
      for (let i = this.maxLogFiles - 1; i >= 1; i--) {
        const oldFile = `${filepath}.${i}`;
        const newFile = `${filepath}.${i + 1}`;
        
        if (fs.existsSync(oldFile)) {
          if (i === this.maxLogFiles - 1) {
            fs.unlinkSync(oldFile); // Delete oldest
          } else {
            fs.renameSync(oldFile, newFile);
          }
        }
      }
      
      if (fs.existsSync(filepath)) {
        fs.renameSync(filepath, `${filepath}.1`);
      }
    } catch (error) {
      console.error('Failed to rotate log file:', error);
    }
  }

  log(level, message, meta = {}) {
    if (!this.shouldLog(level)) {
      return;
    }

    const logEntry = this.formatMessage(level, message, meta);
    const consoleMessage = this.formatConsoleMessage(level, message, meta);

    // Console output
    console.log(consoleMessage);

    // File output
    this.writeToFile(level, logEntry);
    
    // Also write to combined log
    this.writeToFile('combined', logEntry);
  }

  error(message, meta = {}) {
    this.log('error', message, meta);
  }

  warn(message, meta = {}) {
    this.log('warn', message, meta);
  }

  info(message, meta = {}) {
    this.log('info', message, meta);
  }

  debug(message, meta = {}) {
    this.log('debug', message, meta);
  }

  // Special methods for common scenarios
  authAttempt(username, success, ip = 'unknown') {
    this.info(`Authentication attempt`, {
      username,
      success,
      ip,
      type: 'auth'
    });
  }

  sessionCreated(sessionId, userId, shell) {
    this.info(`Terminal session created`, {
      sessionId,
      userId,
      shell,
      type: 'session'
    });
  }

  sessionClosed(sessionId, reason) {
    this.info(`Terminal session closed`, {
      sessionId,
      reason,
      type: 'session'
    });
  }

  connectionEvent(event, details = {}) {
    this.info(`WebSocket ${event}`, {
      ...details,
      type: 'connection'
    });
  }

  securityEvent(event, details = {}) {
    this.warn(`Security event: ${event}`, {
      ...details,
      type: 'security'
    });
  }

  errorWithStack(error, context = '') {
    this.error(`${context}: ${error.message}`, {
      stack: error.stack,
      type: 'error'
    });
  }

  // Get recent logs for debugging
  getRecentLogs(level = 'combined', lines = 100) {
    const filepath = path.join(this.logDir, `${level}.log`);
    
    if (!fs.existsSync(filepath)) {
      return [];
    }

    try {
      const content = fs.readFileSync(filepath, 'utf8');
      const logLines = content.trim().split('\n');
      
      return logLines
        .slice(-lines)
        .map(line => {
          try {
            return JSON.parse(line);
          } catch {
            return { raw: line };
          }
        });
    } catch (error) {
      this.error('Failed to read log file', { error: error.message });
      return [];
    }
  }

  // Get log statistics
  getLogStats() {
    const stats = {};
    const logFiles = ['error', 'warn', 'info', 'debug', 'combined'];

    for (const level of logFiles) {
      const filepath = path.join(this.logDir, `${level}.log`);
      if (fs.existsSync(filepath)) {
        const fileStats = fs.statSync(filepath);
        stats[level] = {
          size: fileStats.size,
          lastModified: fileStats.mtime,
          exists: true
        };
      } else {
        stats[level] = { exists: false };
      }
    }

    return stats;
  }
}

// Singleton instance
let loggerInstance = null;

function createLogger() {
  if (!loggerInstance) {
    loggerInstance = new Logger();
  }
  return loggerInstance;
}

function getLogger() {
  return loggerInstance || createLogger();
}

module.exports = { createLogger, getLogger, Logger };