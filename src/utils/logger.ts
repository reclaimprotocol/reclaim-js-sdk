// Define the possible log levels
export type LogLevel = 'info' | 'silent';

// Define a simple logger class
class SimpleLogger {
  private level: LogLevel = 'info';

  setLevel(level: LogLevel) {
    this.level = level;
  }

  private log(message: string, ...args: any[]) {
    if (this.level === 'info') {
      console.info(`[INFO]`, message, ...args);
    }
  }

  info(message: string, ...args: any[]) {
    this.log(message, ...args);
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
