const express = require('express')
const router = express.Router();
const path = require('path')


// router.route('/').get(home)

// router.route('/register').post(registration)


router.get('/', (req, resp) => {
    resp.sendFile(path.join(__dirname, '..', 'views', 'home.html'))
})


module.exports = router