/**
 * Comment Model
 * -------------
 * Defines the schema for storing comments on recipes.
 * Includes fields for content, user reference, and recipe reference.
 *
 * Usage:
 * - Used to attach user-generated comments to specific recipes
 * - Supports population of user and recipe data
 *
 * Notes:
 * - Each comment is linked to a single recipe and user
 * - Timestamps are enabled for tracking creation and updates
 */
import { Schema, model } from 'mongoose'
import './users'
import './recipes'
import { IComment } from '../types/rateCommentInterface'

// Create the schema
const commentSchema = new Schema<IComment>({
    recipeId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'recipe',
        index: true,
    },
    userId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'users',
        index: true,
    },
    comment: {
        type: String,
        default: null,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
})

// Create and export the model
const CommentModel = model<IComment>('recipe_comments', commentSchema)

export default CommentModel
