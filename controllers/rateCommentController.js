const Rate = require('../models/rates')
const asyncHandler = require('express-async-handler')
const User = require('../models/users')
const Recipe = require('../models/recipes')
const Comment = require('../models/comments')

const rateOrCommentRecipe = asyncHandler(async (req, res) => {
    const { recipeId, userId, rate, comment } = req.body;

    // Check if either "rate" or "comment" is present
    if (!recipeId || !userId || (!rate && !comment)) {
        return res.status(400).json({ message: "Recipe ID, User ID, and either Rate or Comment are required." });
    }

    // Validate rate if present
    if (rate !== undefined && (rate < 1 || rate > 5)) {
        return res.status(400).json({ message: "Rate must be between 1 and 5." });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
        return res.status(400).json({ error: "Invalid user ID" });
    }

    // Check if recipe exists
    const recipeExists = await Recipe.findById(recipeId);
    if (!recipeExists) {
        return res.status(404).json({ message: "Recipe not found." });
    }

    let responseMessage = "";

    // If rating is provided
    if (rate !== undefined) {
        if (recipeExists.userId.toString() === userId) {
            return res.status(403).json({ message: "You cannot rate your own recipe." });
        }

        const existingRating = await Rate.findOne({ recipeId, userId });
        if (existingRating) {
            return res.status(400).json({ message: "User has already rated this recipe." });
        }

        const newRating = new Rate({
            recipeId,
            userId,
            rate,
        });

        await newRating.save();
        responseMessage += "Rating added successfully. ";
    }

    // If comment is provided
    if (comment !== undefined) {
        const newComment = new Comment({
            recipeId,
            userId,
            comment,
        });

        await newComment.save();
        responseMessage += "Comment added successfully.";
    }

    return res.status(200).json({ message: responseMessage });
});

const getFilterRecipe = asyncHandler(async (req, res) => {
    try {
        console.log("Received Query Params:", req.query); // Debugging

        const { rating } = req.query; // Extract rating

        if (!rating) {
            return res.status(400).json({ error: "Rating parameter is required" });
        }

        // Fetch Rate and JOIN with Recipe model
        const mongooseQuery = await Rate.find({ rate: String(rating) })
            .populate({
                path: "recipeId", // Field in Rate referencing Recipe
                model: "recipe",  // Reference the Recipe model
            })
            .populate({
                path: "userId", // Reference the user
                model: "User", // Explicitly set the model
                select: "username", // Get only username
                match: { userId: { $exists: true } }, // Ensure userId exists
                localField: "userId", // Tell Mongoose to match on "userId"
                foreignField: "userId", // Match with "userId" in the User model
                options: { strictPopulate: false } // Allow custom field population
            });



        if (mongooseQuery.length === 0) {
            return res.status(404).json({ message: "No recipes found with this rating" });
        }

        res.status(200).json({ recipes: mongooseQuery }); // Send full recipe data
    } catch (error) {
        console.error("Error fetching recipes:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});


// const getRecipesWithSpecificRate = asyncHandler(async (req, res) => {
//     // Step 1: Get the rating filter from query parameters
//     const { rating } = req.query;

//     if (!rating) {
//         return res.status(400).json({ message: "Rating query parameter is required." });
//     }

//     const specificRate = Number(rating);
//     if (isNaN(specificRate) || specificRate < 1 || specificRate > 5) {
//         return res.status(400).json({ message: "Invalid rating. It must be between 1 and 5." });
//     }

//     // Step 2: Find all recipes that have at least one rating of `specificRate`
//     const recipesWithSpecificRate = await Rate.aggregate([
//         { $match: { rate: specificRate } }, // Filter ratings with the given rate
//     ]);

//     if (recipesWithSpecificRate.length === 0) {
//         return res.status(404).json({ message: "No recipes found with the given rating." });
//     }

//     // Step 3: Get all recipeIds that matched the criteria
//     const recipeIds = recipesWithSpecificRate.map(r => r._id);

//     // Step 4: Fetch recipe details for the filtered recipeIds
//     const recipes = await Recipe.find({ _id: { $in: recipeIds } });

//     // Step 5: Merge the average rating with recipe details
//     const result = recipes.map(recipe => {
//         const ratingData = recipesWithSpecificRate.find(r => r._id.toString() === recipe._id.toString());
//         return {
//             recipe,
//             averageRating: ratingData ? ratingData.avgRating : 0
//         };
//     });

//     return res.status(200).json(result);
// });

const getRecipesWithSpecificRate = asyncHandler(async (req, res) => {
    // Step 1: Get the rating filter from query parameters
    const { rating } = req.query;

    if (!rating) {
        return res.status(400).json({ message: "Rating query parameter is required." });
    }

    const specificRate = Number(rating);
    if (isNaN(specificRate) || specificRate < 1 || specificRate > 5) {
        return res.status(400).json({ message: "Invalid rating. It must be between 1 and 5." });
    }

    // Step 2: Aggregate to calculate the average rating per recipe
    const avgRatings = await Rate.aggregate([
        {
            $group: {
                _id: "$recipeId",
                avgRating: { $avg: "$rate" } // Compute average rating per recipe
            }
        },
        {
            $addFields: { avgRatingCeil: { $ceil: "$avgRating" } } // Round up avgRating
        },
        {
            $match: { avgRatingCeil: specificRate } // Filter recipes with matching average rating
        }
    ]);

    if (avgRatings.length === 0) {
        return res.status(404).json({ message: "No recipes found with the given average rating." });
    }
    console.log(avgRatings, 179);

    // Step 3: Extract recipe IDs
    const recipeIds = avgRatings.map(r => r._id);

    // Step 4: Fetch recipe details for matched recipeIds
    const recipes = await Recipe.find({ _id: { $in: recipeIds } });

    // Step 5: Merge recipe details with their respective average ratings
    const result = recipes.map(recipe => {
        const ratingData = avgRatings.find(r => r._id.toString() === recipe._id.toString());
        return {
            recipe,
            averageRating: ratingData ? ratingData.avgRating : 0
        };
    });

    return res.status(200).json({ recipes: result });
});

// Example usage:

module.exports = { rateOrCommentRecipe, getRecipesWithSpecificRate }
