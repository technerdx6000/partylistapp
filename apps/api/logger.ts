import pino from 'pino'

const logger = pino({
    level: 'info',
})

/**
 * Applies the validated runtime log level to the shared API logger instance.
 */
export function configureLogger(level: string): void {
    logger.level = level
}

export default logger