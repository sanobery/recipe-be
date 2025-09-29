/**
 * Recipe Routes
 * --------------
 * Defines all API endpoints related to recipe management including creation,
 * retrieval, updating, and deletion of recipes.
 *
 * Usage:
 * - Public routes: / (GET), /:id (GET)
 * - Protected routes (require JWT): / (POST), /:id (PUT, DELETE)
 *
 * Notes:
 * - Recipe Controllers handle validation, parsing
 * - Recipe Repository handle database operations
 */
import { Router, Request } from 'express'
import multer, { diskStorage, FileFilterCallback } from 'multer'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import { rateOrCommentRecipe, filterSearchRecipes } from '../controllers/rateCommentController'
import verifyJwt from '../middleware/verifyJwt'
import {
    getAllRecipes,
    getRecipeByIngredient,
    getRecipeById,
    getRecipeByUser,
    createNewRecipe,
    updateRecipe,
} from '../controllers/recipeController'
import { ParamsDictionary } from 'express-serve-static-core'
import { ParsedQs } from 'qs'
import * as Express from 'express'

const router = Router()
const uploadDir = join(__dirname, '../uploads')
if (!existsSync(uploadDir)) {
    mkdirSync(uploadDir, { recursive: true })
}

const storage = diskStorage({
    destination: (
        req: Express.Request,
        file: Express.Multer.File,
        cb: (error: Error | null, destination: string) => void
    ) => {
        cb(null, uploadDir) // ✅ req is defined here
    },
    filename: (
        req: Express.Request,
        file: Express.Multer.File,
        cb: (error: Error | null, filename: string) => void
    ) => {
        cb(null, `${file.originalname}`) // ✅ req is defined here
    },
})
const fileFilter = (
    req: Request<ParamsDictionary, unknown, unknown, ParsedQs, Record<string, unknown>>,
    file: Express.Multer.File,
    cb: FileFilterCallback
): void => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true)
    } else {
        cb(new Error('Only PNG, JPEG, JPG, and WEBP files are allowed!'))
    }
}

const upload = multer({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
    fileFilter,
})
/**
 * @swagger
 * tags:
 *   name: Recipe
 *   description: API for managing recipes
 */

/**
 * @swagger
 * /recipe:
 *   get:
 *     summary: Get all recipes
 *     description: Retrieve a list of all recipes.
 *     tags: [Recipe]
 *     responses:
 *       200:
 *         description: Successfully retrieved recipes.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Recipe'
 *       400:
 *         description: Bad request

 *   post:
 *     summary: Create a new recipe
 *     description: |
 *       Upload an image and add a new recipe.  
 *       This endpoint accepts `multipart/form-data` with all fields as strings.  
 *       `ingredients`, `steps`, and `preparationTime` must be JSON-stringified strings — exactly like:
 *       ```
 *       ingredients: '["egg"]'
 *       steps: '["boil in water","jjj"]'
 *       preparationTime: "3"
 *       ```
 *     tags: [Recipe]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - ingredients
 *               - steps
 *               - userId
 *               - preparationTime
 *               - image
 *             properties:
 *               title:
 *                 type: string
 *                 example: sano new recipe
 *               ingredients:
 *                 type: string
 *                 example: '["egg"]'
 *                 description: JSON-stringified array of ingredients
 *               steps:
 *                 type: string
 *                 example: '["boil in water","jjj"]'
 *                 description: JSON-stringified array of steps
 *               userId:
 *                 type: string
 *                 example: "68d27587596b417988838bef"
 *               preparationTime:
 *                 type: string
 *                 example: 3
 *                 description: JSON-stringified number
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Image file for the recipe
 *     responses:
 *       201:
 *         description: Recipe created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Recipe created successfully
 *                 recipe:
 *                   $ref: '#/components/schemas/Recipe'
 *       400:
 *         description: Invalid input or JSON format
 *       401:
 *         description: Unauthorized — missing or invalid token
 */

router.route('/').get(getAllRecipes).post(upload.single('image'), createNewRecipe)

