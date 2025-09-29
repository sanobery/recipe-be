/**
 * Controller class containing all the Rate/Comment functionalities.
 *
 * @since 1.0
 */

import RateModel from '../models/rates'
import asyncHandler from 'express-async-handler'
import RecipeModel from '../models/recipes'
import CommentModel from '../models/comments'
import UserModel from '../models/users'
import { Request, Response } from 'express'
import { getMessage, RESPONSE_MESSAGES } from '../utils/constants'
import {
    RateOrCommentRequestBody,
    RecipeQuery,
    RecipeResponse,
    FormattedRecipe,
} from '../types/recipeInterface'
import { checkById } from '../repositories/dbRepository'
import { findOneByFields, createAndRespond } from '../repositories/dbRepository'
import { Types } from 'mongoose'
import { filterRate } from '../repositories/rateCommentRepository'
import { fetchRecipes } from '../repositories/recipeRepository'
import { formatRecipesWithRatings } from '../utils/responseHandler'

/**
 * Allows a user to rate or comment on a recipe.
 * - Users cannot rate their own recipes.
 * - Ensures ratings are between 1 and 5 and prevents duplicate ratings.
 */
const rateOrCommentRecipe = asyncHandler(
    async (
        req: Request<object, object, RateOrCommentRequestBody>,
        res: Response
    ): Promise<void> => {
        const { recipeId, userId, rate, comment } = req.body

        if (!recipeId || !userId || (rate === undefined && !comment)) {
            res.status(400).json({
                message: RESPONSE_MESSAGES.FIELD_REQUIRED,
            })
            return
        }

        if (rate !== undefined && (rate < 1 || rate > 5)) {
            res.status(400).json({ message: RESPONSE_MESSAGES.RATE_RANGE })
            return
        }

        const user = await checkById(UserModel, userId)
        if (!user) {
            res.status(400).json({ error: RESPONSE_MESSAGES.INVALID_USER_ID })
            return
        }

        const recipeExists = await checkById(RecipeModel, recipeId)
        if (!recipeExists) {
            res.status(404).json({ message: RESPONSE_MESSAGES.RECIPE_NOT_FOUND })
            return
        }

        let responseMessage = ''

        if (rate !== undefined) {
            if (recipeExists.userId.toString() === userId) {
                res.status(403).json({ message: RESPONSE_MESSAGES.CANNOT_RATE_OWN_RECIPE })
                return
            }

            const existingRating = await findOneByFields(RateModel, { recipeId, userId })
            if (existingRating) {
                res.status(400).json({ message: RESPONSE_MESSAGES.USER_RATED })
                return
            }

            const { message: ratingMessage } = await createAndRespond(
                RateModel,
                {
                    recipeId: new Types.ObjectId(recipeId),
                    userId: new Types.ObjectId(userId),
                    rate,
                },
                'Rating',
                'add'
            )

            responseMessage += ratingMessage
        }

        if (comment !== undefined) {
            const { message: commentMessage } = await createAndRespond(
                CommentModel,
                {
                    recipeId: new Types.ObjectId(recipeId),
                    userId: new Types.ObjectId(userId),
                    comment,
                },
                'Comment',
                'add'
            )

            responseMessage += commentMessage
        }

        res.status(200).json({ message: responseMessage })
    }
)

/**
 * Retrieves recipes based on a specific rating or preparation time.
 * - Filters recipes based on the query parameters.
 * - Calls appropriate helper functions for fetching filtered recipes.
 */
const filterSearchRecipes = asyncHandler(
    async (req: Request<object, object, object, RecipeQuery>, res: Response): Promise<void> => {
        const { rating, preparationtime } = req.query

        if (rating && preparationtime) {
            res.status(400).json({
                message:
                    'Please provide only one filter: either rating or preparationtime, not both.',
            })
            return
        }

        let recipeData: RecipeResponse = {
            status: 400,
            message: RESPONSE_MESSAGES.INVALID_PARAMETER,
        }

        if (rating) {
            recipeData = await getRecipesByRate(rating)
        }

        if (preparationtime) {
            recipeData = await getRecipesByPreparationTime(preparationtime)
        }

        res.status(recipeData.status).json(recipeData)
    }
)

/**
 * Fetches recipes that have a specific average rating.
 * - Uses aggregation to calculate the average rating per recipe.
 * - Filters recipes based on the provided rating value.
 */
export const getRecipesByRate = async (rating: string): Promise<RecipeResponse> => {
    if (!rating) {
        return { status: 400, message: getMessage('Query param', 'required') }
    }

    const specificRate = Number(rating)
    if (isNaN(specificRate) || specificRate < 1 || specificRate > 5) {
        return { status: 400, message: RESPONSE_MESSAGES.RATE_RANGE }
    }

    const avgRatings = await filterRate(RateModel, {
        specificRate: parseInt(rating),
    })

    if (avgRatings.length === 0) {
        return { status: 404, message: getMessage('rating', 'recipe') }
    }

    const recipeIds = avgRatings.map((r) => r._id)

    const recipes = await fetchRecipes(RecipeModel, { byIds: recipeIds })

    if (!recipes || !Array.isArray(recipes)) {
        // handle error or return early
        return { status: 400, message: RESPONSE_MESSAGES.RECIPE_NOT_FOUND }
    }

    const formattedRecipes: FormattedRecipe[] = formatRecipesWithRatings(recipes, avgRatings)

    return {
        status: 200,
        recipes: formattedRecipes,
        total: formattedRecipes.length,
    }
}

/**
 * Fetches recipes based on a given preparation time range.
 * - Validates that preparation time is numeric.
 * - Returns recipes within the specified time range.
 */
const getRecipesByPreparationTime = async (preparationTime: string): Promise<RecipeResponse> => {
    if (!preparationTime) {
        return { status: 400, message: getMessage('Query parameter', 'required') }
    }

    const [minTime, maxTime] = preparationTime.split('-').map(Number)

    if (isNaN(minTime) || isNaN(maxTime)) {
        return { status: 400, message: RESPONSE_MESSAGES.NUMERIC_PREPARATION_TIME }
    }
    const recipes = await fetchRecipes(RecipeModel, {
        byTimeRange: { min: minTime, max: maxTime },
    })

    if (!recipes || !Array.isArray(recipes)) {
        // handle error or return early
        return { status: 400, message: RESPONSE_MESSAGES.RECIPE_NOT_FOUND }
    }

    const avgRatings = await filterRate(RateModel)

    const result: FormattedRecipe[] = formatRecipesWithRatings(recipes, avgRatings)

    if (result.length === 0) {
        return {
            status: 404,
            message: getMessage('preparationtime', 'recipe'),
        }
    }

    return { status: 200, recipes: result, total: result.length }
}

export { rateOrCommentRecipe, filterSearchRecipes }
