import Recipe from '../models/recipes.js'
import asyncHandler from 'express-async-handler'
import Rate from '../models/rates.js'
import redisClient from '../config/redisCache.js'

const actionGetAllRecipe = asyncHandler(async (pageNumber, limitNumber) => {
    const totalRecipes = await Recipe.countDocuments()

    const recipes = await Recipe.find()
        .sort({ createdAt: -1 })
        .skip((pageNumber - 1) * limitNumber)
        .limit(limitNumber)
        .populate('userId', 'username')
        .lean()

    if (!recipes?.length) {
        return { status: 400, message: 'No Recipe Found' }
    }

    const recipeIds = recipes.map((recipe) => recipe._id)

    const ratingsData = await Rate.aggregate([
        { $match: { recipeId: { $in: recipeIds } } },
        {
            $group: {
                _id: '$recipeId',
                averageRating: { $avg: '$rate' },
            },
        },
    ])

    const ratingsMap = {}
    ratingsData.forEach((rating) => {
        ratingsMap[rating._id.toString()] = rating.averageRating.toFixed(1)
    })

    const formattedRecipes = recipes.map((recipe) => ({
        ...recipe,
        userId: { _id: recipe.userId._id, username: recipe.userId.username },
        averageRating: parseFloat(ratingsMap[recipe._id.toString()] || 0),
    }))

    return { recipes: formattedRecipes, total: totalRecipes }
})

const actionGetRecipeByUser = asyncHandler(async (userId) => {
    const cacheKey = `recipes:${userId}`
    const cachedData = await redisClient.get(cacheKey)

    if (cachedData) {
        return JSON.parse(cachedData)
    }
    const recipe = await Recipe.find({ userId: userId })

    if (!recipe || recipe.length === 0) {
        return { status: 409, message: 'No recipe!' }
    } else {
        await redisClient.set(cacheKey, JSON.stringify({ recipe }), 'EX', 600)
        return { status: 200, recipe }
    }
})

export { actionGetAllRecipe, actionGetRecipeByUser }
