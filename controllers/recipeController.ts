/**
 * Controller class containing all the Rate/Comment functionalities.
 *
 * @since 1.0
 */

import RecipeModel from '../models/recipes'
import asyncHandler from 'express-async-handler'
import RateModel from '../models/rates'
import CommentModel from '../models/comments'
import {
    actionGetAllRecipe,
    actionGetRecipeByUser,
    actionCreateNewRecipe,
    actionRecipeCount,
} from '../repositories/recipeRepository'
import { Request, Response, RequestHandler } from 'express'
import logger from '../middleware/logger'
import redisClient from '../config/redisCache'
import { responseHandler, buildRatingsMap } from '../utils/responseHandler'
import { RESPONSE_MESSAGES } from '../utils/constants'
import UserModel, { IUser } from '../models/users'
import { updateData } from '../repositories/dbRepository'
import { Types } from 'mongoose'
import { CreateRecipeRequest } from '../types/recipeInterface'
import { ProfileRequestBody } from '../types/userInterface'
import { checkById } from '../repositories/dbRepository'
import { fetchRecipes } from '../repositories/recipeRepository'
import { fetchRecipeRelatedData, filterRate } from '../repositories/rateCommentRepository'
import { FormattedRecipe } from '../types/recipeInterface'
import { formatRecipes } from '../utils/responseHandler'
import { getMessage } from '../utils/constants'

/**Retrieves all recipes with pagination, sorted by creation date.
 * Also calculates the average rating for each recipe.
 */
const getAllRecipes = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const pageNumber: number = parseInt(req.query.page as string) || 1
    const limitNumber: number = parseInt(req.query.limit as string) || 4

    if (isNaN(pageNumber) || isNaN(limitNumber)) {
        logger.warn(RESPONSE_MESSAGES.INVALID_PARAMETER)
        responseHandler(res, 400, RESPONSE_MESSAGES.INVALID_PARAMETER)
        return
    }

    const cacheKey = `recipes:page:${pageNumber}:limit:${limitNumber}`

    // Check if data is already cached in Redis
    const cachedData = await redisClient.get(cacheKey)
    if (cachedData) {
        logger.info(`Cache hit for ${cacheKey}`)
        responseHandler(res, 200, RESPONSE_MESSAGES.RECIPE_FOUND, JSON.parse(cachedData))
        return
    }

    // If no cache, fetch from database
    const getRecipeDetails = await actionGetAllRecipe(pageNumber, limitNumber)
    if (!getRecipeDetails || !getRecipeDetails.recipes?.length) {
        logger.error(RESPONSE_MESSAGES.RECIPE_NOT_FOUND)
        responseHandler(res, 404, RESPONSE_MESSAGES.RECIPE_NOT_FOUND)
        return
    }

    // Store the fetched data in Redis with expiration (e.g., 10 minutes)
    await redisClient.set(cacheKey, JSON.stringify(getRecipeDetails), {
        EX: 600,
    })

    logger.info(`${RESPONSE_MESSAGES.RECIPE_FOUND} ${getRecipeDetails.recipes.length} recipes`)
    responseHandler(res, 200, RESPONSE_MESSAGES.RECIPE_FOUND, getRecipeDetails)
})

/**Creates a new recipe entry with the given details.
 * Ensures that all required fields are provided before saving.
 */
const createNewRecipe = asyncHandler(
    async (req: CreateRecipeRequest, res: Response): Promise<void> => {
        const { userId, title } = req.body
        let ingredients, steps, preparationTime
        try {
            ingredients = JSON.parse(req.body.ingredients)
            steps = JSON.parse(req.body.steps)
            preparationTime = req.body.preparationTime
                ? JSON.parse(req.body.preparationTime)
                : undefined
        } catch {
            ingredients = req.body.ingredients.split(',').map((s) => s.trim())
            steps = req.body.steps.split(',').map((s) => s.trim())
            preparationTime = req.body.preparationTime
                ? JSON.parse(req.body.preparationTime)
                : undefined
        }

        const imageFile = req.file
        const imageName = imageFile?.filename || null
        const cleanUserId = userId.replace(/^"|"$/g, '').trim()

        if (!userId || !title || !ingredients || !steps || !imageName) {
            responseHandler(res, 400, RESPONSE_MESSAGES.INVALID_PARAMETER)
            return
        }

        const user: IUser | null = await checkById(UserModel, cleanUserId)
        if (!user) {
            responseHandler(res, 400, RESPONSE_MESSAGES.INVALID_USER_ID)
            return
        }

        const recipeData = {
            userId: new Types.ObjectId(cleanUserId),
            title,
            ingredients,
            steps,
            image: imageName,
            preparationTime,
        }
        const savedRecipe = await actionCreateNewRecipe(recipeData) // ✅ no error
        const totalRecipes: number = await actionRecipeCount()

        responseHandler(res, 200, RESPONSE_MESSAGES.RECIPE_CREATED, {
            total: totalRecipes,
            recipe: {
                ...savedRecipe.toObject(),
                userId: { _id: user._id, username: user.username },
                averageRating: 0,
            },
        })
    }
)

