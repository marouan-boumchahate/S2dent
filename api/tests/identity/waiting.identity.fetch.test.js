import crypto from 'crypto'
import request from 'supertest'
import { strict as assert } from 'assert'
import db from '../../src/config/db.js'
import app from '../../src/app.js'
import { signTokens } from '../../src/utils/jwt.js'

const endpoint = '/api/identities/waiting'
const TEST_EMAIL_SUFFIX = '@waiting-identity.test'

let academyId
let departmentId
let extraAcademyIds = []

const randomHex = (size) => crypto.randomBytes(size).toString('hex')
const buildWalletAddress = () => `0x${randomHex(20)}`
const buildPublicKey = () => `0x04${randomHex(64)}`
const buildTxHash = () => `0x${randomHex(32)}`

const makeToken = (payload) => signTokens(payload, undefined, true).accessToken

const getUserColumns = async () => {
  const { rows } = await db.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_name = 'users'`,
  )

  return new Set(rows.map((row) => row.column_name))
}

const seedUser = async ({ email, fullName }) => {
  const columns = await getUserColumns()

  const insertColumns = [
    'first_name',
    'middle_name',
    'last_name',
    'full_name',
    'date_of_birth',
    'gender',
    'national_id',
    'email',
    'phone',
    'photo_url',
  ]

  const insertValues = [
    fullName.split(' ')[0] ?? 'User',
    null,
    fullName.split(' ').slice(-1)[0] ?? 'Identity',
    fullName,
    '2000-01-01',
    'male',
    `NID-${randomHex(8)}`,
    email,
    '+905551234567',
    null,
  ]

  if (columns.has('nationality')) {
    insertColumns.push('nationality')
    insertValues.push('Turkish')
  }

  const placeholders = insertValues.map((_, index) => `$${index + 1}`).join(', ')

  const { rows: [user] } = await db.query(
    `INSERT INTO users (${insertColumns.join(', ')})
     VALUES (${placeholders})
     RETURNING id, email, full_name`,
    insertValues,
  )

  return user
}

const seedAcademyWithDepartment = async ({ email, name, shortName }) => {
  const { rows: [{ nextval }] } = await db.query(`SELECT nextval('academy_seq')`)
  const academyNumber = `ACD_${String(nextval).padStart(7, '0')}`

  const { rows: [academy] } = await db.query(
    `INSERT INTO academies (
       academy_number, name, short_name, type,
       email, legal_name, registration_number, tax_id
     )
     VALUES ($1, $2, $3, 'university', $4, $5, $6, $7)
     RETURNING id, email, name`,
    [
      academyNumber,
      name,
      shortName,
      email,
      `${name} Legal`,
      `REG-${nextval}`,
      `TAX-${nextval}`,
    ],
  )

  const { rows: [department] } = await db.query(
    `INSERT INTO departments (
       academy_id, code, name, faculty, total_years
     )
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [academy.id, `${shortName}D`, `${name} Department`, 'Engineering', 4],
  )

  return { academy, department }
}

const seedWaitingStudent = async ({ academyId: targetAcademyId, departmentId: targetDepartmentId, email, fullName, issueTxHash = null }) => {
  const user = await seedUser({ email, fullName })
  const studentNumber = `STU_${Date.now()}_${randomHex(4)}`
  const walletAddress = buildWalletAddress()

  await db.query(
    `INSERT INTO students (
       user_id, academy_id, department_id, student_number,
       enrollment_status, enrollment_date, expected_graduation_date, actual_graduation_date
     )
     VALUES ($1, $2, $3, $4, 'active', CURRENT_DATE, CURRENT_DATE + INTERVAL '4 years', NULL)`,
    [user.id, targetAcademyId, targetDepartmentId, studentNumber],
  )

  await db.query(
    `INSERT INTO identities (
       user_id, wallet_address, public_key, role,
       issue_identity_tx_hash, issued_at
     )
     VALUES ($1, $2, $3, 'student', $4, $5)`,
    [user.id, walletAddress, buildPublicKey(), issueTxHash, issueTxHash ? new Date() : null],
  )

  return { user, walletAddress, issueTxHash }
}

