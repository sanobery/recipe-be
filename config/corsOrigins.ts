import dotenv from 'dotenv'
import process from 'process'
import { CorsOptions } from 'cors'
import { RESPONSE_MESSAGES } from '../utils/constants'

dotenv.config()
const allowedOrigins: string[] = [
    ...(process.env.ALLOWED_ORIGINS?.split(',') || []),
    ...(process.env.BACKEND_URL ? [process.env.BACKEND_URL] : []),
]

const corsOrigins: CorsOptions = {
    origin: (
        origin: string | undefined,
        callback: (err: Error | null, allow?: boolean) => void
    ): void => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true)
        } else {
            callback(new Error(RESPONSE_MESSAGES.CORS))
        }
    },
    credentials: true,
    optionsSuccessStatus: 200,
}

export default corsOrigins
