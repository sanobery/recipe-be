import { updateData } from './dbRepository'
import UserModel, { IUser } from '../models/users' // adjust path

const actionCreateOrUpdateUser = async (
    userId: string | null,
    username: string,
    email: string,
    password: string
): Promise<IUser | null> => {
    let user: IUser | null

    if (userId) {
        user = await updateData(UserModel, userId, { username, email, password })
    } else {
        user = await UserModel.create({ username, email, password })
    }

    return user
}

export { actionCreateOrUpdateUser }
