const rateLimit = require('express-rate-limit');
const { logEvents } = require('./logger');

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 3, // Limit each IP to 3 requests per windowMs
    message: 'Too many requests, please try again later.',
    handler: (req, res, options) => {
        logEvents(`Too many Requests: ${options.message} \t ${req.method} \t ${req.url} \t ${req.headers.origin}`, 'error.log');
        res.status(options.statusCode).json({ message: options.message });
    }
});

module.exports = loginLimiter; // ✅ Ensure this is exported properly
