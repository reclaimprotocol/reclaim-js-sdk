import pino from 'pino';

// Define the possible log levels
export type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent';

// Create the logger instance with default level set to 'info'
const logger = pino({
  level: 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true
    }
  }
});

// Function to set the log level
export function setLogLevel(level: LogLevel) {
  logger.level = level;
}

// Export the logger instance and the setLogLevel function
export default {
  logger,
  setLogLevel
};
