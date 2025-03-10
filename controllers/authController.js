
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
import CryptoJS from "crypto-js"
const { AES, enc } = CryptoJS
import jwt from 'jsonwebtoken'
const { sign, verify } = jwt
import User from '../models/users.js'

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
        return res.status(400).json({ message: 'All are required fields.' })
    }

    const user = await User.findOne({ email })
    if (!user) return res.status(401).json({ message: "Invalid user! Please Sign-Up" })

    const decryptedPassword = AES.decrypt(password, SECRET_KEY).toString(enc.Utf8)

    const isMatch = await compare(decryptedPassword, user.password)

    if (!isMatch) return res.status(401).json({ message: "Invalid email or password" })

    const accessToken = sign({
        "userinfo": {
            "userId": user._id
        },
    },
        process.env.ACCESS_SECRET_KEY,
        { expiresIn: '10m' }
    )

    const refreshToken = sign({
        "userinfo": {
            "userId": user._id
        },
    },
        process.env.REFRESH_SECRET_KEY,
        { expiresIn: '1d' }
    )

    res.cookie('jwt', refreshToken, {
        httpOnly: true,
        // secure: true,
        sameSite: 'Lax',
        maxAge: 24 * 60 * 60 * 1000
    })

    res.json({ message: "Login successful! Closing in 1 seconds...", accessToken })
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

    if (!cookies?.jwt) return res.status(401).json({ message: 'Unauthorized user' })

    const refreshToken = cookies.jwt

    verify(refreshToken, process.env.REFRESH_SECRET_KEY, (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: 'Forbidden: Invalid token' })
        }

        const user = { userinfo: { userId: decoded?.userinfo?.user?._id } }

        const newAccessToken = sign(user, process.env.ACCESS_SECRET_KEY, { expiresIn: '10m' })

        res.json({ accessToken: newAccessToken })
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

    if (!cookies?.jwt) return res.status(401).json({ message: 'Unauthorized user' })

    const refreshToken = cookies.jwt
    verify(refreshToken, process.env.REFRESH_SECRET_KEY, async (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: 'Forbidden: Invalid token' })
        }

        const userId = decoded.userinfo.userId

        if (!userId) {
            return res.status(400).json({ message: 'UserId is required Field.' })
        }

        const userExist = await User.findById({ _id: userId }).lean()

        if (!userExist) {
            return res.status(400).json({ message: 'Invalid User!' })
        }

        return res.status(200).json({ userExist })
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
    if (!cookies?.jwt) return res.status(204).json({ message: 'Error' })

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
        errors.push("Username must be at least 4 characters long.")
    }
    const decryptedPassword = AES.decrypt(password, SECRET_KEY).toString(enc.Utf8)

    if (!password) {
        errors.push("Password is required.")
    } else {

        if (decryptedPassword.length < 8 || decryptedPassword.length > 16) {
            errors.push("Password must be between 8 to 16 characters long.")
        }
        if (!/[A-Z]/.test(decryptedPassword)) {
            errors.push("Password must include at least one uppercase letter.")
        }
        if (!/[a-z]/.test(decryptedPassword)) {
            errors.push("Password must include at least one lowercase letter.")
        }
        if (!/\d/.test(decryptedPassword)) {
            errors.push("Password must include at least one number.")
        }
        if (!/[@$!%*?&]/.test(decryptedPassword)) {
            errors.push("Password must include at least one special character (@$!%*?&).")
        }
    }

    if (errors.length > 0) {
        return res.status(400).json({ message: errors.join(" ") })
    }

    const userExist = await User.findOne({ email: email }).lean()
    if (userExist) {
        return res.status(400).json({ message: "User already exists!" })
    }

    const hashPassword = await hash(decryptedPassword, 10)
    const userCreated = await User.create({ username, email, password: hashPassword })

    if (userCreated) {
        return res.status(200).json({
            message: "Sign-up successful! Redirecting to login page in 2 seconds...",
            user: userCreated
        })
    } else {
        return res.status(409).json({ message: "Invalid user details!" })
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
        return res.status(400).json({ message: 'All fields are required.' })
    }

    const userExist = await User.findById(userId).lean()

    if (!userExist) {
        return res.status(400).json({ message: 'Invalid User!' })
    }

    const duplicate = await User.findOne({ email }).lean()
    if (duplicate && duplicate._id.toString() !== userId) {
        return res.status(409).json({ message: 'Duplicate email!' })
    }

    const decryptedPassword = AES.decrypt(password, SECRET_KEY).toString(enc.Utf8)

    const hashedPassword = await hash(decryptedPassword, 10)

    const userUpdated = await User.findByIdAndUpdate(
        userId,
        { username, email, password: hashedPassword },
        { new: true }
    )

    if (userUpdated) {
        return res.status(200).json({ message: 'User updated successfully!', userId: userUpdated._id.toString() })
    } else {
        return res.status(500).json({ message: 'Failed to update user!' })
    }
})


export { login, logout, refresh, getCurrentUser, createNewUser, updateUser }