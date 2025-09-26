import { Schema, model } from 'mongoose'

const rateSchema = new Schema({
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

const rateComment = new model('recipe_rates', rateSchema)

export default rateComment
