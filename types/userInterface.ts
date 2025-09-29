interface LoginRequestBody {
    email: string
    password: string
}

interface ProfileRequestBody {
    userId?: string
}

interface UserRequestBody extends LoginRequestBody, ProfileRequestBody {
    username: string
}

export { LoginRequestBody, UserRequestBody, ProfileRequestBody }
