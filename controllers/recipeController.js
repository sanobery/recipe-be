const Recipe = require('../models/recipes')
const asyncHandler = require('express-async-handler')
const bcrypt = require('bcrypt')
const CryptoJS = require("crypto-js");
const User = require('../models/users')
const mongoose = require("mongoose");
const Rate = require('../models/rates')

const SECRET_KEY = process.env.SECRET_KEY;

//get request
// const getAllRecipe = asyncHandler(async (req, res) => {
//     const recipe = await Recipe.find().populate("userId", "username");
//     if (!recipe?.length) {
//         return res.status(400).json({ message: 'No Recipe Found' })
//     }

//     res.json(recipe)
// })
// const getAllRecipe = asyncHandler(async (req, res) => {
//     const { page = 1, limit = 5 } = req.query; // ⬅️ Get page & limit from query params

//     const totalRecipes = await Recipe.countDocuments();
//     const recipes = await Recipe.find()
//         .sort({ createdAt: -1 })
//         .skip((page - 1) * limit) // ⬅️ Skip previous pages
//         .limit(parseInt(limit));

//     // const recipes = await Recipe.find().sort({ createdAt: -1 });;

//     if (!recipes?.length) {
//         return res.status(400).json({ message: "No Recipe Found" });
//     }

//     // Fetch usernames manually
//     const recipesWithUsernames = await Promise.all(
//         recipes.map(async (recipe) => {
//             const user = await User.findById({ _id: recipe.userId }).select("username");
//             return { ...recipe.toObject(), username: user?.username || "Unknown" };
//         })
//     );
//     return res.json({ recipes: recipesWithUsernames, total: totalRecipes });
//     // res.json(recipesWithUsernames);
// });

const getAllRecipe = asyncHandler(async (req, res) => {
    const pageNumber = parseInt(req.query.page) || 1;
    const limitNumber = parseInt(req.query.limit) || 5;

    if (isNaN(pageNumber) || isNaN(limitNumber)) {
        return res.status(400).json({ message: "Invalid page or limit parameter" });
    }

    const totalRecipes = await Recipe.countDocuments();

    const recipes = await Recipe.find()
        .skip((pageNumber - 1) * limitNumber)
        .limit(limitNumber)
        .populate("userId", "username") // ✅ Populate `userId` with `username`
        .lean(); // ✅ Convert Mongoose docs to plain objects for performance

    if (!recipes.length) {
        return res.status(400).json({ message: "No Recipe Found" });
    }

    // ✅ Get all recipe IDs to fetch their ratings
    const recipeIds = recipes.map(recipe => recipe._id);

    // ✅ Fetch and compute average ratings for these recipes
    const ratingsData = await Rate.aggregate([
        { $match: { recipeId: { $in: recipeIds } } }, // Match recipes in our list
        {
            $group: {
                _id: "$recipeId",
                averageRating: { $avg: "$rate" } // ✅ Compute average rating
            }
        }
    ]);
    console.log(ratingsData, 86);

    // ✅ Convert ratings data to a map for quick lookup
    const ratingsMap = {};
    ratingsData.forEach(rating => {
        ratingsMap[rating._id.toString()] = rating.averageRating.toFixed(1);
    });
    console.log(ratingsMap, 86);

    // ✅ Format recipes with the average rating
    const formattedRecipes = recipes.map(recipe => ({
        ...recipe,
        userId: { _id: recipe.userId._id, username: recipe.userId.username }, // ✅ Format userId
        averageRating: parseFloat(ratingsMap[recipe._id.toString()] || 0) // ✅ Set default 0 if no rating exists
    }));

    return res.json({ recipes: formattedRecipes, total: totalRecipes });
});

// const getAllRecipe = asyncHandler(async (req, res) => {
//     const pageNumber = parseInt(req.query.page) || 1;
//     const limitNumber = parseInt(req.query.limit) || 5;

//     if (isNaN(pageNumber) || isNaN(limitNumber)) {
//         return res.status(400).json({ message: "Invalid page or limit parameter" });
//     }

//     const totalRecipes = await Recipe.countDocuments();

//     const recipes = await Recipe.find()
//         .sort({ createdAt: -1 })
//         .skip((pageNumber - 1) * limitNumber)
//         .limit(limitNumber)
//         .populate("userId", "username"); // ✅ Populates `userId` with `username`

//     if (!recipes.length) {
//         return res.status(400).json({ message: "No Recipe Found" });
//     }

//     return res.json({ recipes, total: totalRecipes });
// });


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

    // ✅ Find user
    const user = await User.findById(cleanUserId);
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

    // ✅ Fetch updated total count of recipes
    const totalRecipes = await Recipe.countDocuments();

    return res.status(200).json({
        message: "Recipe created successfully",
        total: totalRecipes, // ✅ Total number of recipes after insertion
        recipe: {
            ...newRecipe.toObject(),
            userId: { _id: user._id, username: user.username } // ✅ Format userId properly
        }
    });
});


