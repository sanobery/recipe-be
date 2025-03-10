import Recipe from '../models/recipes.js'
import asyncHandler from 'express-async-handler'
import User from '../models/users.js'
import Rate from '../models/rates.js'
import Comment from '../models/comments.js'

/**Retrieves all recipes with pagination, sorted by creation date.
 * Also calculates the average rating for each recipe.
 */
const getAllRecipe = asyncHandler(async (req, res) => {
    const pageNumber = parseInt(req.query.page) || 1
    const limitNumber = parseInt(req.query.limit) || 5

    if (isNaN(pageNumber) || isNaN(limitNumber)) {
        return res.status(400).json({ message: "Invalid page or limit parameter" })
    }

    const totalRecipes = await Recipe.countDocuments()

    const recipes = await Recipe.find()
        .sort({ createdAt: -1 })
        .skip((pageNumber - 1) * limitNumber)
        .limit(limitNumber)
        .populate("userId", "username")
        .lean()

    if (!recipes.length) {
        return res.status(400).json({ message: "No Recipe Found" })
    }

    const recipeIds = recipes.map(recipe => recipe._id)

    const ratingsData = await Rate.aggregate([
        { $match: { recipeId: { $in: recipeIds } } },
        {
            $group: {
                _id: "$recipeId",
                averageRating: { $avg: "$rate" }
            }
        }
    ])

    const ratingsMap = {}
    ratingsData.forEach(rating => {
        ratingsMap[rating._id.toString()] = rating.averageRating.toFixed(1)
    })

    const formattedRecipes = recipes.map(recipe => ({
        ...recipe,
        userId: { _id: recipe.userId._id, username: recipe.userId.username },
        averageRating: parseFloat(ratingsMap[recipe._id.toString()] || 0)
    }))

    return res.json({ recipes: formattedRecipes, total: totalRecipes })
})

/**Creates a new recipe entry with the given details.
 * Ensures that all required fields are provided before saving.
 */
const createNewRecipe = asyncHandler(async (req, res) => {
    const { userId, title } = req.body
    const ingredients = JSON.parse(req.body?.ingredients)
    const steps = JSON.parse(req.body?.steps)
    const preparationTime = JSON.parse(req.body?.preparationTime)
    const imageFile = req.file
    const imageName = imageFile ? imageFile.filename : null
    const cleanUserId = userId.replace(/^"|"$/g, "").trim()

    if (!userId || !title || !ingredients || !steps || !imageName) {
        return res.status(400).json({ message: "All fields are required." })
    }

    const user = await User.findById(cleanUserId)
    if (!user) {
        return res.status(400).json({ message: "Invalid user ID" })
    }

    const newRecipe = new Recipe({
        userId: cleanUserId,
        title,
        ingredients,
        steps,
        image: imageName,
        preparationTime
    })

    await newRecipe.save()

    const totalRecipes = await Recipe.countDocuments()

    return res.status(200).json({
        message: "Recipe created successfully",
        total: totalRecipes,
        recipe: {
            ...newRecipe.toObject(),
            userId: { _id: user._id, username: user.username },
            averageRating: 0
        }
    })
})

/**Updates an existing recipe with new details.
 * Allows updating specific fields while keeping others unchanged.
 */
const updateRecipe = asyncHandler(async (req, res) => {
    const { userId, recipeId, title, ingredients, steps, preparationTime } = req.body

    if (!userId || !recipeId) {
        return res.status(400).json({ message: "User ID and Recipe ID are required." })
    }

    const user = await User.findById(userId)
    if (!user) {
        return res.status(400).json({ message: "Invalid user ID" })
    }

    let updateFields = {}
    if (title !== undefined) updateFields.title = title
    if (ingredients !== undefined) updateFields.ingredients = JSON.parse(ingredients)
    if (steps !== undefined) updateFields.steps = JSON.parse(steps)
    if (preparationTime !== undefined) updateFields.preparationTime = JSON.parse(preparationTime)

    if (req.file) {
        updateFields.image = req.file.filename
    }

    const updatedRecipe = await Recipe.findByIdAndUpdate(
        recipeId,
        { $set: updateFields },
        { new: true, runValidators: true }
    )

    if (!updatedRecipe) {
        return res.status(404).json({ message: "Recipe not found." })
    }

    res.status(200).json({ message: "Recipe updated successfully", recipe: updatedRecipe })
})

