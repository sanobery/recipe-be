import User from "../models/users.js"
import asyncHandler from 'express-async-handler'

const checkEmail = asyncHandler(async (email) => {
    const user = await User.findOne({ email })
    return user
})

export { checkEmail }