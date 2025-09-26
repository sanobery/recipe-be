import swaggerJsDoc from 'swagger-jsdoc'
import swaggerUi from 'swagger-ui-express'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
dotenv.config()
import process from 'process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const URL = process.env.BACKEND_URL

const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Recipe Sharing API Documentation',
            version: '1.0.0',
            description: 'API documentation for a Reipe Sharing (MERN stack application)',
        },
        servers: [
            {
                url: URL, // Change this based on your backend URL
            },
        ],
    },
    apis: [join(__dirname, '../routes/authRoute.js'), join(__dirname, '../routes/recipeRoute.js')], //["server/routes/recipeRoute.js"], // Path to API route files
}

const swaggerDocs = swaggerJsDoc(swaggerOptions)

export { swaggerDocs, swaggerUi }
