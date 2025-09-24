/**
 * Controller class containing all the authentication functionalities.
 *
 * @since 1.0
 */

import dotenv from 'dotenv'
import process from 'process'
dotenv.config()
import asyncHandler from 'express-async-handler'
import { compare, hash } from 'bcrypt'
import CryptoJS from 'crypto-js'
const { AES, enc } = CryptoJS
import jwt from 'jsonwebtoken'
const { sign, verify } = jwt
import {
    actionCreateOrUpdateUser,
    checkUserEmail,
    checkUserById,
} from '../repositories/authRepository.js'
import { responseHandler } from '../utils/responseHandler.js'
import { RESPONSE_MESSAGES } from '../utils/constants.js'

const SECRET_KEY = process.env.SECRET_KEY

/**
 * Handles user authentication by verifying email and password.
 * - Checks if required fields (`email`, `password`) are provided.
 * - Finds the user in the database.
 * - Decrypts and compares the password with the stored hash.
 * - Generates an access token (valid for 10 minutes).
 * - Generates a refresh token (valid for 1 day) and stores it in an HTTP-only cookie.
 * - Responds with a success message and the access token on successful login.
 */
const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body
    if (!email || !password) {
        return responseHandler(res, 400, RESPONSE_MESSAGES.INVALID_PARAMETER)
    }

    const user = await checkUserEmail(email)
    if (!user) return responseHandler(res, 401, RESPONSE_MESSAGES.INVALID_USER)

    const decryptedPassword = AES.decrypt(password, SECRET_KEY).toString(enc.Utf8)

    const isMatch = await compare(decryptedPassword, user.password)

    if (!isMatch) return responseHandler(res, 401, RESPONSE_MESSAGES.INVALID_CREDENTIALS)

    const accessToken = sign(
        {
            userinfo: {
                userId: user._id,
            },
        },
        process.env.ACCESS_SECRET_KEY,
        { expiresIn: '10m' }
    )

    const refreshToken = sign(
        {
            userinfo: {
                userId: user._id,
            },
        },
        process.env.REFRESH_SECRET_KEY,
        { expiresIn: '1d' }
    )

    res.cookie('jwt', refreshToken, {
        httpOnly: true,
        // secure: true,
        sameSite: 'Lax',
        maxAge: 24 * 60 * 60 * 1000,
    })

    return responseHandler(res, 200, RESPONSE_MESSAGES.LOGIN_SUCCESS, { accessToken })
})

/**
 * Handles token refresh to provide a new access token.
 * - Checks if a refresh token (`jwt` cookie) is present.
 * - Verifies the refresh token using the secret key.
 * - If valid, extracts the user ID and generates a new access token (valid for 10 minutes).
 * - Responds with the new access token.
 * - Returns an error if the token is missing, invalid, or expired.
 */
const refresh = (req, res) => {
    const cookies = req.cookies

    if (!cookies?.jwt) return responseHandler(res, 401, RESPONSE_MESSAGES.UNAUTHORIZED)

    const refreshToken = cookies.jwt

    verify(refreshToken, process.env.REFRESH_SECRET_KEY, (err, decoded) => {
        if (err) {
            return responseHandler(res, 401, RESPONSE_MESSAGES.INVALID_TOKEN)
        }

        const user = { userinfo: { userId: decoded?.userinfo?.user?._id } }

        const newAccessToken = sign(user, process.env.ACCESS_SECRET_KEY, { expiresIn: '10m' })

        return responseHandler(res, 200, RESPONSE_MESSAGES.TOKEN_REFRESHED, {
            accessToken: newAccessToken,
        })
    })
}

/**
 * Retrieves the current authenticated user based on the refresh token.
 * - Checks if a refresh token (`jwt` cookie) is present.
 * - Verifies the refresh token using the secret key.
 * - Extracts the user ID from the decoded token.
 * - Fetches the user details from the database.
 * - Returns the user details if found.
 * - Responds with an error if the token is missing, invalid, or if the user does not exist.
 */
const getCurrentUser = (req, res) => {
    const cookies = req.cookies

    if (!cookies?.jwt) return responseHandler(res, 401, RESPONSE_MESSAGES.UNAUTHORIZED)

    const refreshToken = cookies.jwt
    verify(refreshToken, process.env.REFRESH_SECRET_KEY, async (err, decoded) => {
        if (err) {
            return responseHandler(res, 403, RESPONSE_MESSAGES.INVALID_TOKEN)
        }

        const userId = decoded.userinfo.userId

        if (!userId) {
            return responseHandler(res, 400, RESPONSE_MESSAGES.INVALID_PARAMETER)
        }

        const userExist = await checkUserById(userId)
        if (!userExist) {
            return responseHandler(res, 400, RESPONSE_MESSAGES.INVALID_USER_ID)
        }

        return responseHandler(res, 200, RESPONSE_MESSAGES.AUTH_RECIPE_DETAIL, { userExist })
    })
}