const seedWaitingProfessor = async ({ academyId: targetAcademyId, departmentId: targetDepartmentId, email, fullName, issueTxHash = null }) => {
  const user = await seedUser({ email, fullName })
  const employeeNumber = `EMP_${Date.now()}_${randomHex(4)}`
  const walletAddress = buildWalletAddress()

  await db.query(
    `INSERT INTO professors (
       user_id, academy_id, department_id,
       employee_number, title, rank, specialization,
       hire_date, employment_type, office_location, office_hours, bio
     )
     VALUES ($1, $2, $3, $4, 'Dr.', 'Prof', 'Computer Vision',
             '2020-01-01', 'full_time', 'Building A - 301', 'Mon 10:00-12:00', 'Waiting identity professor')`,
    [user.id, targetAcademyId, targetDepartmentId, employeeNumber],
  )

  await db.query(
    `INSERT INTO identities (
       user_id, wallet_address, public_key, role,
       issue_identity_tx_hash, issued_at
     )
     VALUES ($1, $2, $3, 'professor', $4, $5)`,
    [user.id, walletAddress, buildPublicKey(), issueTxHash, issueTxHash ? new Date() : null],
  )

  return { user, walletAddress, issueTxHash }
}

const cleanupWaitingDB = async () => {
  const emailLike = `%${TEST_EMAIL_SUFFIX}`

  await db.query(
    `DELETE FROM identities
     WHERE user_id IN (
       SELECT id FROM users WHERE email LIKE $1
     )`,
    [emailLike],
  )

  await db.query(
    `DELETE FROM professors
     WHERE user_id IN (
       SELECT id FROM users WHERE email LIKE $1
     )`,
    [emailLike],
  )

  await db.query(
    `DELETE FROM students
     WHERE user_id IN (
       SELECT id FROM users WHERE email LIKE $1
     )`,
    [emailLike],
  )

  await db.query(
    `DELETE FROM users
     WHERE email LIKE $1`,
    [emailLike],
  )
}

const teardownAcademySeed = async (targetAcademyId) => {
  await db.query(`DELETE FROM students WHERE academy_id = $1`, [targetAcademyId])
  await db.query(`DELETE FROM professors WHERE academy_id = $1`, [targetAcademyId])
  await db.query(`DELETE FROM departments WHERE academy_id = $1`, [targetAcademyId])
  await db.query(`DELETE FROM identities WHERE academy_id = $1`, [targetAcademyId])
  await db.query(`DELETE FROM academies WHERE id = $1`, [targetAcademyId])
}

