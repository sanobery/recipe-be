import winston from 'winston'

const logger = winston.createLogger({
    level: 'info', // Default logging level
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
            return `${timestamp} [${level.toUpperCase()}]: ${message}`
        })
    ),
    transports: [
        new winston.transports.File({ filename: 'logs/errors.log', level: 'error' }), // Error logs
        new winston.transports.File({ filename: 'logs/combined.log' }), // All logs
    ],
})

export default logger