/**
 * Logs out the user by clearing the authentication cookie.
 * - Checks if the `jwt` cookie is present.
 * - If no cookie is found, responds with a 204 status (No Content).
 * - Clears the `jwt` cookie to remove the refresh token.
 * - Responds with a success message indicating the user has logged out.
 */
const logout = (req, res) => {
    const cookies = req.cookies
    if (!cookies?.jwt) return responseHandler(res, 204, RESPONSE_MESSAGES.SERVER_ERROR)

    res.clearCookie('jwt', {
        httpOnly: true,
        // secure: true,
        sameSite: 'lax',
    }).json({ message: 'Logout successfully' })
}

/**
 * Creates a new user account.
 * - Validates username and password strength.
 * - Decrypts the password and checks its length and complexity.
 * - Ensures the email is not already registered.
 * - Hashes the password and saves the new user to the database.
 * - Returns appropriate success or error responses.
 */
const createNewUser = asyncHandler(async (req, res) => {
    const { username, email, password } = req.body
    const errors = []

    if (!username || username.length < 4) {
        errors.push('Username must be at least 4 characters long.')
    }
    const decryptedPassword = AES.decrypt(password, SECRET_KEY).toString(enc.Utf8)

    if (!password) {
        errors.push('Password is required.')
    } else {
        if (decryptedPassword.length < 8 || decryptedPassword.length > 16) {
            errors.push('Password must be between 8 to 16 characters long.')
        }
        if (!/[A-Z]/.test(decryptedPassword)) {
            errors.push('Password must include at least one uppercase letter.')
        }
        if (!/[a-z]/.test(decryptedPassword)) {
            errors.push('Password must include at least one lowercase letter.')
        }
        if (!/\d/.test(decryptedPassword)) {
            errors.push('Password must include at least one number.')
        }
        if (!/[@$!%*?&]/.test(decryptedPassword)) {
            errors.push('Password must include at least one special character (@$!%*?&).')
        }
    }

    if (errors.length > 0) {
        return responseHandler(res, 400, { message: errors.join(' ') })
    }

    const userExist = await checkUserEmail(email)
    if (userExist) {
        return responseHandler(res, 400, RESPONSE_MESSAGES.USER_ALREADY_EXIST)
    }

    const hashPassword = await hash(decryptedPassword, 10)
    const userCreated = await actionCreateOrUpdateUser(null, username, email, hashPassword)

    if (userCreated) {
        return responseHandler(res, 200, RESPONSE_MESSAGES.SIGNUP_SUCCESS, { user: userCreated })
    } else {
        return responseHandler(res, 409, RESPONSE_MESSAGES.BAD_REQUEST)
    }
})

/**
 * Updates an existing user's details.
 * - Validates required fields (userId, username, email, password).
 * - Checks if the user exists in the database.
 * - Ensures the new email is not already taken by another user.
 * - Decrypts and hashes the new password before saving.
 * - Updates the user's information in the database.
 * - Returns appropriate success or error responses.
 */
const updateUser = asyncHandler(async (req, res) => {
    const { userId, username, email, password } = req.body

    if (!userId || !username || !email || !password) {
        return responseHandler(res, 400, RESPONSE_MESSAGES.INVALID_PARAMETER)
    }

    const userExist = await checkUserById(userId)

    if (!userExist) {
        return responseHandler(res, 400, RESPONSE_MESSAGES.INVALID_USER)
    }

    const duplicate = await checkUserEmail(email)
    if (duplicate && duplicate._id.toString() !== userId) {
        return responseHandler(res, 409, RESPONSE_MESSAGES.USER_ALREADY_EXIST)
    }

    const decryptedPassword = AES.decrypt(password, SECRET_KEY).toString(enc.Utf8)

    const hashedPassword = await hash(decryptedPassword, 10)
    const userUpdated = await actionCreateOrUpdateUser(userId, username, email, hashedPassword)

    if (userUpdated) {
        return responseHandler(res, 200, RESPONSE_MESSAGES.SUCCESSFUL_UPDATED, {
            userId: userUpdated._id.toString(),
        })
    } else {
        return responseHandler(res, 500, RESPONSE_MESSAGES.BAD_REQUEST)
    }
})

export { login, logout, refresh, getCurrentUser, createNewUser, updateUser }
