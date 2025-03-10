import Rate from '../models/rates.js'
import asyncHandler from 'express-async-handler'
import User from '../models/users.js'
import Recipe from '../models/recipes.js'
import Comment from '../models/comments.js'

/**
 * Allows a user to rate or comment on a recipe.
 * - Users cannot rate their own recipes.
 * - Ensures ratings are between 1 and 5 and prevents duplicate ratings.
 */
const rateOrCommentRecipe = asyncHandler(async (req, res) => {
    const { recipeId, userId, rate, comment } = req.body

    if (!recipeId || !userId || (!rate && !comment)) {
        return res.status(400).json({ message: "Recipe ID, User ID, and either Rate or Comment are required." })
    }

    if (rate !== undefined && (rate < 1 || rate > 5)) {
        return res.status(400).json({ message: "Rate must be between 1 and 5." })
    }

    const user = await User.findById(userId)
    if (!user) {
        return res.status(400).json({ error: "Invalid user ID" })
    }

    const recipeExists = await Recipe.findById(recipeId)
    if (!recipeExists) {
        return res.status(404).json({ message: "Recipe not found." })
    }

    let responseMessage = ""

    if (rate !== undefined) {
        if (recipeExists.userId.toString() === userId) {
            return res.status(404).json({ message: "You cannot rate your own recipe." })
        }

        const existingRating = await Rate.findOne({ recipeId, userId })
        if (existingRating) {
            return res.status(400).json({ message: "User has already rated this recipe." })
        }

        const newRating = new Rate({
            recipeId,
            userId,
            rate,
        })

        await newRating.save()
        responseMessage += "Rating added successfully. "
    }

    if (comment !== undefined) {
        const newComment = new Comment({
            recipeId,
            userId,
            comment,
        })

        await newComment.save()
        responseMessage += "Comment added successfully."
    }

    return res.status(200).json({ message: responseMessage })
})

/**
 * Retrieves recipes based on a specific rating or preparation time.
 * - Filters recipes based on the query parameters.
 * - Calls appropriate helper functions for fetching filtered recipes.
 */
const getRecipesWithSpecificRate = asyncHandler(async (req, res) => {
    const { rating, preparationtime } = req.query
    let recipeData = []

    if (rating) {
        recipeData = await getRecipesByRate(rating)
    }

    if (preparationtime) {
        recipeData = await getRecipesByPreparationTime(preparationtime)
    }

    return res.status(recipeData.status).json(recipeData)
})

/**
 * Fetches recipes that have a specific average rating.
 * - Uses aggregation to calculate the average rating per recipe.
 * - Filters recipes based on the provided rating value.
 */
const getRecipesByRate = async (rating) => {
    if (!rating) {
        return { status: 400, message: "Query parameter is required." }
    }

    const specificRate = Number(rating)
    if (isNaN(specificRate) || specificRate < 1 || specificRate > 5) {
        return { status: 400, message: "Invalid rating. It must be between 1 and 5." }
    }

    const avgRatings = await Rate.aggregate([
        {
            $group: {
                _id: "$recipeId",
                avgRating: { $avg: "$rate" }
            }
        },
        {
            $addFields: { avgRatingCeil: { $ceil: "$avgRating" } }
        },
        {
            $match: { avgRatingCeil: specificRate }
        }
    ])

    if (avgRatings.length === 0) {
        return { status: 404, message: "No recipes found with the given average rating." }
    }

    const recipeIds = avgRatings.map(r => r._id)

    const recipes = await Recipe.find({ _id: { $in: recipeIds } })
        .populate('userId', 'username')
        .lean()

    const result = recipes.map(recipe => {
        const ratingData = avgRatings.find(r => r._id.toString() === recipe._id.toString())
        return {
            ...recipe,
            userId: { _id: recipe.userId._id, username: recipe.userId.username },
            averageRating: ratingData ? ratingData.avgRating : 0
        }
    })

    return { status: 200, recipes: result, total: result.length }
}

/**
 * Fetches recipes based on a given preparation time range.
 * - Validates that preparation time is numeric.
 * - Returns recipes within the specified time range.
 */
const getRecipesByPreparationTime = async (preparationTime) => {

    if (!preparationTime) {
        return { status: 400, message: "Query parameter is required." }
    }

    const [minTime, maxTime] = preparationTime.split("-").map(Number)

    if (isNaN(minTime) || isNaN(maxTime)) {
        return { status: 400, message: "Preparation time should be numeric." }
    }

    const recipes = await Recipe.find({ preparationTime: { $gte: minTime, $lte: maxTime } }).populate('userId', 'username').lean()

    const avgRatings = await Rate.aggregate([
        {
            $group: {
                _id: "$recipeId",
                avgRating: { $avg: "$rate" }
            }
        }
    ])

    if (avgRatings.length === 0) {
        return { status: 404, message: "No recipes found with the given average rating." }
    }

    const result = recipes.map(recipe => {
        const ratingData = avgRatings.find(r => r._id.toString() === recipe._id.toString())
        return {
            ...recipe,
            userId: { _id: recipe.userId._id, username: recipe.userId.username },
            averageRating: ratingData ? ratingData.avgRating : 0
        }
    })

    return { status: 200, recipes: result, total: result.length }
}

export { rateOrCommentRecipe, getRecipesWithSpecificRate }
