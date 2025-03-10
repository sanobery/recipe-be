import dotenv from 'dotenv'
import process from 'process'
dotenv.config()
import express from 'express'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import corsOrigins from './config/corsOrigins.js'
import db from './config/db.js'

const app = express()
const PORT = process.env.PORT

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

import authRoute from './routes/authRoute.js'
import recipeRoute from './routes/recipeRoute.js'

app.use(cors(corsOrigins))
app.use(cookieParser())
app.use(express.json())

app.use(express.static(join(__dirname, 'public')))
app.use('/uploads', express.static(join(__dirname, 'uploads')))

app.use('/auth', authRoute)
app.use('/recipe', recipeRoute)

app.all('*', (req, resp) => {
    resp.sendFile(join(__dirname, 'views', '404.html'))
})

db().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on PORT ${PORT}`)
    })
})
