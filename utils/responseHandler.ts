import { Response } from 'express'
import { FormattedRecipe, PopulatedRecipe, RecipeResponse } from '../types/recipeInterface'
import { AggregatedRating } from '../types/rateCommentInterface'
import { Types } from 'mongoose'

// interface ResponseData {
//     [key: string]: string
// }

const responseHandler = (
    res: Response,
    statusCode: number,
    message: string,
    data: RecipeResponse | object | null = null
): Response => {
    return res.status(statusCode).json({
        status: statusCode,
        message,
        ...(data || {}),
    })
}

const formatRecipesWithRatings = (
    recipes: PopulatedRecipe[],
    avgRatings: AggregatedRating[],
    useMap: boolean = false
): FormattedRecipe[] => {
    if (useMap) {
        const ratingsMap: Record<string, number> = Object.fromEntries(
            avgRatings.map((r) => [r._id.toString(), r.avgRating])
        )

        return recipes.map((recipe) => ({
            ...recipe,
            userId:
                typeof recipe.userId === 'object' && 'username' in recipe.userId
                    ? {
                          _id: recipe.userId._id,
                          username: recipe.userId.username,
                      }
                    : {
                          _id: recipe.userId as Types.ObjectId,
                          username: 'Unknown',
                      },
            averageRating: parseFloat(ratingsMap[recipe._id.toString()]?.toString() || '0'),
        }))
    }

    return recipes.map((recipe) => {
        const ratingData = avgRatings.find((r) => r._id.toString() === recipe._id.toString())

        return {
            ...recipe,
            userId:
                typeof recipe.userId === 'object' && 'username' in recipe.userId
                    ? {
                          _id: recipe.userId._id,
                          username: recipe.userId.username,
                      }
                    : {
                          _id: recipe.userId as Types.ObjectId,
                          username: 'Unknown',
                      },
            averageRating: ratingData ? ratingData.avgRating : 0,
        }
    })
}

const buildRatingsMap = (ratingsData: AggregatedRating[]): Record<string, string> => {
    const ratingsMap: Record<string, string> = {}

    ratingsData.forEach((rating) => {
        const avg = rating.avgRating
        ratingsMap[rating._id.toString()] = typeof avg === 'number' ? avg.toFixed(1) : '0.0'
    })

    return ratingsMap
}

const formatRecipes = (
    recipes: PopulatedRecipe[],
    ratingsMap: Record<string, string>
): FormattedRecipe[] => {
    return recipes.map((recipe) => ({
        ...recipe,
        userId: {
            _id: recipe.userId._id,
            username: recipe.userId.username,
        },
        averageRating: parseFloat(ratingsMap[recipe._id.toString()] || '0'),
    }))
}

export { formatRecipesWithRatings, responseHandler, buildRatingsMap, formatRecipes }
