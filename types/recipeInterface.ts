import { Types } from 'mongoose'
import { Request } from 'express'
import { IRecipe } from '../models/recipes'
import type * as Express from 'express'
interface RateOrCommentRequestBody {
    recipeId: string
    userId: string
    rate?: number
    comment?: string
}

interface RecipeQuery {
    status?: number | undefined
    rating?: string
    preparationtime?: string
}

interface RecipeResponse {
    status: number
    message?: string
    recipes?: IRecipe[] | FormattedRecipe[]
    total?: number
}

interface CreateRecipeRequest extends Request {
    body: {
        userId: string
        title: string
        ingredients: string
        steps: string
        preparationTime?: string
    }
    file?: Express.Request['file']
}

interface PopulatedRecipe extends Omit<IRecipe, 'userId'> {
    userId: {
        _id: Types.ObjectId
        username: string
    }
}

interface FormattedRecipe extends PopulatedRecipe {
    averageRating: number
}

export {
    RateOrCommentRequestBody,
    RecipeQuery,
    RecipeResponse,
    CreateRecipeRequest,
    FormattedRecipe,
    PopulatedRecipe,
}
