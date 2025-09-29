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
import { actionCreateOrUpdateUser } from '../repositories/authRepository'
import { responseHandler } from '../utils/responseHandler'
import { getMessage, RESPONSE_MESSAGES } from '../utils/constants'
import { IUser } from '../models/users' // adjust path
import { Request, Response } from 'express'
import { JwtPayload } from 'jsonwebtoken'
import { LoginRequestBody, UserRequestBody } from '../types/userInterface'
import UserModel from '../models/users'
import { checkById, findOneByFields } from '../repositories/dbRepository'

/**
 * Handles user authentication by verifying email and password.
 * - Checks if required fields (`email`, `password`) are provided.
 * - Finds the user in the database.
 * - Decrypts and compares the password with the stored hash.
 * - Generates an access token (valid for 10 minutes).
 * - Generates a refresh token (valid for 1 day) and stores it in an HTTP-only cookie.
 * - Responds with a success message and the access token on successful login.
 */

const login = asyncHandler(
    async (req: Request<object, object, LoginRequestBody>, res: Response): Promise<void> => {
        const { email, password } = req.body

        if (!email || !password) {
            responseHandler(res, 400, RESPONSE_MESSAGES.INVALID_PARAMETER)
            return
        }

        const user: IUser | null = await findOneByFields(UserModel, { email })
        if (!user) {
            responseHandler(res, 401, RESPONSE_MESSAGES.INVALID_USER)
            return
        }

        const decryptedPassword = AES.decrypt(password, process.env.SECRET_KEY!).toString(enc.Utf8)
        const isMatch = await compare(decryptedPassword, user.password)

        if (!isMatch) {
            responseHandler(res, 401, RESPONSE_MESSAGES.INVALID_CREDENTIALS)
            return
        }

        const accessToken = sign(
            {
                userinfo: {
                    userId: user._id,
                },
            },
            process.env.ACCESS_SECRET_KEY!,
            { expiresIn: '10m' }
        )

        const refreshToken = sign(
            {
                userinfo: {
                    userId: user._id,
                },
            },
            process.env.REFRESH_SECRET_KEY!,
            { expiresIn: '1d' }
        )

        res.cookie('jwt', refreshToken, {
            httpOnly: true,
            sameSite: 'lax',
            maxAge: 24 * 60 * 60 * 1000,
        })

        responseHandler(res, 200, RESPONSE_MESSAGES.LOGIN_SUCCESS, { accessToken })
    }
)

/**
 * Handles token refresh to provide a new access token.
 * - Checks if a refresh token (`jwt` cookie) is present.
 * - Verifies the refresh token using the secret key.
 * - If valid, extracts the user ID and generates a new access token (valid for 10 minutes).
 * - Responds with the new access token.
 * - Returns an error if the token is missing, invalid, or expired.
 */
