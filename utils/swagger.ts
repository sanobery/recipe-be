/**
 * Swagger API Documentation
 * --------------------------
 * This file contains Swagger annotations for documenting the REST API endpoints.
 * It defines request/response schemas, authentication requirements, and example payloads.
 *
 * Usage:
 * - Used by Swagger UI to generate interactive API docs.
 * - Helps frontend developers and external consumers understand how to interact with the API.
 *
 * Notes:
 * - All multipart/form-data fields must be sent as strings.
 * - Fields like `ingredients`, `steps`, and `preparationTime` must be JSON-stringified.
 * - Ensure this file is registered in your Swagger setup (e.g., swagger-jsdoc or swagger-ui-express).
 */
import swaggerJsDoc, { SwaggerDefinition } from 'swagger-jsdoc'
import swaggerUi from 'swagger-ui-express'
import { join } from 'path'
import dotenv from 'dotenv'
import { RESPONSE_MESSAGES } from './constants'
dotenv.config()

const URL = process.env.BACKEND_URL

const swaggerOptions: swaggerJsDoc.Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: RESPONSE_MESSAGES.DOC_API,
            version: '1.0.0',
            description: RESPONSE_MESSAGES.DOC_API_MERN,
        },
        servers: [
            {
                url: URL,
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
    } as SwaggerDefinition,
    apis: [join(__dirname, '../routes/authRoute.ts'), join(__dirname, '../routes/recipeRoute.ts')],
}

const swaggerDocs = swaggerJsDoc(swaggerOptions)

export { swaggerDocs, swaggerUi }