// Apply `verifyJwt` only for specific routes
/**
 * @swagger
 * /recipe/rate:
 *   post:
 *     summary: Rate a recipe
 *     description: |
 *       Allows an authenticated user to rate a recipe by providing their user ID, the recipe ID, and a rating value.
 *       Requires Bearer token authentication. The user ID must be passed manually in the request body.
 *     tags: [Recipe]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - recipeId
 *               - rate
 *             properties:
 *               userId:
 *                 type: string
 *                 example: "68d27587596b417988838bef"
 *                 description: ID of the user submitting the rating
 *               recipeId:
 *                 type: string
 *                 example: "68d5633ec920e606f5bb33f1"
 *                 description: ID of the recipe being rated
 *               rate:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 4
 *                 description: Rating value (1 to 5)
 *     responses:
 *       200:
 *         description: Rating submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 updatedRecipe:
 *                   $ref: '#/components/schemas/Recipe'
 *       400:
 *         description: Invalid input or missing fields
 *       401:
 *         description: Unauthorized — missing or invalid token
 *       404:
 *         description: Recipe or user not found
 */
router.post('/rate', verifyJwt, rateOrCommentRecipe)

/**
 * @swagger
 * /recipe/comment:
 *   post:
 *     summary: Add a comment to a recipe
 *     description: |
 *       Allows an authenticated user to comment on a recipe by providing their user ID, the recipe ID, and the comment text.
 *       Requires Bearer token authentication. The user ID must be passed manually in the request body.
 *     tags: [Recipe]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - recipeId
 *               - comment
 *             properties:
 *               userId:
 *                 type: string
 *                 example: "67c1a0520ace1148c3d5ccd3"
 *                 description: ID of the user submitting the comment
 *               recipeId:
 *                 type: string
 *                 example: "68d5633ec920e606f5bb33f1"
 *                 description: ID of the recipe being commented on
 *               comment:
 *                 type: string
 *                 example: "This was delicious!"
 *                 description: Text of the user's comment
 *     responses:
 *       200:
 *         description: Comment added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 updatedRecipe:
 *                   $ref: '#/components/schemas/Recipe'
 *       400:
 *         description: Invalid input or missing fields
 *       401:
 *         description: Unauthorized — missing or invalid token
 *       404:
 *         description: Recipe or user not found
 */
router.post('/comment', verifyJwt, rateOrCommentRecipe)

/**
 * @swagger
 * /recipe/filter:
 *   get:
 *     summary: Filter recipes by rating or preparation time
 *     description: Accepts either `rating` or `preparationtime` — only one should be used at a time
 *     tags: [Recipe]
 *     parameters:
 *       - in: query
 *         name: rating
 *         schema:
 *           type: number
 *         required: false
 *         description: Minimum rating to filter recipes (e.g., 4)
 *       - in: query
 *         name: preparationtime
 *         schema:
 *           type: string
 *           pattern: '^\d{1,3}-\d{1,3}$'
 *         required: false
 *         description: Preparation time range in minutes (e.g., 31-45)
 *     responses:
 *       200:
 *         description: Filtered recipes returned successfully
 *       400:
 *         description: No recipes found or invalid parameters
 */

router.get('/filter', filterSearchRecipes)

/**
 * @swagger
 * /recipe/search:
 *   post:
 *     summary: Search recipes by ingredient
 *     description: Returns recipes that contain the specified ingredient
 *     tags: [Recipe]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ingredient:
 *                 type: string
 *                 example: "oo"
 *                 description: Ingredient to search for in recipes
 *     responses:
 *       200:
 *         description: Recipes matching the ingredient
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 recipes:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Recipe'
 *       400:
 *         description: Invalid ingredient or no matching recipes found
 */
router.post('/search', getRecipeByIngredient)
router.post('/update', updateRecipe)

/**
 * @swagger
 * /recipe/{id}:
 *  get:
 *      summary: Retrieve recipe details
 *      description: Fetches detailed information about a recipe using its ID.
 *      tags: [Recipe]
 *      parameters:
 *        - in: path
 *          name: id
 *          schema:
 *            type: string
 *          required: true
 *          description: Recipe ID (MongoDB ObjectId or Numeric)
 *      responses:
 *        200:
 *          description: Successfully retrieved the recipe.
 *        400:
 *          description: Invalid recipe ID or not found.
 */
router.get('/:id', getRecipeById)

router.post('/:userId', getRecipeByUser)

export default router