const refresh = (req: Request, res: Response): void => {
    const cookies = req.cookies

    if (!cookies?.jwt) {
        responseHandler(res, 401, RESPONSE_MESSAGES.UNAUTHORIZED)
        return
    }

    const refreshToken = cookies.jwt

    verify(refreshToken, process.env.REFRESH_SECRET_KEY!, (err: Error | null, decoded: unknown) => {
        if (err || !decoded || typeof decoded !== 'object') {
            responseHandler(res, 401, RESPONSE_MESSAGES.INVALID_TOKEN)
            return
        }

        const payload = decoded as JwtPayload
        const userId = payload.userinfo?.user?._id

        if (!userId) {
            responseHandler(res, 400, RESPONSE_MESSAGES.INVALID_PARAMETER)
            return
        }

        const user = { userinfo: { userId } }

        const newAccessToken = sign(user, process.env.ACCESS_SECRET_KEY!, {
            expiresIn: '10m',
        })

        responseHandler(res, 200, RESPONSE_MESSAGES.TOKEN_REFRESHED, {
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
const getCurrentUser = (req: Request, res: Response): void => {
    const cookies = req.cookies

    if (!cookies?.jwt) {
        responseHandler(res, 401, RESPONSE_MESSAGES.UNAUTHORIZED)
        return
    }

    const refreshToken = cookies.jwt

    verify(
        refreshToken,
        process.env.REFRESH_SECRET_KEY!,
        async (err: Error | null, decoded: unknown): Promise<void> => {
            if (err || !decoded || typeof decoded !== 'object') {
                responseHandler(res, 403, RESPONSE_MESSAGES.INVALID_TOKEN)
                return
            }

            const payload = decoded as JwtPayload & { userinfo?: { userId?: string } }
            const userId = payload.userinfo?.userId

            if (!userId) {
                responseHandler(res, 400, RESPONSE_MESSAGES.INVALID_PARAMETER)
                return
            }

            const userExist = await checkById(UserModel, userId)
            if (!userExist) {
                responseHandler(res, 400, RESPONSE_MESSAGES.INVALID_USER_ID)
                return
            }

            responseHandler(res, 200, RESPONSE_MESSAGES.AUTH_RECIPE_DETAIL, { userExist })
        }
    )
}

/**
 * Logs out the user by clearing the authentication cookie.
 * - Checks if the `jwt` cookie is present.
 * - If no cookie is found, responds with a 204 status (No Content).
 * - Clears the `jwt` cookie to remove the refresh token.
 * - Responds with a success message indicating the user has logged out.
 */
const logout = (req: Request, res: Response): void => {
    const cookies = req.cookies

    if (!cookies?.jwt) {
        responseHandler(res, 204, RESPONSE_MESSAGES.SERVER_ERROR)
        return
    }

    res.clearCookie('jwt', {
        httpOnly: true,
        sameSite: 'lax', //  lowercase to match CookieOptions type
    })

    res.status(200).json({ message: getMessage('Logout', 'success') })
}

/**
 * Creates a new user account.
 * - Validates username and password strength.
 * - Decrypts the password and checks its length and complexity.
 * - Ensures the email is not already registered.
 * - Hashes the password and saves the new user to the database.
 * - Returns appropriate success or error responses.
 */

const createNewUser = asyncHandler(
    async (req: Request<object, object, UserRequestBody>, res: Response): Promise<void> => {
        const { username, email, password } = req.body
        const errors: string[] = []

        if (!username || username.length < 4) {
            errors.push(RESPONSE_MESSAGES.USERNAME_LENGTH)
        }

        if (!password) {
            errors.push(getMessage('Password', 'required'))
        }

        const decryptedPassword = AES.decrypt(password, process.env.SECRET_KEY!).toString(enc.Utf8)

        if (password) {
            if (decryptedPassword.length < 8 || decryptedPassword.length > 16) {
                errors.push(RESPONSE_MESSAGES.PASSWORD_LENGTH)
            }
            if (!/[A-Z]/.test(decryptedPassword)) {
                errors.push(getMessage('Password', 'include', 'uppercase letter'))
            }
            if (!/[a-z]/.test(decryptedPassword)) {
                errors.push(getMessage('Password', 'include', 'lowercase letter'))
            }
            if (!/\d/.test(decryptedPassword)) {
                errors.push(getMessage('Password', 'include', 'one number'))
            }
            if (!/[@$!%*?&]/.test(decryptedPassword)) {
                errors.push(getMessage('Password', 'include', 'one special character (@$!%*?&).'))
            }
        }

        if (errors.length > 0) {
            responseHandler(res, 400, errors.join(' '))
            return
        }

        const userExist: IUser | null = await findOneByFields(UserModel, { email })
        if (userExist) {
            responseHandler(res, 400, RESPONSE_MESSAGES.USER_ALREADY_EXIST)
            return
        }

        const hashPassword = await hash(decryptedPassword, 10)
        const userCreated = await actionCreateOrUpdateUser(null, username, email, hashPassword)

        if (userCreated) {
            responseHandler(res, 200, RESPONSE_MESSAGES.SIGNUP_SUCCESS, { user: userCreated })
        } else {
            responseHandler(res, 409, RESPONSE_MESSAGES.BAD_REQUEST)
        }
    }
)

/**
 * Updates an existing user's details.
 * - Validates required fields (userId, username, email, password).
 * - Checks if the user exists in the database.
 * - Ensures the new email is not already taken by another user.
 * - Decrypts and hashes the new password before saving.
 * - Updates the user's information in the database.
 * - Returns appropriate success or error responses.
 */
const updateUser = asyncHandler(
    async (req: Request<object, object, UserRequestBody>, res: Response): Promise<void> => {
        const { userId, username, email, password } = req.body

        if (!userId || !username || !email || !password) {
            responseHandler(res, 400, RESPONSE_MESSAGES.INVALID_PARAMETER)
            return
        }

        const userExist: IUser | null = await checkById(UserModel, userId)
        if (!userExist) {
            responseHandler(res, 400, RESPONSE_MESSAGES.INVALID_USER)
            return
        }

        const duplicate: IUser | null = await findOneByFields(UserModel, { email })
        if (duplicate && duplicate._id.toString() !== userId) {
            responseHandler(res, 409, RESPONSE_MESSAGES.USER_ALREADY_EXIST)
            return
        }

        const decryptedPassword = AES.decrypt(password, process.env.SECRET_KEY!).toString(enc.Utf8)
        const hashedPassword = await hash(decryptedPassword, 10)

        const userUpdated: IUser | null = await actionCreateOrUpdateUser(
            userId,
            username,
            email,
            hashedPassword
        )

        if (userUpdated) {
            responseHandler(res, 200, RESPONSE_MESSAGES.SUCCESSFUL_UPDATED, {
                userId: userUpdated._id.toString(),
            })
        } else {
            responseHandler(res, 500, RESPONSE_MESSAGES.BAD_REQUEST)
        }
    }
)
export { login, logout, refresh, getCurrentUser, createNewUser, updateUser }
