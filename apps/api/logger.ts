import pino, { type DestinationStream, type Logger } from 'pino'

/**
 * Creates a configured API logger with token redaction applied.
 */
export function createLogger(destination?: DestinationStream): Logger {
    return pino(
        {
            level: 'info',
            redact: {
                paths: ['req.headers["x-event-token"]', 'req.headers.cookie'],
                censor: '[REDACTED]',
            },
        },
        destination
    )
}

const logger = createLogger()

/**
 * Applies the validated runtime log level to the shared API logger instance.
 */
export function configureLogger(level: string): void {
    logger.level = level
}

export default logger