import { Router } from 'express'
const router = Router()
import { login, logout, refresh, getCurrentUser, createNewUser, updateUser } from '../controllers/authController.js'
import verifyJwt from '../middleware/verifyJwt.js';

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: API for managing users
 */

/**
 * @swagger
 * /auth:
 *   post:
 *     summary: Authenticate user login
 *     tags: [Auth]
 *     description: Validate user credentials and return a token if successful.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "user@example.com"
 *                 description: User's email address
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "123456"
 *                 description: User's password
 *     responses:
 *       200:
 *         description: Login Successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Login successful"
 *                 token:
 *                   type: string
 *                   example: "eyJhbGciOiJIUzI1NiIsIn..."
 *       400:
 *         description: Invalid User
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Invalid email or password"
 */
router.route('/').post(login);


router.route('/refresh')
    .post(refresh)

/**
 * @swagger
 * /auth/profile:
 *  get:
 *      summary: Retrieve user details
 *      description: Fetches detailed information about a user using its ID.
 *      tags: [Auth]
 *      parameters:
 *        - in: cookie
 *          name: token
 *          schema:
 *            type: string 
 *          required: true
 *          description: Authentication token stored in cookies
 *      responses:
 *        200:
 *          description: Existing User Details.
 *        400:
 *          description: Invalid token id.
 */
router.route('/profile')
    .get(getCurrentUser)

router.route('/updateUser')
    .post(updateUser)

router.route('/signup')
    .post(createNewUser)

router.route('/logout')
    .post(logout)

export default router