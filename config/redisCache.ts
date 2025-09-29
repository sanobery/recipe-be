/**
 * Redis Cache Configuration
 * --------------------------
 * This file sets up Redis as a caching layer for the application.
 * It establishes a connection to the Redis server and provides utility methods
 * for storing, retrieving, and invalidating cached data.
 *
 * Usage:
 * - Import this module wherever caching is needed (e.g., `import redisClient from './redis'`)
 * - Use `redisClient.set()`, `redisClient.get()`, `redisClient.del()` to interact with the cache
 *
 * Benefits:
 * - Improves performance by reducing database load
 * - Enables fast access to frequently requested data
 * - Supports TTL (time-to-live) for automatic cache expiration
 *
 * Notes:
 * - Ensure Redis server is running and accessible at the configured host/port
 * - Handle connection errors gracefully to avoid crashing the app
 * - Consider namespacing keys to avoid collisions
 */
import { createClient } from 'redis'
import logger from '../middleware/logger'
import { getMessage } from '../utils/constants'

const redisClient = createClient()

redisClient.on('error', (error) => {
    logger.error('Redis Error:', error)
})

redisClient
    .connect()
    .then(() => logger.info(getMessage('redis', 'connected')))
    .catch((error) => logger.error(getMessage('redis', 'error'), error))

export default redisClient
