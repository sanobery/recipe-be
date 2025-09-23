import Recipe from '../models/recipes.js'
import asyncHandler from 'express-async-handler'
import User from '../models/users.js'
import Rate from '../models/rates.js'
import Comment from '../models/comments.js'
import {
    actionGetAllRecipe,
    actionGetRecipeByUser,
    actionRecipeCount,
    actionCreateNewRecipe,
} from '../repositories/recipeRepository.js'
import logger from '../middleware/logger.js'
import redisClient from '../config/redisCache.js'
import { responseHandler } from '../utils/responseHandler.js'
import { RESPONSE_MESSAGES } from '../utils/constants.js'
import { checkUserById } from '../repositories/authRepository.js'
import { updateData } from '../repositories/dbRepository.js'

/**Retrieves all recipes with pagination, sorted by creation date.
 * Also calculates the average rating for each recipe.
 */
const getAllRecipe = asyncHandler(async (req, res) => {
    const pageNumber = parseInt(req.query.page) || 1
    const limitNumber = parseInt(req.query.limit) || 4

    if (isNaN(pageNumber) || isNaN(limitNumber)) {
        logger.warn(RESPONSE_MESSAGES.INVALID_PARAMETER)
        return responseHandler(res, 400, RESPONSE_MESSAGES.INVALID_PARAMETER)
    }

    const cacheKey = `recipes:page:${pageNumber}:limit:${limitNumber}`

    // Check if data is already cached in Redis
    const cachedData = await redisClient.get(cacheKey)
    if (cachedData) {
        logger.info(`Cache hit for ${cacheKey}`)
        return responseHandler(res, 200, RESPONSE_MESSAGES.RECIPE_FOUND, JSON.parse(cachedData))
    }

    // If no cache, fetch from database
    const getRecipeDetails = await actionGetAllRecipe(pageNumber, limitNumber)

    if (!getRecipeDetails || !getRecipeDetails?.recipes?.length) {
        logger.error(RESPONSE_MESSAGES.RECIPE_NOT_FOUND)
        return responseHandler(res, 404, RESPONSE_MESSAGES.RECIPE_NOT_FOUND)
    }

    // Store the fetched data in Redis with expiration (e.g., 10 minutes)
    await redisClient.set(cacheKey, JSON.stringify(getRecipeDetails), 'EX', 600)

    logger.info(RESPONSE_MESSAGES.RECIPE_FOUND + `${getRecipeDetails.recipes.length} recipes`)
    return responseHandler(res, 200, RESPONSE_MESSAGES.RECIPE_FOUND, getRecipeDetails)
})

/**Creates a new recipe entry with the given details.
 * Ensures that all required fields are provided before saving.
 */
const createNewRecipe = asyncHandler(async (req, res) => {
    const { userId, title } = req.body
    console.log(req.body.ingredients, 55)
    const ingredients = JSON.parse(req.body?.ingredients)
    const steps = JSON.parse(req.body?.steps)
    const preparationTime = JSON.parse(req.body?.preparationTime)
    const imageFile = req.file
    const imageName = imageFile ? imageFile.filename : null
    const cleanUserId = userId.replace(/^"|"$/g, '').trim()

    if (!userId || !title || !ingredients || !steps || !imageName) {
        return responseHandler(res, 400, RESPONSE_MESSAGES.INVALID_PARAMETER)
    }

    const user = await checkUserById(cleanUserId)
    if (!user) {
        return responseHandler(res, 400, RESPONSE_MESSAGES.INVALID_USER_ID)
    }

    const recipeData = {
        userId,
        title,
        ingredients,
        steps,
        image,
        preparationTime,
    }

    const savedRecipe = await actionCreateNewRecipe(recipeData)

    const totalRecipes = await actionRecipeCount()

    return responseHandler(res, 200, RESPONSE_MESSAGES.RECIPE_CREATED, {
        total: totalRecipes,
        recipe: {
            ...savedRecipe.toObject(),
            userId: { _id: user._id, username: user.username },
            averageRating: 0,
        },
    })
})

/**Updates an existing recipe with new details.
 * Allows updating specific fields while keeping others unchanged.
 */