describe('GET /api/identities/waiting', () => {
  before(async () => {
    const seeded = await seedAcademyWithDepartment({
      email: `academy.waiting.${Date.now()}${TEST_EMAIL_SUFFIX}`,
      name: 'Waiting Identities Academy',
      shortName: 'WIA',
    })

    academyId = seeded.academy.id
    departmentId = seeded.department.id
  })

  beforeEach(async () => {
    await cleanupWaitingDB()
    extraAcademyIds = []
  })

  afterEach(async () => {
    await cleanupWaitingDB()

    for (const targetAcademyId of extraAcademyIds) {
      await teardownAcademySeed(targetAcademyId)
    }

    extraAcademyIds = []
  })

  after(async () => {
    await cleanupWaitingDB()
    await teardownAcademySeed(academyId)
  })

  it('returns the merged waiting identities for the requesting academy in alphabetical order', async () => {
    const academyToken = makeToken({
      sub: buildWalletAddress(),
      role: 'academy',
      uid: academyId,
      rid: academyId,
    })

    const adamEmail = `adam.student.${Date.now()}${TEST_EMAIL_SUFFIX}`
    const zoeEmail = `zoe.prof.${Date.now()}${TEST_EMAIL_SUFFIX}`

    await seedWaitingProfessor({
      academyId,
      departmentId,
      email: zoeEmail,
      fullName: 'Zoe Professor',
    })

    await seedWaitingStudent({
      academyId,
      departmentId,
      email: adamEmail,
      fullName: 'Adam Student',
    })

    await seedWaitingStudent({
      academyId,
      departmentId,
      email: `issued.student.${Date.now()}${TEST_EMAIL_SUFFIX}`,
      fullName: 'Issued Student',
      issueTxHash: buildTxHash(),
    })

    const foreignAcademy = await seedAcademyWithDepartment({
      email: `foreign.waiting.${Date.now()}${TEST_EMAIL_SUFFIX}`,
      name: 'Foreign Waiting Academy',
      shortName: 'FWA',
    })

    extraAcademyIds.push(foreignAcademy.academy.id)

    await seedWaitingProfessor({
      academyId: foreignAcademy.academy.id,
      departmentId: foreignAcademy.department.id,
      email: `foreign.prof.${Date.now()}${TEST_EMAIL_SUFFIX}`,
      fullName: 'Aaron Foreign Professor',
    })

    await seedWaitingStudent({
      academyId: foreignAcademy.academy.id,
      departmentId: foreignAcademy.department.id,
      email: `foreign.student.${Date.now()}${TEST_EMAIL_SUFFIX}`,
      fullName: 'Aardvark Foreign Student',
    })

    const res = await request(app)
      .get(endpoint)
      .set('Authorization', `Bearer ${academyToken}`)

    assert.equal(res.status, 200)
    assert.equal(res.body.success, true)
    assert.equal(res.body.message, 'Waiting identities retrieved successfully')
    assert.ok(Array.isArray(res.body.data))
    assert.equal(res.body.data.length, 2)

    assert.deepEqual(
      res.body.data.map(({ full_name, role, email, status }) => ({ full_name, role, email, status })),
      [
        {
          full_name: 'Adam Student',
          role: 'student',
          email: adamEmail,
          status: 'waiting',
        },
        {
          full_name: 'Zoe Professor',
          role: 'professor',
          email: zoeEmail,
          status: 'waiting',
        },
      ],
    )
  })

  it('returns 401 when the request is made without a token', async () => {
    const res = await request(app).get(endpoint)

    assert.equal(res.status, 401)
    assert.equal(res.body.error, 'Missing token')
  })

  it('returns 403 when a student token accesses the academy-only route', async () => {
    const res = await request(app)
      .get(endpoint)
      .set('Authorization', `Bearer ${makeToken({
        sub: buildWalletAddress(),
        role: 'student',
        uid: buildWalletAddress(),
        rid: buildWalletAddress(),
      })}`)

    assert.equal(res.status, 403)
    assert.equal(res.body.success, false)
    assert.equal(res.body.code, 'FORBIDDEN')
  })

  it('returns 403 when a professor token accesses the academy-only route', async () => {
    const res = await request(app)
      .get(endpoint)
      .set('Authorization', `Bearer ${makeToken({
        sub: buildWalletAddress(),
        role: 'professor',
        uid: buildWalletAddress(),
        rid: buildWalletAddress(),
      })}`)

    assert.equal(res.status, 403)
    assert.equal(res.body.success, false)
    assert.equal(res.body.code, 'FORBIDDEN')
  })

  it('returns an empty array when every academy identity already has a transaction hash', async () => {
    const academyToken = makeToken({
      sub: buildWalletAddress(),
      role: 'academy',
      uid: academyId,
      rid: academyId,
    })

    const student = await seedWaitingStudent({
      academyId,
      departmentId,
      email: `empty.student.${Date.now()}${TEST_EMAIL_SUFFIX}`,
      fullName: 'Empty Student',
      issueTxHash: buildTxHash(),
    })

    const professor = await seedWaitingProfessor({
      academyId,
      departmentId,
      email: `empty.prof.${Date.now()}${TEST_EMAIL_SUFFIX}`,
      fullName: 'Empty Professor',
      issueTxHash: buildTxHash(),
    })

    assert.ok(student.issueTxHash)
    assert.ok(professor.issueTxHash)

    const res = await request(app)
      .get(endpoint)
      .set('Authorization', `Bearer ${academyToken}`)

    assert.equal(res.status, 200)
    assert.equal(res.body.success, true)
    assert.equal(res.body.message, 'Waiting identities retrieved successfully')
    assert.deepEqual(res.body.data, [])
  })
})