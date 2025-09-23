import User from '../models/users.js'
import asyncHandler from 'express-async-handler'
import { updateData } from './dbRepository.js'

const checkUserEmail = asyncHandler(async (email) => {
    const user = await User.findOne({ email })

    return user
})

const checkUserById = asyncHandler(async (id) => {
    const userExist = await User.findById({ _id: id }).lean()

    return userExist
})

const actionCreateOrUpdateUser = asyncHandler(async (userId, username, email, password) => {
    let user
    if (userId) {
        user = await updateData(User, userId, { username, email, password })
    } else user = await User.create({ username, email, password: password })

    return user
})

export { checkUserEmail, checkUserById, actionCreateOrUpdateUser }
