import { format } from 'date-fns'
import { v4 as uuid } from 'uuid'
import { existsSync } from 'fs'
import { promises as fsPromises } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

// ✅ Fix for __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const logEvents = async (message, logFileName) => {
    const dateTime = `${format(new Date(), 'yyyyMMdd\tHH:mm:ss')}`
    const logItem = `${dateTime} \t${uuid()} \t${message}\n`

    try {
        const logDir = join(__dirname, '..', 'logs')

        if (!existsSync(logDir)) {
            await fsPromises.mkdir(logDir, { recursive: true })
        }
        await fsPromises.appendFile(join(logDir, logFileName), logItem)
    } catch (err) {
        console.error(err)
    }
}

const logger = (req, res, next) => {
    logEvents(`${req.method}\t${req.url}\t${req.headers.origin}`, 'reqLog.log')
    next()
}

export { logEvents, logger }