//post request
// const createNewRecipe = asyncHandler(async (req, res) => {
//     const { userId, title } = req.body;
//     const ingredients = JSON.parse(req.body?.ingredients);
//     const steps = JSON.parse(req.body?.steps);
//     const preparationTime = JSON.parse(req.body?.preparationTime);
//     const imageFile = req.file;
//     const imageName = imageFile ? imageFile.filename : null;
//     const cleanUserId = userId.replace(/^"|"$/g, "").trim();
//     // Check required fields
//     if (!userId || !title || !ingredients || !steps || !imageName) {
//         return res.status(400).json({ message: "All fields are required." });
//     }

//     // ✅ Find user
//     const user = await User.findById(cleanUserId);
//     // Check if userId exists in User collection
//     if (!user) {
//         return res.status(400).json({ message: "Invalid user ID" });
//     }

//     // Create and save recipe
//     const newRecipe = new Recipe({
//         userId: cleanUserId,
//         title,
//         ingredients,
//         steps,
//         image: imageName,
//         preparationTime
//     });

//     await newRecipe.save();

//     return res.status(200).json({
//         message: "Recipe created successfully",
//         recipe: {
//             ...newRecipe.toObject(),
//             username: user.username // ✅ Add username after saving
//         }
//     });

// });

//update user Patch req
const updateRecipe = asyncHandler(async (req, res) => {
    const { userid, username, email, password } = req.body

    if (!userid || !username || !email || !password) {
        return res.status(400).json({ message: 'All are required fields.' })
    }

    const userExist = await Recipe.findById({ userid }).lean()

    if (!userExist) {
        return res.status(400).json({ message: 'Invalid Recipe!' });
    }

    const duplicate = await Recipe.findOne({ email: email }).lean()

    if (duplicate && duplicate?._id.toString() !== userid) {
        return res.status(409).json({ message: 'Duplicate email!' })
    }

    Recipe.username = username
    Recipe.email = email
    const hashPassword = await bcrypt.hash(password, 10)
    Recipe.password = hashPassword
    const userUpdated = await Recipe.save()

    if (userUpdated) {
        return res.status(200).json({ message: userUpdated, userId: userUpdated._id.toString() });
    }
    else {
        return res.status(409).json({ message: 'Invalid user details!' })
    }

})

const getRecipeById = asyncHandler(async (req, res) => {
    const { id } = req?.params

    if (!id) {
        return res.status(400).json({ message: 'RecipeId is required fields.' })
    }

    const recipe = await Recipe.findById({ _id: id }).populate("userId", "username");

    if (!recipe) {
        return res.status(409).json({ message: 'No recipe!' })
    }
    else {
        return res.status(200).json(recipe);
    }
})

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
        return res.status(200).json({ recipe });
    }
})

//delete user Delete req
const deleteRecipe = asyncHandler(async (req, res) => {
    const { userId } = req.body

    if (!userId) {
        return res.status(400).json({ message: 'RecipeId is required fields.' })
    }

    // const receipe = await receipe.findOne({ userId }).lean()
    // if (receipe?.length) {
    //     return res.status(400).json({ message: 'Recipe had added a Recipe' })
    // }

    const user = await Recipe.findOne({ userId }).lean()
    if (!user) {
        return res.status(400).json({ message: 'Recipe not Found' })
    }
    const deletedRecipe = await Recipe.deleteOne()

    const reply = `Recipename ${deletedRecipe.username} deleted`
    return res.status(200).json({ message: reply })
})


const checkRecipe = asyncHandler(async (req, res) => {
    const { email, password } = req.body
    if (!email || !password) {
        return res.status(400).json({ message: 'All are required fields.' })
    }

    const user = await Recipe.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid email or password" });

    // Decrypt the password
    const decryptedPassword = CryptoJS.AES.decrypt(password, SECRET_KEY).toString(CryptoJS.enc.Utf8);

    // Compare decrypted password with hashed password from DB
    const isMatch = await bcrypt.compare(decryptedPassword, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid email or password" });

    res.json({ message: "Login successful" });

    return res.status(200).json({ message: isMatch })
})

const getRecipeByIngredient = asyncHandler(async (req, res) => {
    const { ingredient } = req.body
    const { page = 1, limit = 5 } = req.query; // ⬅️ Get page & limit from query params

    const totalRecipes = await Recipe.countDocuments({
        ingredients: { $regex: new RegExp(ingredient, "i") }
    });
    if (!ingredient) {
        return res.status(400).json({ message: 'Search Bar is empty.' })
    }
    const recipe = await Recipe.find({ ingredients: { $regex: new RegExp(ingredient, "i") } })

    const recipesWithUsernames = await Promise.all(
        recipe.map(async (recipe) => {
            const user = await User.findOne({ userId: recipe.userId }).select("username");
            return { ...recipe.toObject(), username: user?.username || "Unknown" };
        })
    );

    if (!recipe || recipe.length === 0) {
        return res.status(409).json({ message: 'No recipe!' })
    }
    else {
        return res.status(200).json({ recipe: recipesWithUsernames, total: totalRecipes });
    }
})



module.exports = { getAllRecipe, createNewRecipe, updateRecipe, deleteRecipe, checkRecipe, getRecipeById, getRecipeByUser, getRecipeByIngredient }
