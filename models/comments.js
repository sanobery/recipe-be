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
    comment: {
        type: String,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
})

const rateComment = new model('recipe_comments', rateSchema)

export default rateComment