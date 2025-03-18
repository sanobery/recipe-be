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
import { swaggerDocs, swaggerUi } from './utils/swagger.js'
import authRoute from './routes/authRoute.js'
import recipeRoute from './routes/recipeRoute.js'

const app = express()
const PORT = process.env.PORT

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs))

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

app.use(cors(corsOrigins))
app.use(cookieParser())
app.use(express.json())

app.use(express.static(join(__dirname, 'public')))
app.use('/uploads', express.static(join(__dirname, 'uploads')))

app.use('/auth', authRoute)

/**
 * @swagger
 * /recipe:
 *  get:
 *      summary: All details of recipe route
 *      description: All details of recipe route
 *      responses:
 *               200:
 *                  description: request successfull
 *               400:
 *                  description: Error
 */
app.use('/recipe', recipeRoute)

app.all('*', (req, resp) => {
    resp.sendFile(join(__dirname, 'views', '404.html'))
})

db().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on PORT ${PORT}`)
    })
})
