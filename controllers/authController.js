const User = require('../models/users')
const asyncHandler = require('express-async-handler')
const bcrypt = require('bcrypt')
const CryptoJS = require("crypto-js");
const jsonWebToken = require('jsonwebtoken')

const SECRET_KEY = process.env.SECRET_KEY;


const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body
    if (!email || !password) {
        return res.status(400).json({ message: 'All are required fields.' })
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid user! Please Sign-Up" });

    // Decrypt the password
    const decryptedPassword = CryptoJS.AES.decrypt(password, SECRET_KEY).toString(CryptoJS.enc.Utf8);

    // Compare decrypted password with hashed password from DB
    const isMatch = await bcrypt.compare(decryptedPassword, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid email or password" });

    const accessToken = jsonWebToken.sign({
        "userinfo": {
            "userId": user._id
        },
    },
        process.env.ACCESS_SECRET_KEY,
        { expiresIn: '1d' }
    )

    const refreshToken = jsonWebToken.sign({
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

const refresh = (req, res) => {
    const cookies = req.cookies

    if (!cookies?.jwt) return res.status(401).json({ message: 'Unauthorized user' })

    const refreshToken = cookies.jwt
    jsonWebToken.verify(refreshToken, process.env.REFRESH_SECRET_KEY, (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: 'Forbidden: Invalid token' });
        }

        // Extract user info from decoded token
        const user = { userinfo: { userId: decoded?.userinfo?.user?._id } };

        // Generate a new access token
        const newAccessToken = jsonWebToken.sign(user, process.env.ACCESS_SECRET_KEY, { expiresIn: '15m' });

        res.json({ accessToken: newAccessToken });
    });
}

const getCurrentUser = (req, res) => {
    const cookies = req.cookies

    if (!cookies?.jwt) return res.status(401).json({ message: 'Unauthorized user' })

    const refreshToken = cookies.jwt
    jsonWebToken.verify(refreshToken, process.env.REFRESH_SECRET_KEY, async (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: 'Forbidden: Invalid token' });
        }

        // Extract user info from decoded token
        const userId = decoded.userinfo.userId

        if (!userId) {
            return res.status(400).json({ message: 'UserId is required Field.' })
        }

        const userExist = await User.findOne({ userId }).lean()

        if (!userExist) {
            return res.status(400).json({ message: 'Invalid User!' });
        }

        return res.status(200).json({ userExist });
    });
}

const logout = (req, res) => {
    const cookies = req.cookies

    if (!cookies?.jwt) return res.status(204)

    res.clearCookie('jwt', {
        httpOnly: true,
        // secure: true,
        sameSite: 'lax',
    }).json({ message: 'Logout successfully' })

}

module.exports = { login, refresh, logout, getCurrentUser }