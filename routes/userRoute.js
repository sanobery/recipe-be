const express = require('express')
const router = express.Router();
const { getAllUsers, createNewUser, updateUser, deleteUser, checkUser } = require('../controllers/userController');

router.route('/')
    .get(getAllUsers)
    .post(createNewUser)
    .patch(updateUser)
    .delete(deleteUser)


router.route('/login')
    .post(checkUser)

module.exports = router