// Define the possible log levels
export type LogLevel = 'info' | 'warn' | 'error' | 'silent';

// Define a simple logger class
class SimpleLogger {
  private level: LogLevel = 'info';

  setLevel(level: LogLevel) {
    this.level = level;
  }

  private shouldLog(messageLevel: LogLevel): boolean {
    const levels: LogLevel[] = ['error', 'warn', 'info', 'silent'];
    return levels.indexOf(this.level) >= levels.indexOf(messageLevel);
  }

  private log(level: LogLevel, message: string, ...args: any[]) {
    if (this.shouldLog(level) && this.level !== 'silent') {
      const logFunction = this.getLogFunction(level);
      console.log('current level', this.level);
      logFunction(`[${level.toUpperCase()}]`, message, ...args);
    }
  }

  private getLogFunction(level: LogLevel): (message?: any, ...optionalParams: any[]) => void {
    switch (level) {
      case 'error':
        return console.error;
      case 'warn':
        return console.warn;
      case 'info':
        return console.info;
      default:
        return () => {}; // No-op for 'silent'
    }
  }

  info(message: string, ...args: any[]) {
    this.log('info', message, ...args);
  }

  warn(message: string, ...args: any[]) {
    this.log('warn', message, ...args);
  }

  error(message: string, ...args: any[]) {
    this.log('error', message, ...args);
  }
}

// Create the logger instance
const logger = new SimpleLogger();

// Function to set the log level
export function setLogLevel(level: LogLevel) {
  logger.setLevel(level);
}

// Export the logger instance and the setLogLevel function
export default {
  logger,
  setLogLevel
};
