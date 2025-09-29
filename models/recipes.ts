/**
 * Recipe Model
 * ------------
 * Defines the schema for storing recipe data in MongoDB.
 * Includes fields for title, ingredients, steps, image, preparation time, and user reference.
 *
 * Usage:
 * - Used to create, read recipe documents
 * - Supports population of user details for display
 *
 * Notes:
 * - Ingredients and steps are stored as arrays of strings
 * - Image field stores the filename or path of the uploaded image
 * - preparationTime is stored as a number (in minutes)
 */
import { Schema, model, Document, Types } from 'mongoose'
import './users'
// Define the TypeScript interface for the recipe document
export interface IRecipe extends Document {
    _id: Types.ObjectId
    userId: Types.ObjectId
    title: string
    ingredients: string[]
    steps: string[]
    image?: string
    preparationTime: number
    createdAt?: Date
}

// Define the schema
const recipeSchema = new Schema<IRecipe>({
    userId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'users',
    },
    title: {
        type: String,
        required: true,
    },
    ingredients: {
        type: [String],
        required: true,
        index: true,
    },
    steps: {
        type: [String],
        required: true,
    },
    image: {
        type: String,
        default: '',
    },
    preparationTime: {
        type: Number,
        required: true,
        index: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
})

// Create and export the model
const RecipeModel = model<IRecipe>('recipe', recipeSchema)
export default RecipeModel
