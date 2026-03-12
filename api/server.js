import express from 'express'

const app = express()
const port = 3000

app.get('/', (req, res) => {
  res.send('Hello S2dent!')
})

app.listen(port, () => {
  console.log(`App is listening on port ${port} : http://localhost:${port}`)
})
