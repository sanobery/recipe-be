import dotenv from 'dotenv'
import process from 'process'
import express from 'express'
import { join } from 'path'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import corsOrigins from './config/corsOrigins'
import { connectDB } from './config/db'
import { swaggerDocs, swaggerUi } from './utils/swagger'
import authRoute from './routes/authRoute'
import recipeRoute from './routes/recipeRoute'
import logger from './middleware/logger'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3500

// Swagger docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs))

// // Middlewares
app.use(cors(corsOrigins))
app.use(cookieParser())
app.use(express.json())

// Static files
app.use(express.static(join(__dirname, 'public')))
app.use('/uploads', express.static(join(__dirname, 'uploads')))

// Routes
app.use('/auth', authRoute)
app.use('/recipe', recipeRoute)

// // 404 fallback
app.all('*', (req, resp) => {
    resp.sendFile(join(__dirname, 'views', '404.html'))
})

// Database + Start server (only in local dev)
connectDB().then(() => {
    app.listen(PORT, () => logger.info(`Server running on port ${PORT}`))
})

// ✅ Export app for Vercel
export default app
