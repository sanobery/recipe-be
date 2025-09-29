/**
 * JWT Authentication Utility
 * ---------------------------
 * This file handles JSON Web Token (JWT) generation and verification for user authentication.
 * It provides helper functions to sign tokens, verify them, and extract user information.
 *
 * Usage:
 * - Use `verifyToken(token)` to validate incoming tokens and decode payloads
 * - Middleware can use this to protect routes and enforce authentication
 *
 * Features:
 * - Tokens are signed using a secret key stored in environment variables
 * - Supports expiration and custom claims
 * - Compatible with Bearer token format in HTTP headers
 *
 * Notes:
 * - Ensure `JWT_SECRET` and `JWT_EXPIRES_IN` are defined in your `.env` file
 * - Always validate token presence and structure before decoding
 * - Consider rotating secrets periodically for enhanced security
 */
import { Request, Response, NextFunction } from 'express'
import { verify, JwtPayload } from 'jsonwebtoken'
import { RESPONSE_MESSAGES } from '../utils/constants'

interface AuthenticatedRequest extends Request {
    userId?: string
}

const verifyJwt = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization || (req.headers.Authorization as string)

    if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({ message: 'Unauthorized User' })
        return
    }

    const token = authHeader.split(' ')[1]

    verify(token, process.env.ACCESS_SECRET_KEY!, (err, decoded) => {
        if (err || !decoded || typeof decoded !== 'object') {
            res.status(403).json({ message: RESPONSE_MESSAGES.INVALID_TOKEN })
            return
        }
        const userId = (decoded as JwtPayload & { userinfo?: { userId?: string } }).userinfo?.userId
        if (!userId) {
            res.status(400).json({ message: RESPONSE_MESSAGES.INVALID_TOKEN })
            return
        }

        req.userId = userId
        next()
    })
}

export default verifyJwt
