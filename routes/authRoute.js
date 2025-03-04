const express = require('express')
const router = express.Router()
const { login, logout, refresh, getCurrentUser, createNewUser, updateUser } = require('../controllers/authController')
const loginLimiter = require('../middleware/loginLimiter')

router.route('/')
    .post(login)

router.route('/refresh')
    .get(refresh)

router.route('/profile')
    .get(getCurrentUser)

router.route('/updateUser')
    .post(updateUser)

router.route('/signup')
    .post(createNewUser)

router.route('/logout')
    .post(logout)

module.exports = router