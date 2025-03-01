const User = require('../models/users')
const asyncHandler = require('express-async-handler')
const bcrypt = require('bcrypt')
const CryptoJS = require("crypto-js");

const SECRET_KEY = process.env.SECRET_KEY;

//get request
const getAllUsers = asyncHandler(async (req, res) => {
    const users = await User.find().select('-password').lean()
    if (!users?.length) {
        return res.status(400).json({ message: 'No User Found' })
    }
    res.json(users)
})

//post request
// const createNewUser = asyncHandler(async (req, res) => {
//     const { username, email, password } = req.body

//     if (!username || !email || !password) {
//         return res.status(400).json({ message: 'All are required fields.' })
//     }

//     const userExist = await User.findOne({ email: email }).lean()

//     if (userExist) {
//         return res.status(400).json({ message: 'User already exist!' })
//     }
//     const decryptedPassword = CryptoJS.AES.decrypt(password, SECRET_KEY).toString(CryptoJS.enc.Utf8);

//     const hashPassword = await bcrypt.hash(decryptedPassword, 10)
//     const userCreated = await User.create({ username, email, password: hashPassword });

//     if (userCreated) {
//         return res.status(200).json({ message: 'Sign-up successful! Redirected to login-Page in 2 seconds...', user: userCreated })
//     }
//     else {
//         return res.status(409).json({ message: 'Invalid user details!' })
//     }
// })

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


//update user Patch req
const updateUser = asyncHandler(async (req, res) => {
    const { userid, username, email, password } = req.body

    if (!userid || !username || !email || !password) {
        return res.status(400).json({ message: 'All are required fields.' })
    }

    const userExist = await User.findById({ userid }).lean()

    if (!userExist) {
        return res.status(400).json({ message: 'Invalid User!' });
    }

    const duplicate = await User.findOne({ email: email }).lean()

    if (duplicate && duplicate?._id.toString() !== userid) {
        return res.status(409).json({ message: 'Duplicate email!' })
    }

    User.username = username
    User.email = email
    const hashPassword = await bcrypt.hash(password, 10)
    User.password = hashPassword
    const userUpdated = await User.save()

    if (userUpdated) {
        return res.status(200).json({ message: userUpdated, userId: userUpdated._id.toString() });
    }
    else {
        return res.status(409).json({ message: 'Invalid user details!' })
    }

})

//delete user Delete req
const deleteUser = asyncHandler(async (req, res) => {
    const { userId } = req.body

    if (!userId) {
        return res.status(400).json({ message: 'UserId is required fields.' })
    }

    // const receipe = await receipe.findOne({ userId }).lean()
    // if (receipe?.length) {
    //     return res.status(400).json({ message: 'User had added a Recipe' })
    // }

    const user = await User.findOne({ userId }).lean()
    if (!user) {
        return res.status(400).json({ message: 'User not Found' })
    }
    const deletedUser = await User.deleteOne()

    const reply = `Username ${deletedUser.username} deleted`
    return res.status(200).json({ message: reply })
})


const checkUser = asyncHandler(async (req, res) => {
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

    return res.status(200).json({ message: "Login successful" });
})

module.exports = { getAllUsers, createNewUser, updateUser, deleteUser, checkUser }