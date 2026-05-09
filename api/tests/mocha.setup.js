// tests/mocha.setup.js
import './env.setup.js'
import sinon from 'sinon'
import { ensureDatabaseExists } from '../src/config/db.js'
import { runMigrations } from '../src/db/migrate.js'

before(async () => {
  await ensureDatabaseExists()
  await runMigrations()
  sinon.stub(console, 'error')
})

after(() => sinon.restore())