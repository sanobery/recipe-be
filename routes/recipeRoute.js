const express = require('express');
const router = express.Router();
const {
    getAllRecipe,
    createNewRecipe,
    updateRecipe,
    deleteRecipe,
    getRecipeById,
    getRecipeByUser,
    getRecipeByIngredient
} = require('../controllers/recipeController');
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { rateOrCommentRecipe, getRecipesWithSpecificRate } = require('../controllers/rateCommentController');
const verifyJwt = require('../middleware/verifyJwt'); // Import JWT middleware

// Ensure "uploads/" folder exists
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure Multer for file storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir); // Save files inside /uploads
    },
    filename: (req, file, cb) => {
        cb(null, `${file.originalname}`); // Unique filename
    },
});

// File filter to allow only PNG, JPEG, JPG formats
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true); // Accept file
    } else {
        cb(new Error('Only PNG, JPEG, and JPG files are allowed!'), false);
    }
};

const upload = multer({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
    fileFilter: fileFilter,
});

// Routes
router.route('/')
    .get(getAllRecipe)
    .post(upload.single("image"), createNewRecipe)
    .patch(updateRecipe)
    .delete(deleteRecipe);

// Apply `verifyJwt` only for specific routes
router.post('/rate', verifyJwt, rateOrCommentRecipe);
router.get('/filter', getRecipesWithSpecificRate);

router.post('/search', getRecipeByIngredient);
router.post('/comment', verifyJwt, rateOrCommentRecipe);
router.post('/update', updateRecipe);

router.get('/:id', getRecipeById);
router.post('/:userId', getRecipeByUser);

module.exports = router;
