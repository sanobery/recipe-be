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

        const userExist = await User.findById({ _id: userId }).lean()

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

const createNewUser = asyncHandler(async (req, res) => {
    const { username, email, password } = req.body;
    const errors = [];

    // Username validation (at least 4 characters)
    if (!username || username.length < 4) {
        errors.push("Username must be at least 4 characters long.");
    }
    const decryptedPassword = CryptoJS.AES.decrypt(password, SECRET_KEY).toString(CryptoJS.enc.Utf8);

    // Password validation (8-16 characters, uppercase, lowercase, number, special char)
    if (!password) {
        errors.push("Password is required.");
    } else {

        if (decryptedPassword.length < 8 || decryptedPassword.length > 16) {
            errors.push("Password must be between 8 to 16 characters long.");
        }
        if (!/[A-Z]/.test(decryptedPassword)) {
            errors.push("Password must include at least one uppercase letter.");
        }
        if (!/[a-z]/.test(decryptedPassword)) {
            errors.push("Password must include at least one lowercase letter.");
        }
        if (!/\d/.test(decryptedPassword)) {
            errors.push("Password must include at least one number.");
        }
        if (!/[@$!%*?&]/.test(decryptedPassword)) {
            errors.push("Password must include at least one special character (@$!%*?&).");
        }
    }

    // If there are validation errors, return them
    if (errors.length > 0) {
        return res.status(400).json({ message: errors.join(" ") });
    }

    // Check if user already exists
    const userExist = await User.findOne({ email: email }).lean();
    if (userExist) {
        return res.status(400).json({ message: "User already exists!" });
    }

    // Hash password before storing
    const hashPassword = await bcrypt.hash(decryptedPassword, 10);
    const userCreated = await User.create({ username, email, password: hashPassword });

    if (userCreated) {
        return res.status(200).json({
            message: "Sign-up successful! Redirecting to login page in 2 seconds...",
            user: userCreated
        });
    } else {
        return res.status(409).json({ message: "Invalid user details!" });
    }
});

const updateUser = asyncHandler(async (req, res) => {
    const { userId, username, email, password } = req.body;

    if (!userId || !username || !email || !password) {
        return res.status(400).json({ message: 'All fields are required.' });
    }

    const userExist = await User.findById(userId).lean(); // Fetch user

    if (!userExist) {
        return res.status(400).json({ message: 'Invalid User!' });
    }

    const duplicate = await User.findOne({ email }).lean(); // Check for duplicate email
    if (duplicate && duplicate._id.toString() !== userId) {
        return res.status(409).json({ message: 'Duplicate email!' });
    }

    // Hash the new password
    const decryptedPassword = CryptoJS.AES.decrypt(password, SECRET_KEY).toString(CryptoJS.enc.Utf8);

    const hashedPassword = await bcrypt.hash(decryptedPassword, 10);

    // Update user using findByIdAndUpdate
    const userUpdated = await User.findByIdAndUpdate(
        userId,
        { username, email, password: hashedPassword },
        { new: true }
    );

    if (userUpdated) {
        return res.status(200).json({ message: 'User updated successfully!', userId: userUpdated._id.toString() });
    } else {
        return res.status(500).json({ message: 'Failed to update user!' });
    }
});


module.exports = { login, refresh, logout, getCurrentUser, createNewUser, updateUser }