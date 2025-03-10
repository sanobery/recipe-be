import { Schema, model } from 'mongoose'

const receipeSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: "users"
    },
    title: {
        type: String,
        required: true
    },
    ingredients: {
        type: [String],
        required: true
    },
    steps: {
        type: [String],
        required: true
    },
    image: {
        type: String,
        default: ""
    },
    preparationTime: {
        type: Number,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
})

const recipe = new model('recipe', receipeSchema)

export default recipe
