import { Router } from 'express'
const router = Router()
import {
    login,
    logout,
    refresh,
    getCurrentUser,
    createNewUser,
    updateUser,
} from '../controllers/authController.js'

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
 *                 example: "user@gmail.com"
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
router.route('/').post(login)

router.route('/refresh').post(refresh)

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
router.route('/profile').get(getCurrentUser)

/**
 * @swagger
 * /auth/updateUser:
 *   post:
 *     summary: Update user information.
 *     description: Update an existing user. The password is encrypted on the client-side and then decrypted & hashed on the server before storing.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - username
 *               - email
 *               - password
 *             properties:
 *               userId:
 *                 type: string
 *                 example: "67c1a0520ace1148c3d5ccd3"
 *                 description: UserId
 *               username:
 *                 type: string
 *                 example: "exampleUser"
 *                 description: User's name
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "user@gmail.com"
 *                 description: User's email address
 *               password:
 *                 type: string
 *                 example: "U2FsdGVkX1+e8kW1Q0...=="  # Encrypted format
 *                 description: Encrypted password using crypto-js (AES)
 *     responses:
 *       200:
 *         description: User Updated Successfully
 *       400:
 *         description: Invalid request or missing fields.
 */
router.route('/updateUser').post(updateUser)

/**
 * @swagger
 * /auth/signup:
 *   post:
 *     summary: Create a new user
 *     description: Registers a new user. The password is encrypted on the client-side and then decrypted & hashed on the server before storing.
 *     tags: [Auth]
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
 *               username:
 *                 type: string
 *                 example: "exampleUser"
 *                 description: User's name
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "user@gmail.com"
 *                 description: User's email address
 *               password:
 *                 type: string
 *                 example: "U2FsdGVkX1+e8kW1Q0...=="  # Encrypted format
 *                 description: Encrypted password using crypto-js (AES)
 *     responses:
 *       200:
 *         description: Sign-up successful! Redirecting to login page in 2 seconds...
 *       400:
 *         description: Invalid request or missing fields.
 */

router.route('/signup').post(createNewUser)

router.route('/logout').post(logout)

export default router