/**Updates an existing recipe with new details.
 * Allows updating specific fields while keeping others unchanged.
 */
const updateRecipe = asyncHandler(
    async (
        req: Request<CreateRecipeRequest & { recipeId: string }>,
        res: Response
    ): Promise<void> => {
        const { userId, recipeId, title, ingredients, steps, preparationTime } = req.body

        if (!userId || !recipeId) {
            responseHandler(res, 400, RESPONSE_MESSAGES.INVALID_PARAMETER)
            return
        }

        const user = await checkById(UserModel, userId)
        if (!user) {
            responseHandler(res, 400, RESPONSE_MESSAGES.INVALID_USER_ID)
            return
        }

        const updateFields: Record<string, unknown> = {}
        if (title !== undefined) updateFields.title = title
        if (ingredients !== undefined) updateFields.ingredients = JSON.parse(ingredients)
        if (steps !== undefined) updateFields.steps = JSON.parse(steps)
        if (preparationTime !== undefined)
            updateFields.preparationTime = JSON.parse(preparationTime)

        if (req.file) {
            updateFields.image = req.file.filename
        }

        const updatedRecipe = await updateData(RecipeModel, recipeId, updateFields)

        if (!updatedRecipe) {
            responseHandler(res, 404, RESPONSE_MESSAGES.RECIPE_NOT_FOUND)
            return
        }

        responseHandler(res, 200, getMessage('Recipe', 'success', 'update'), {
            recipe: updatedRecipe,
        })
    }
)

/**Fetches a single recipe by its ID.
 * Includes comments and ratings along with user details.
 */
const getRecipeById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params

    if (!id) {
        responseHandler(res, 400, RESPONSE_MESSAGES.INVALID_PARAMETER)
        return
    }

    const recipe = await RecipeModel.findById(id).populate('userId', 'username').lean()

    if (!recipe) {
        responseHandler(res, 404, RESPONSE_MESSAGES.RECIPE_NOT_FOUND)
        return
    }

    const comments = await fetchRecipeRelatedData(CommentModel, id)

    const ratings = await fetchRecipeRelatedData(RateModel, id)

    const averageRating =
        ratings.length > 0 ? ratings.reduce((sum, r) => sum + r.rate, 0) / ratings.length : 0

    responseHandler(res, 200, RESPONSE_MESSAGES.RECIPE_FOUND, {
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
const getRecipeByUser = asyncHandler(
    async (req: Request<object, object, ProfileRequestBody>, res: Response): Promise<void> => {
        const { userId } = req.body

        if (!userId) {
            responseHandler(res, 400, RESPONSE_MESSAGES.INVALID_USER_ID)
            return
        }

        const recipe = await actionGetRecipeByUser(userId)
        responseHandler(res, 200, RESPONSE_MESSAGES.RECIPE_FOUND, recipe)
    }
)

/**Searches for recipes containing a specific ingredient.
 * Returns matching recipes along with their ratings.
 */
const getRecipeByIngredient: RequestHandler = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
        const { ingredient } = req.body

        if (!ingredient) {
            responseHandler(res, 400, RESPONSE_MESSAGES.INVALID_PARAMETER)
            return
        }
        const totalRecipes = await RecipeModel.countDocuments({
            ingredients: { $regex: new RegExp(ingredient, 'i') },
        })

        const recipes = await fetchRecipes(RecipeModel, { byIngredient: ingredient })

        if (!recipes || !Array.isArray(recipes)) {
            responseHandler(res, 409, RESPONSE_MESSAGES.RECIPE_NOT_FOUND)
            return
        }

        const recipeIds: (string | Types.ObjectId)[] = recipes.map(
            (recipe) => recipe._id as string | Types.ObjectId
        )
        const ratingsData = await filterRate(RateModel, {
            recipeIds,
            outputField: 'averageRating',
        })

        const ratingsMap = buildRatingsMap(ratingsData)

        const formattedRecipes: FormattedRecipe[] = formatRecipes(recipes, ratingsMap)

        responseHandler(res, 200, RESPONSE_MESSAGES.RECIPE_FOUND, {
            recipes: formattedRecipes,
            total: totalRecipes,
        })
    }
)

export {
    getAllRecipes,
    createNewRecipe,
    getRecipeById,
    getRecipeByUser,
    getRecipeByIngredient,
    updateRecipe,
}
