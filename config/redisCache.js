import redis from 'redis'
import logger from '../middleware/logger.js'

const redisClient = redis.createClient()

redisClient.on('error', (error) => {
    logger.error('Redis Error:', error)
})

// Connect to Redis when the application starts
redisClient
    .connect()
    .then(() => logger.info('Connected To Redis')) //  No need for `error` here
    .catch((error) => logger.error('Redis Connection Error:', error)) //  Correct error handling

export default redisClient
