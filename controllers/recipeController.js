import Recipe, { countDocuments, find, findById, findOne, username as _username, email as _email, password as _password, save, deleteOne } from '../models/recipes';
import asyncHandler from 'express-async-handler';
import { hash, compare } from 'bcrypt';
import { AES, enc } from "crypto-js";
import { findById as _findById } from '../models/users';
import mongoose from "mongoose";
import { aggregate, find as _find } from '../models/rates';
import { find as __find } from '../models/comments';

const SECRET_KEY = process.env.SECRET_KEY;

const getAllRecipe = asyncHandler(async (req, res) => {
    const pageNumber = parseInt(req.query.page) || 1;
    const limitNumber = parseInt(req.query.limit) || 5;

    if (isNaN(pageNumber) || isNaN(limitNumber)) {
        return res.status(400).json({ message: "Invalid page or limit parameter" });
    }

    const totalRecipes = await countDocuments();

    const recipes = await find()
        .sort({ createdAt: -1 })
        .skip((pageNumber - 1) * limitNumber)
        .limit(limitNumber)
        .populate("userId", "username")
        .lean();

    if (!recipes.length) {
        return res.status(400).json({ message: "No Recipe Found" });
    }

    //  Get all recipe IDs to fetch their ratings
    const recipeIds = recipes.map(recipe => recipe._id);

    //  Fetch and compute average ratings for these recipes
    const ratingsData = await aggregate([
        { $match: { recipeId: { $in: recipeIds } } }, // Match recipes in our list
        {
            $group: {
                _id: "$recipeId",
                averageRating: { $avg: "$rate" } //  Compute average rating
            }
        }
    ]);

    //  Convert ratings data to a map for quick lookup
    const ratingsMap = {};
    ratingsData.forEach(rating => {
        ratingsMap[rating._id.toString()] = rating.averageRating.toFixed(1);
    });

    //  Format recipes with the average rating
    const formattedRecipes = recipes.map(recipe => ({
        ...recipe,
        userId: { _id: recipe.userId._id, username: recipe.userId.username }, //  Format userId
        averageRating: parseFloat(ratingsMap[recipe._id.toString()] || 0) //  Set default 0 if no rating exists
    }));

    return res.json({ recipes: formattedRecipes, total: totalRecipes });
});

const createNewRecipe = asyncHandler(async (req, res) => {
    const { userId, title } = req.body;
    const ingredients = JSON.parse(req.body?.ingredients);
    const steps = JSON.parse(req.body?.steps);
    const preparationTime = JSON.parse(req.body?.preparationTime);
    const imageFile = req.file;
    const imageName = imageFile ? imageFile.filename : null;
    const cleanUserId = userId.replace(/^"|"$/g, "").trim();

    // Check required fields
    if (!userId || !title || !ingredients || !steps || !imageName) {
        return res.status(400).json({ message: "All fields are required." });
    }

    //  Find user
    const user = await _findById(cleanUserId);
    if (!user) {
        return res.status(400).json({ message: "Invalid user ID" });
    }

    // Create and save recipe
    const newRecipe = new Recipe({
        userId: cleanUserId,
        title,
        ingredients,
        steps,
        image: imageName,
        preparationTime
    });

    await newRecipe.save();

    //  Fetch updated total count of recipes
    const totalRecipes = await countDocuments();

    return res.status(200).json({
        message: "Recipe created successfully",
        total: totalRecipes, //  Total number of recipes after insertion
        recipe: {
            ...newRecipe.toObject(),
            userId: { _id: user._id, username: user.username }, //  Format userId properly
            averageRating: 0
        }
    });
});

//update user Patch req
const updateRecipe = asyncHandler(async (req, res) => {
    const { userid, username, email, password } = req.body

    if (!userid || !username || !email || !password) {
        return res.status(400).json({ message: 'All are required fields.' })
    }

    const userExist = await findById({ userid }).lean()

    if (!userExist) {
        return res.status(400).json({ message: 'Invalid Recipe!' });
    }

    const duplicate = await findOne({ email: email }).lean()

    if (duplicate && duplicate?._id.toString() !== userid) {
        return res.status(409).json({ message: 'Duplicate email!' })
    }

    _username = username
    _email = email
    const hashPassword = await hash(password, 10)
    _password = hashPassword
    const userUpdated = await save()

    if (userUpdated) {
        return res.status(200).json({ message: userUpdated, userId: userUpdated._id.toString() });
    }
    else {
        return res.status(409).json({ message: 'Invalid user details!' })
    }

})

