import { AggregatedRating } from '../types/rateCommentInterface'
import { Model, PipelineStage, Types } from 'mongoose'

const filterRate = async <T>(
    model: Model<T>,
    options?: {
        specificRate?: number
        recipeIds?: (string | Types.ObjectId)[]
        outputField?: string // optional rename
    }
): Promise<AggregatedRating[]> => {
    const pipeline: PipelineStage[] = []

    if (options?.recipeIds) {
        pipeline.push({
            $match: {
                recipeId: {
                    $in: options.recipeIds.map((id) => new Types.ObjectId(id)),
                },
            },
        })
    }

    pipeline.push({
        $group: {
            _id: '$recipeId',
            [options?.outputField || 'avgRating']: { $avg: '$rate' },
        },
    })

    if (options?.specificRate !== undefined) {
        pipeline.push(
            {
                $addFields: {
                    avgRatingCeil: { $ceil: `$${options.outputField || 'avgRating'}` },
                },
            },
            {
                $match: { avgRatingCeil: options.specificRate },
            }
        )
    }

    return model.aggregate<AggregatedRating>(pipeline)
}

const fetchRecipeRelatedData = async <T>(
    model: Model<T>,
    recipeId: string | Types.ObjectId
): Promise<T[]> => {
    const id = new Types.ObjectId(recipeId)
    return model.find({ recipeId: id }).populate('userId', 'username')
}

export { filterRate, fetchRecipeRelatedData }
