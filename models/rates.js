import { Schema, model } from 'mongoose'

const rateSchema = new Schema({
    recipeId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: "recipe"
    },
    userId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: "users"
    },
    rate: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
})

const rateComment = new model('recipe_rates', rateSchema)

export default rateComment