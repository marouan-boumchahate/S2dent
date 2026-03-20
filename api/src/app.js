import express from 'express'
import { errorMiddleware } from './middlewares/error.middleware.js'

import academyRouter from './modules/academies/academies.routes.js'
import academyIdentityRouter from './modules/identity/academy/academy.identity.routes.js'

const app = express()
app.use(express.json())

app.use('/api/academies', academyRouter)
app.use('/api/identity/academies', academyIdentityRouter)

app.use(errorMiddleware)

export default app;