const getRecipeById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id) {
        return res.status(400).json({ message: 'RecipeId is required.' });
    }

    const recipe = await findById(id).populate("userId", "username").lean();

    if (!recipe) {
        return res.status(404).json({ message: 'No recipe found!' });
    }
    const comments = await __find({ recipeId: (id) })
        .populate("userId", "username").lean();

    const ratings = await _find({ recipeId: id }).populate("userId", "username").lean();

    const averageRating = ratings.length > 0
        ? ratings.reduce((sum, r) => sum + r.rate, 0) / ratings.length
        : 0;


    return res.status(200).json({
        ...recipe,          // Recipe details
        averageRating: Math.ceil(averageRating), // Average rating (rounded)
        ratings,      // Rating given by logged-in user
        comments         // All comments for this recipe
    });
});

const getRecipeByUser = asyncHandler(async (req, res) => {
    const { userId } = req.body
    if (!userId) {
        return res.status(400).json({ message: 'User Id is required fields.' })
    }

    const recipe = await find({ userId: userId })

    if (!recipe || recipe.length === 0) {
        return res.status(409).json({ message: 'No recipe!' })
    }
    else {
        return res.status(200).json({ recipe });
    }
})

//delete user Delete req
const deleteRecipe = asyncHandler(async (req, res) => {
    const { userId } = req.body

    if (!userId) {
        return res.status(400).json({ message: 'RecipeId is required fields.' })
    }

    const user = await findOne({ userId }).lean()
    if (!user) {
        return res.status(400).json({ message: 'Recipe not Found' })
    }
    const deletedRecipe = await deleteOne()

    const reply = `Recipename ${deletedRecipe.username} deleted`
    return res.status(200).json({ message: reply })
})

const checkRecipe = asyncHandler(async (req, res) => {
    const { email, password } = req.body
    if (!email || !password) {
        return res.status(400).json({ message: 'All are required fields.' })
    }

    const user = await findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid email or password" });

    // Decrypt the password
    const decryptedPassword = AES.decrypt(password, SECRET_KEY).toString(enc.Utf8);

    // Compare decrypted password with hashed password from DB
    const isMatch = await compare(decryptedPassword, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid email or password" });

    res.json({ message: "Login successful" });

    return res.status(200).json({ message: isMatch })
})

const getRecipeByIngredient = asyncHandler(async (req, res) => {
    const { ingredient } = req.body

    const totalRecipes = await countDocuments({
        ingredients: { $regex: new RegExp(ingredient, "i") }
    });
    if (!ingredient) {
        return res.status(400).json({ message: 'Search Bar is empty.' })
    }
    const recipes = await find({ ingredients: { $regex: new RegExp(ingredient, "i") } }).populate("userId", "username").lean()

    const recipeIds = recipes.map(recipe => recipe._id);

    //  Fetch and compute average ratings for these recipes
    const ratingsData = await aggregate([
        { $match: { recipeId: { $in: recipeIds } } }, // Match recipes in our list
        {
            $group: {
                _id: "$recipeId",
                averageRating: { $avg: "$rate" } //  Compute average rating
            }
        }
    ]);

    //  Convert ratings data to a map for quick lookup
    const ratingsMap = {};
    ratingsData.forEach(rating => {
        ratingsMap[rating._id.toString()] = rating.averageRating.toFixed(1);
    });

    const formattedRecipes = recipes.map(recipe => ({
        ...recipe,
        userId: { _id: recipe.userId._id, username: recipe.userId.username }, //  Format userId
        averageRating: parseFloat(ratingsMap[recipe._id.toString()] || 0) //  Set default 0 if no rating exists
    }));

    if (!recipes || recipes.length === 0) {
        return res.status(409).json({ message: 'No recipe!' })
    }
    else {
        return res.status(200).json({ recipes: formattedRecipes, total: totalRecipes });
    }
})

export default { getAllRecipe, createNewRecipe, updateRecipe, deleteRecipe, checkRecipe, getRecipeById, getRecipeByUser, getRecipeByIngredient }