const updateRecipe = asyncHandler(async (req, res) => {
    const { userId, recipeId, title, ingredients, steps, preparationTime } = req.body

    if (!userId || !recipeId) {
        return responseHandler(res, 400, RESPONSE_MESSAGES.INVALID_PARAMETER)
    }

    const user = await checkUserById(userId)
    if (!user) {
        return responseHandler(res, 400, RESPONSE_MESSAGES.INVALID_USER_ID)
    }

    let updateFields = {}
    if (title !== undefined) updateFields.title = title
    if (ingredients !== undefined) updateFields.ingredients = JSON.parse(ingredients)
    if (steps !== undefined) updateFields.steps = JSON.parse(steps)
    if (preparationTime !== undefined) updateFields.preparationTime = JSON.parse(preparationTime)

    if (req.file) {
        updateFields.image = req.file.filename
    }
    const updatedRecipe = await updateData(Recipe, recipeId, updateFields)

    if (!updatedRecipe) {
        return responseHandler(res, 404, RESPONSE_MESSAGES.RECIPE_NOT_FOUND)
    }

    return responseHandler(res, 200, 'Recipe updated successfully', { recipe: updatedRecipe })
})

/**Fetches a single recipe by its ID.
 * Includes comments and ratings along with user details.
 */
const getRecipeById = asyncHandler(async (req, res) => {
    const { id } = req.params

    if (!id) {
        return responseHandler(res, 400, RESPONSE_MESSAGES.INVALID_PARAMETER)
    }

    const recipe = await Recipe.findById(id).populate('userId', 'username').lean()

    if (!recipe) {
        return responseHandler(res, 404, RESPONSE_MESSAGES.RECIPE_NOT_FOUND)
    }
    const comments = await Comment.find({ recipeId: id }).populate('userId', 'username').lean()

    const ratings = await Rate.find({ recipeId: id }).populate('userId', 'username').lean()

    const averageRating =
        ratings.length > 0 ? ratings.reduce((sum, r) => sum + r.rate, 0) / ratings.length : 0

    return responseHandler(res, 200, RESPONSE_MESSAGES.RECIPE_FOUND, {
        ...recipe,
        averageRating: Math.ceil(averageRating),
        ratings,
        comments,
    })
})

/**
 * Retrieves all recipes created by a specific user.
 * Returns an error message if no recipes are found.
 */
const getRecipeByUser = asyncHandler(async (req, res) => {
    const { userId } = req.body
    if (!userId) {
        return responseHandler(res, 400, RESPONSE_MESSAGES.INVALID_USER_ID)
    }

    const recipe = await actionGetRecipeByUser(userId)
    return responseHandler(res, 200, RESPONSE_MESSAGES.RECIPE_FOUND, recipe)
})

/**Deletes a recipe by user ID.
 * Ensures the recipe exists before deletion.
 */
// const deleteRecipe = asyncHandler(async (req, res) => {
//     const { userId } = req.body

//     if (!userId) {
//         return responseHandler(res)
//         return res.status(400).json({ message: 'RecipeId is required fields.' })
//     }

//     const user = await Recipe.findOne({ userId }).lean()
//     if (!user) {
//         return responseHandler(res)
//         return res.status(400).json({ message: 'Recipe not Found' })
//     }
//     const deletedRecipe = await Recipe.deleteOne()

//     const reply = `Recipename ${deletedRecipe.username} deleted`
//     return responseHandler(res)
//     return res.status(200).json({ message: reply })
// })

/**Searches for recipes containing a specific ingredient.
 * Returns matching recipes along with their ratings.
 */
const getRecipeByIngredient = asyncHandler(async (req, res) => {
    const { ingredient } = req.body

    const totalRecipes = await Recipe.countDocuments({
        ingredients: { $regex: new RegExp(ingredient, 'i') },
    })
    if (!ingredient) {
        return responseHandler(res, 400, RESPONSE_MESSAGES.INVALID_PARAMETER)
    }
    const recipes = await Recipe.find({ ingredients: { $regex: new RegExp(ingredient, 'i') } })
        .populate('userId', 'username')
        .lean()

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

    if (!recipes || recipes.length === 0) {
        return responseHandler(res, 409, RESPONSE_MESSAGES.RECIPE_NOT_FOUND)
    } else {
        return responseHandler(res, 200, RESPONSE_MESSAGES.RECIPE_FOUND, {
            recipes: formattedRecipes,
            total: totalRecipes,
        })
    }
})

export {
    getAllRecipe,
    createNewRecipe,
    updateRecipe,
    getRecipeById,
    getRecipeByUser,
    getRecipeByIngredient,
}
