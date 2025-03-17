import redis from 'redis'
import logger from '../middleware/logger.js'

const redisClient = redis.createClient()

redisClient.on('error', (error) => {
    logger.error('Redis Error:', error)
})

// Connect to Redis when the application starts
redisClient.connect()
    .then(
        () =>
            logger.info('Connected To Redis', error)
    )
    .catch(
        (error) => logger.error('Redis Error:', error)
    )

export default redisClient
