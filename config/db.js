import { connect } from 'mongoose'
import dotenv from 'dotenv'
import process from 'process'
dotenv.config()

const URI = process.env.MONGODB_URI

const db = async () => {
    try {
        await connect(URI)

    }
    catch (error) {
        process.exit(1)
    }
}

export default db 