import { Router } from 'express'
const router = Router()
import { login, logout, refresh, getCurrentUser, createNewUser, updateUser } from '../controllers/authController.js'

router.route('/')
    .post(login)

router.route('/refresh')
    .post(refresh)

router.route('/profile')
    .get(getCurrentUser)

router.route('/updateUser')
    .post(updateUser)

router.route('/signup')
    .post(createNewUser)

router.route('/logout')
    .post(logout)

export default router