import RecipeModel, { IRecipe } from '../models/recipes'
import redisClient from '../config/redisCache'
import { Types } from 'mongoose'
import { FormattedRecipe, RecipeResponse } from '../types/recipeInterface'
import { RESPONSE_MESSAGES } from '../utils/constants'
import { Model } from 'mongoose'
import { filterRate } from './rateCommentRepository'
import RateModel from '../models/rates'
import { PopulatedRecipe } from '../types/recipeInterface'
import { buildRatingsMap, formatRecipes } from '../utils/responseHandler'

const actionGetAllRecipe = async (
    pageNumber: number,
    limitNumber: number
): Promise<RecipeResponse> => {
    const totalRecipes = await actionRecipeCount()

    const recipes = await RecipeModel.find()
        .sort({ createdAt: -1 })
        .skip((pageNumber - 1) * limitNumber)
        .limit(limitNumber)
        .populate('userId', 'username')
        .lean<PopulatedRecipe[]>()

    if (!recipes?.length) {
        return { status: 400, message: RESPONSE_MESSAGES.RECIPE_NOT_FOUND }
    }

    const recipeIds = recipes.map((recipe) => recipe._id as Types.ObjectId)

    const ratingsData = await filterRate(RateModel, {
        recipeIds,
        outputField: 'averageRating',
    })

    const ratingsMap = buildRatingsMap(ratingsData)

    const formattedRecipes: FormattedRecipe[] = formatRecipes(recipes, ratingsMap)

    return { recipes: formattedRecipes, total: totalRecipes }
}

const actionRecipeCount = async () => {
    const totalRecipes = await RecipeModel.countDocuments()
    return totalRecipes
}

const actionGetRecipeByUser = async (userId: string): Promise<RecipeResponse> => {
    const cacheKey = `recipes:${userId}`
    const cachedData = await redisClient.get(cacheKey)

    if (cachedData) {
        return JSON.parse(cachedData) as RecipeResponse
    }

    const recipes = await RecipeModel.find({
        userId: new Types.ObjectId(userId),
    }).lean()

    if (!recipes || recipes.length === 0) {
        return { status: 409, message: RESPONSE_MESSAGES.RECIPE_NOT_FOUND }
    }

    const response: RecipeResponse = {
        status: 200,
        recipes,
        total: recipes.length,
    }

    await redisClient.set(cacheKey, JSON.stringify(response), { EX: 600 })

    return response
}

const actionCreateNewRecipe = async (recipeData: Partial<IRecipe>) => {
    const newRecipe = new RecipeModel(recipeData)
    const savedRecipe = await newRecipe.save()
    return savedRecipe
}

const fetchRecipes = async (
    model: Model<IRecipe>,
    options: {
        byIds?: (string | Types.ObjectId)[]
        byTimeRange?: { min: number; max: number }
        byIngredient?: string
        byId?: string | Types.ObjectId
    }
): Promise<PopulatedRecipe[] | PopulatedRecipe | null> => {
    if (options.byId) {
        return model.findById(options.byId).populate('userId', 'username').lean<PopulatedRecipe[]>()
    }

    const query: Record<string, unknown> = {}

    if (options.byIds) {
        query._id = { $in: options.byIds.map((id) => new Types.ObjectId(id)) }
    }

    if (options.byTimeRange) {
        query.preparationTime = {
            $gte: options.byTimeRange.min,
            $lte: options.byTimeRange.max,
        }
    }

    if (options.byIngredient) {
        query.ingredients = { $regex: new RegExp(options.byIngredient, 'i') }
    }

    return model.find(query).populate('userId', 'username').lean<PopulatedRecipe[]>()
}

export {
    actionGetAllRecipe,
    actionGetRecipeByUser,
    actionRecipeCount,
    actionCreateNewRecipe,
    fetchRecipes,
}
