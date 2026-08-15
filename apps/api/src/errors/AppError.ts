/**
 * Represents an API error with a stable machine-readable code and HTTP status.
 */
export class AppError extends Error {
    constructor(
        public readonly statusCode: number,
        public readonly code: string,
        message: string,
        public readonly details?: Record<string, unknown>
    ) {
        super(message)
        this.name = 'AppError'
    }
}