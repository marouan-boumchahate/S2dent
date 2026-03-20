import express from 'express'
import { errorMiddleware } from './middlewares/error.middleware.js'

import academyRouter from './modules/academy/academy.routes.js'
import academyIdentityRouter from './modules/identity/academy/academy.identity.routes.js'

import professorRouter from './modules/professor/professor.routes.js'
import professorIdentityRouter from './modules/identity/professor/professor.identity.routes.js'

const app = express()
app.use(express.json())

app.use('/api/academies', academyRouter)
app.use('/api/identity/academies', academyIdentityRouter)

app.use('/api/professors', professorRouter)
app.use('/api/identity/professors', professorIdentityRouter)

app.use(errorMiddleware)

export default app;