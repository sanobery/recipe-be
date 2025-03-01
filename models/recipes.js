const mongoose = require('mongoose')

const receipeSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
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

const recipe = new mongoose.model('recipe', receipeSchema)

module.exports = recipe;
