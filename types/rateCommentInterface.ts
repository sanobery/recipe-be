import { Types } from 'mongoose'

// Define the interface for a Comment document
interface IComment extends Document {
    recipeId: Types.ObjectId
    userId: Types.ObjectId
    comment?: string | null
    createdAt: Date
}

interface AggregatedRating {
    _id: Types.ObjectId
    avgRating: number
    avgRatingCeil: number
}

export { AggregatedRating, IComment }
