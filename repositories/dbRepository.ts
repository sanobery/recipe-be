import { Model, Document, Types, FilterQuery } from 'mongoose'
import { getMessage } from '../utils/constants'

type UpdateFields<T> = Partial<T>

const updateData = async <T extends Document>(
    model: Model<T>,
    id: string | Types.ObjectId,
    updateFields: UpdateFields<T>
): Promise<T | null> => {
    const updatedDocument = await model.findByIdAndUpdate(
        id,
        { $set: updateFields },
        { new: true, runValidators: true }
    )
    return updatedDocument
}

const checkById = async <T>(model: Model<T>, id: string): Promise<T | null> => {
    return model.findById(new Types.ObjectId(id))
}

const findOneByFields = async <T>(model: Model<T>, query: FilterQuery<T>): Promise<T | null> => {
    return model.findOne(query)
}

const createAndRespond = async <T>(
    model: Model<T>,
    payload: Partial<T>,
    label: string,
    action: 'add' | 'update'
): Promise<{ message: string }> => {
    const instance = new model(payload)
    await instance.save()
    const message = getMessage(label, 'success', action)
    return { message }
}

export { updateData, checkById, findOneByFields, createAndRespond }
