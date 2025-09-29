/**
 * Rate Model
 * ----------
 * Defines the schema for storing user ratings on recipes.
 * Includes fields for rating value, user reference, and recipe reference.
 *
 * Usage:
 * - Used to calculate average ratings for recipes
 * - Prevents duplicate ratings from the same user
 *
 * Notes:
 * - Rating value should be a number (e.g., 1–5)
 * - Consider enforcing one rating per user per recipe
 * - Useful for sorting or recommending top-rated recipes
 */

import { Schema, model, Document, Types } from 'mongoose'
import './users'
import './recipes'

// Define the interface for a Rate document
export interface IRate extends Document {
    recipeId: Types.ObjectId
    userId: Types.ObjectId
    rate: number
    createdAt: Date
}

// Create the schema
const rateSchema = new Schema<IRate>({
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
    rate: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
        index: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
})

// Compound unique index to ensure one user can rate a recipe only once
rateSchema.index({ recipeId: 1, userId: 1 }, { unique: true })

// Create and export the model
const RateModel = model<IRate>('recipe_rates', rateSchema)

export default RateModel
