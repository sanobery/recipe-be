const mongoose = require('mongoose')

const rateSchema = new mongoose.Schema({
    recipeId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "recipe"
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
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

const rateComment = new mongoose.model('recipe_comments', rateSchema)

module.exports = rateComment