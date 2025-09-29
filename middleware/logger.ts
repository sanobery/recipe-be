/**
 * Winston Logger Configuration
 * ----------------------------
 * This file sets up centralized logging using the Winston library.
 * It defines transports, formats, and log levels for consistent logging across the application.
 *
 * Usage:
 * - Import this logger wherever logging is needed (e.g., `import logger from './logger'`)
 * - Use `logger.info()`, `logger.error()`, `logger.warn()`, etc. to log messages
 *
 * Features:
 * - Console logging with timestamp and colorized output
 * - Optional file logging for error and combined logs
 * - Easily extendable for HTTP logging, custom formats, or external transports (e.g., Logstash, CloudWatch)
 */
import winston, { format, transports, Logger } from 'winston'

const logger: Logger = winston.createLogger({
    level: 'info',
    format: format.combine(
        format.timestamp(),
        format.printf(({ timestamp, level, message }) => {
            return `${timestamp} [${level.toUpperCase()}]: ${message}`
        })
    ),
    transports: [
        new transports.File({ filename: 'logs/errors.log', level: 'error' }),
        new transports.File({ filename: 'logs/combined.log' }),
    ],
})

export default logger
