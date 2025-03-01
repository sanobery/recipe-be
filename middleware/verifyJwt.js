const jsonWebToken = require('jsonwebtoken')

const verifyJwt = (req, res, next) => {
    const authHeader = req.headers.authorization || req.headers.Authorization

    if (!authHeader?.startsWith('Bearer')) {
        return res.status(401).json({ message: 'Unauthorized User' })
    }

    const token = authHeader.split(' ')[1]
    jsonWebToken.verify(token, process.env.ACCESS_SECRET_KEY, (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: 'Forbidden: Invalid token' });
        }

        // Extract user info from decoded token
        req.userId = decoded.userId
        next()

    });
}

module.exports = verifyJwt