require('dotenv').config()
const express = require('express')
const app = express()
const path = require('path')
const { logger } = require('./middleware/logger')
const PORT = process.env.PORT || 3500
const cors = require('cors')
const cookieParser = require('cookie-parser')
const corsOrigins = require('./config/corsOrigins')
const db = require('./config/db')

app.use(logger)
app.use(cors(corsOrigins))
app.use(cookieParser())
app.use(express.json())

app.use('/', express.static(path.join(__dirname, '/public/')))
app.use('/uploads', express.static('uploads'));
app.use('/', require('./routes/route.js'))
app.use('/auth', require('./routes/authRoute.js'))
app.use('/user', require('./routes/userRoute.js'))
app.use('/recipe', require('./routes/recipeRoute.js'))

app.all('*', (req, resp) => {
    resp.sendFile(path.join(__dirname, 'views', '404.html'))
})

db().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on PORT ${PORT}`)
    })
})
