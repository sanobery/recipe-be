/**
 * User Model
 * ----------
 * Defines the schema for storing user account information.
 * Includes fields for username, email, password, and optional profile data.
 *
 * Usage:
 * - Used for authentication, authorization, and user-specific operations
 * - Supports password hashing and token generation
 *
 * Notes:
 * - Passwords should be hashed before saving
 * - Email should be unique and validated
 * - Consider adding roles or permissions for advanced access control
 */
import { Schema, model, Document } from 'mongoose'
import { Types } from 'mongoose'

export interface IUser extends Document {
    _id: Types.ObjectId
    username: string
    email: string
    password: string
    // add other fields as needed
}
// 2️⃣ Define the schema
const userSchema = new Schema<IUser>(
    {
        _id: {
            type: Schema.Types.ObjectId,
            auto: true,
        },
        username: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
        },
        password: {
            type: String,
            required: true,
        },
    },
    {
        timestamps: true, // optional: adds createdAt and updatedAt
    }
)

// 3️⃣ Create and export the model
const UserModel = model<IUser>('users', userSchema)

export default UserModel
