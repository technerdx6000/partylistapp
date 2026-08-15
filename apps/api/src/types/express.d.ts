import type { EventWithAdminToken } from '@listcollab/shared'

declare global {
    namespace Express {
        interface Request {
            event?: {
                id: number
                isAdmin: boolean
                shareToken: string
                event: EventWithAdminToken
            }
            requestId?: string
        }
    }
}

export { }