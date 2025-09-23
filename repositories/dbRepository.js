import asyncHandler from 'express-async-handler'

const updateData = asyncHandler(async (model, id, updateFields) => {
    const updatedDocument = await model.findByIdAndUpdate(
        id,
        { $set: updateFields },
        { new: true, runValidators: true }
    )
    return updatedDocument
})

export { updateData }
