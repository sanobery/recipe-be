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

const rateComment = new mongoose.model('recipe_rates', rateSchema)

module.exports = rateComment