/**Fetches a single recipe by its ID.
 * Includes comments and ratings along with user details.
 */
const getRecipeById = asyncHandler(async (req, res) => {
    const { id } = req.params

    if (!id) {
        return res.status(400).json({ message: 'RecipeId is required.' })
    }

    const recipe = await Recipe.findById(id).populate("userId", "username").lean()

    if (!recipe) {
        return res.status(404).json({ message: 'No recipe found!' })
    }
    const comments = await Comment.find({ recipeId: (id) })
        .populate("userId", "username").lean()

    const ratings = await Rate.find({ recipeId: id }).populate("userId", "username").lean()

    const averageRating = ratings.length > 0
        ? ratings.reduce((sum, r) => sum + r.rate, 0) / ratings.length
        : 0

    return res.status(200).json({
        ...recipe,
        averageRating: Math.ceil(averageRating),
        ratings,
        comments
    })
})

/**Retrieves all recipes created by a specific user.
 * Returns an error message if no recipes are found.
 */
const getRecipeByUser = asyncHandler(async (req, res) => {
    const { userId } = req.body
    if (!userId) {
        return res.status(400).json({ message: 'User Id is required fields.' })
    }

    const recipe = await Recipe.find({ userId: userId })

    if (!recipe || recipe.length === 0) {
        return res.status(409).json({ message: 'No recipe!' })
    }
    else {
        return res.status(200).json({ recipe })
    }
})

/**Deletes a recipe by user ID.
 * Ensures the recipe exists before deletion.
 */
const deleteRecipe = asyncHandler(async (req, res) => {
    const { userId } = req.body

    if (!userId) {
        return res.status(400).json({ message: 'RecipeId is required fields.' })
    }


    const user = await Recipe.findOne({ userId }).lean()
    if (!user) {
        return res.status(400).json({ message: 'Recipe not Found' })
    }
    const deletedRecipe = await Recipe.deleteOne()

    const reply = `Recipename ${deletedRecipe.username} deleted`
    return res.status(200).json({ message: reply })
})

/**Searches for recipes containing a specific ingredient.
 * Returns matching recipes along with their ratings.
 */
const getRecipeByIngredient = asyncHandler(async (req, res) => {
    const { ingredient } = req.body

    const totalRecipes = await Recipe.countDocuments({
        ingredients: { $regex: new RegExp(ingredient, "i") }
    })
    if (!ingredient) {
        return res.status(400).json({ message: 'Search Bar is empty.' })
    }
    const recipes = await Recipe.find({ ingredients: { $regex: new RegExp(ingredient, "i") } }).populate("userId", "username").lean()

    const recipeIds = recipes.map(recipe => recipe._id)

    const ratingsData = await Rate.aggregate([
        { $match: { recipeId: { $in: recipeIds } } },
        {
            $group: {
                _id: "$recipeId",
                averageRating: { $avg: "$rate" }
            }
        }
    ])

    const ratingsMap = {}
    ratingsData.forEach(rating => {
        ratingsMap[rating._id.toString()] = rating.averageRating.toFixed(1)
    })

    const formattedRecipes = recipes.map(recipe => ({
        ...recipe,
        userId: { _id: recipe.userId._id, username: recipe.userId.username },
        averageRating: parseFloat(ratingsMap[recipe._id.toString()] || 0)
    }))

    if (!recipes || recipes.length === 0) {
        return res.status(409).json({ message: 'No recipe!' })
    }
    else {
        return res.status(200).json({ recipes: formattedRecipes, total: totalRecipes })
    }
})

export { getAllRecipe, createNewRecipe, updateRecipe, deleteRecipe, getRecipeById, getRecipeByUser, getRecipeByIngredient }
