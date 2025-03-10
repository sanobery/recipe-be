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

// Routes
router.route('/')
    .get(getAllRecipe)
    .post(upload.single("image"), createNewRecipe)
    .patch(upload.single("image"), updateRecipe)
    .delete(deleteRecipe)

// Apply `verifyJwt` only for specific routes
router.post('/rate', verifyJwt, rateOrCommentRecipe)
router.post('/comment', verifyJwt, rateOrCommentRecipe)

router.get('/filter', getRecipesWithSpecificRate)
router.post('/search', getRecipeByIngredient)
router.post('/update', updateRecipe)

router.get('/:id', getRecipeById)
router.post('/:userId', getRecipeByUser)

export default router
