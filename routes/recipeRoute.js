import { Router } from 'express'
const router = Router()
import { getAllRecipe, createNewRecipe, updateRecipe, deleteRecipe, getRecipeById, getRecipeByUser, getRecipeByIngredient } from '../controllers/recipeController.js'
import multer, { diskStorage } from "multer"
import { fileURLToPath } from 'url'
import { dirname, join } from "path"
import { existsSync, mkdirSync } from "fs"
import { rateOrCommentRecipe, getRecipesWithSpecificRate } from '../controllers/rateCommentController.js'
import verifyJwt from '../middleware/verifyJwt.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const uploadDir = join(__dirname, "../uploads")
if (!existsSync(uploadDir)) {
    mkdirSync(uploadDir, { recursive: true })
}

const storage = diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir)
    },
    filename: (req, file, cb) => {
        cb(null, `${file.originalname}`)
    },
})

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true)
    } else {
        cb(new Error('Only PNG, JPEG, and JPG files are allowed!'), false)
    }
}

const upload = multer({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: fileFilter,
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
 *       400:
 *         description: Bad request
 */
router.route('/')
    .get(getAllRecipe)
    .post(upload.single("image"), createNewRecipe)
    .patch(upload.single("image"), updateRecipe)
    .delete(deleteRecipe)

// Apply `verifyJwt` only for specific routes
router.post('/rate', verifyJwt, rateOrCommentRecipe)
router.post('/comment', verifyJwt, rateOrCommentRecipe)

/**
 * @swagger
 * /recipe/filter:
 *  get:
 *      summary: Filter specific recipes
 *      description: Filter a recipe based on specific rate / preparation time
 *      tags: [Recipe]
 *      responses:
 *          200: 
 *              description:filtered recipes
 *          400:
 *              desription: No recipes found 
 *      
 */
router.get('/filter', getRecipesWithSpecificRate)
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
router.get('/:id', getRecipeById);



router.post('/:userId', getRecipeByUser)

export default router
