import mongoose from 'mongoose'
import * as dotenv from 'dotenv'
import logger from '../middleware/logger'
import { getMessage, RESPONSE_MESSAGES } from '../utils/constants'
import process from 'process'
dotenv.config()

const URI = process.env.MONGODB_URI || ''

export const connectDB = async () => {
    try {
        if (!URI) throw new Error(RESPONSE_MESSAGES.DB_URI_UNDEFINED)
        await mongoose.connect(URI)
        logger.info(getMessage('MongoDB', 'connected'))
    } catch (err) {
        logger.error(getMessage('DB', 'error'), err)
        process.exit(1)
    }
}
