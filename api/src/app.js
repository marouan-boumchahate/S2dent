import express from 'express'
import { errorMiddleware } from './middlewares/error.middleware.js'

import authRouter from './modules/auth/auth.routes.js'

import academyRouter from './modules/academy/academy.routes.js'
import professorRouter from './modules/professor/professor.routes.js'
import studentRouter from './modules/student/student.routes.js'
import addressRouter from './modules/address/address.routes.js'
import userRouter from './modules/user/user.route.js'
import departmentRouter from './modules/department/department.routes.js'
import credentialRouter from './modules/credential/credential.routes.js'

import academyIdentityRouter from './modules/identity/academy/academy.identity.routes.js'
import professorIdentityRouter from './modules/identity/professor/professor.identity.routes.js'
import studentIdentityRouter from './modules/identity/student/student.identity.routes.js'

import helperRouter from './modules/helper/helper.routes.js'


const app = express()
app.set('trust proxy', true); // fetching client IP from req.ip instead of the proxy's IP


app.use(express.json())

app.use('/api/auth', authRouter)

app.use('/api/academies', academyRouter)
app.use('/api/professors', professorRouter)
app.use('/api/students', studentRouter)
app.use('/api/users', userRouter)
app.use('/api/addresses', addressRouter)
app.use('/api/departments', departmentRouter)

app.use('/api/identity/academies', academyIdentityRouter)
app.use('/api/identity/professors', professorIdentityRouter)
app.use('/api/identity/students', studentIdentityRouter)

app.use('/api/credentials', credentialRouter)

app.use('/api/helper', helperRouter)

app.use(errorMiddleware)

export default app;