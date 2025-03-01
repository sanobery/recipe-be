const express = require('express')
const router = express.Router()
const { login, logout, refresh, getCurrentUser } = require('../controllers/authController')
const loginLimiter = require('../middleware/loginLimiter')

router.route('/')
    .post(login)

router.route('/refresh')
    .get(refresh)

router.route('/user')
    .get(getCurrentUser)

router.route('/logout')
    .post(logout)

module.exports = router