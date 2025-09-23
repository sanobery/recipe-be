import dotenv from 'dotenv'
dotenv.config()
import process from 'process'

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',')
const corsOrigins = {
    origin: (origin, callback) => {
        if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
            callback(null, true)
        } else {
            callback(new Error('Not allowed by CORS'))
        }
    },
    credentials: true,
    optionsSuccessStatus: 200,
}

export default corsOrigins
