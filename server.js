// server.js
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
const PORT = process.env.PORT || 3500

// Swagger docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs))

// dirname setup
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Middlewares
app.use(cors(corsOrigins))
app.use(cookieParser())
app.use(express.json())

// Static files
app.use(express.static(join(__dirname, 'public')))
app.use('/uploads', express.static(join(__dirname, 'uploads')))

// Routes
app.use('/auth', authRoute)
app.use('/recipe', recipeRoute)

// 404 fallback
app.all('*', (req, resp) => {
    resp.sendFile(join(__dirname, 'views', '404.html'))
})

// Database + Start server (only in local dev)
db().then(() => {
    if (process.env.VERCEL) {
        console.log('Running on Vercel – no need to call app.listen()')
    } else {
        app.listen(PORT, () => {
            console.log(`Server running locally on PORT ${PORT}`)
        })
    }
})

// ✅ Export app for Vercel
export default app
