export const RESPONSE_MESSAGES = {
    INVALID_PARAMETER: 'Invalid/Missing parameters',
    RECIPE_FOUND: 'Successfully retrieved recipes',
    RECIPE_NOT_FOUND: 'Recipe not found.',
    INVALID_USER_ID: 'Invalid user id',
    USER_ALREADY_EXIST: 'User already exists !',
    INVALID_USER: 'Invalid user! Please Sign-Up',
    RECIPE_CREATED: 'Recipe Created successfully',
    USER_NOT_FOUND: 'User not found.',
    AUTH_RECIPE_DETAIL: 'Details include',
    INVALID_TOKEN: 'Invalid token.',
    TOKEN_REFRESHED: 'Token Refreshed',
    SUCCESSFUL_UPDATED: 'User updated successfully!',
    SIGNUP_SUCCESS: 'Sign-up successful! Redirecting to login page in 2 seconds...',
    LOGIN_SUCCESS: 'Login successful! Closing in 1 seconds...',
    SERVER_ERROR: 'Something went wrong, please try again later.',
    UNAUTHORIZED: 'Unauthorized user access.',
    BAD_REQUEST: 'Invalid request parameters.',
    FORBIDDEN: 'Access denied.',
    INVALID_CREDENTIALS: 'Invalid credentials. Please try again.',
    CORS: 'Not allowed by CORS',
    DB_URI_UNDEFINED: 'MONGODB_URI not defined',
    USERNAME_LENGTH: 'Username must be at least 4 characters long.',
    PASSWORD_LENGTH: 'Password must be between 8 to 16 characters long.',
    FIELD_REQUIRED: 'Recipe ID, User ID, and either Rate or Comment are required.',
    RATE_RANGE: 'Rate must be between 1 and 5.',
    CANNOT_RATE_OWN_RECIPE: 'You cannot rate your own recipe.',
    USER_RATED: 'User has already rated this recipe.',
    NUMERIC_PREPARATION_TIME: 'Preparation time should be numeric.',
    INVALID_JSON_FORMAT: 'Invalid JSON format in ingredients, steps, or preparationTime',
    DOC_API: 'Recipe Sharing API Documentation',
    DOC_API_MERN: 'API documentation for a Recipe Sharing (MERN stack application)',
}

type MessageType = 'connected' | 'error' | 'success' | 'recipe' | 'required' | 'include'
type ActionType = 'add' | 'update'

export const getMessage = (field: string, type: MessageType, action?: ActionType | string) => {
    switch (type) {
        case 'connected':
            return `${capitalize(field)} connected`
        case 'error':
            return `${field} connection failed`
        case 'success':
            if (action === 'add') {
                return `${capitalize(field)} added successfully`
            } else if (action === 'update') {
                return `${capitalize(field)} updated successfully`
            }
            return `${capitalize(field)} successfully`
        case 'recipe':
            return `No recipes found with the given ${field}.`
        case 'required':
            return `${capitalize(field)} is required`
        case 'include':
            return `${capitalize(field)} must include at least one ${action}`
        default:
            return `${capitalize(field)} is invalid`
    }
}

// Helper to capitalize first letter
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)
