import esmock from 'esmock'
import request from 'supertest'
import { strict as assert } from 'assert'
import { ethers } from 'ethers'
import { signTokens } from '../../src/utils/jwt.js'

const endpoint = '/api/identity/students'

const STUDENT_WALLET = ethers.getAddress('0x5555555555555555555555555555555555555555')
const ACADEMY_WALLET = ethers.getAddress('0x6666666666666666666666666666666666666666')
const PROFESSOR_WALLET = ethers.getAddress('0x7777777777777777777777777777777777777777')
const STUDENT_USER_ID = '11111111-1111-1111-1111-111111111111'

const BLOCKCHAIN_IDENTITY = {
  identity: {
    studentIdHash: '0xstudent-id-hash',
    nationalIdHash: '0xnational-id-hash',
    publicKey: '0xstudent-public-key',
    fullName: 'Student Identity',
    nationality: 'Turkish',
    academyName: 'Student Academy',
    department: 'Computer Science',
    country: 'Turkey',
    enrollmentDate: new Date('2022-09-15T00:00:00.000Z'),
  },
  status: {
    issuedAt: new Date('2022-09-16T00:00:00.000Z'),
    issuer: '0xissuer',
    isRevoked: false,
    revokedAt: null,
    revoker: null,
  },
}

const makeToken = (sub, role) => signTokens({ sub, role, rid: 'rid-1' })

const makeApp = async (blockchainImpl = {}, dbImpl = {}) => {
  const mocks = {
    '../../src/blockchain/identity/student.identity.blockchain.js': {
      getStudentIdentity: async () => BLOCKCHAIN_IDENTITY,
      issueStudentIdentity: async () => ({ hash: '0xissue' }),
      revokeStudentIdentity: async () => ({ hash: '0xrevoke' }),
      ...blockchainImpl,
    },
    '../../src/blockchain/identity/academy.identity.blockchain.js': {
      getAcademyIdentity: async () => null,
      issueAcademyIdentity: async () => ({ hash: '0xissue' }),
      revokeAcademyIdentity: async () => ({ hash: '0xrevoke' }),
    },
    '../../src/blockchain/identity/professor.identity.blockchain.js': {
      getProfessorIdentity: async () => null,
      issueProfessorIdentity: async () => ({ hash: '0xissue' }),
      revokeProfessorIdentity: async () => ({ hash: '0xrevoke' }),
    },
  }

  if (Object.keys(dbImpl).length > 0) {
    mocks['../../src/config/db.js'] = {
      query: async () => ({ rows: [] }),
      ...dbImpl,
    }
  }

  const { default: app } = await esmock.strict(
    '../../src/app.js',
    import.meta.url,
    {},
    mocks,
  )

  return app
}

describe('GET /api/identity/students', () => {
  it('returns the caller student identity on /me', async () => {
    const app = await makeApp()
    const token = makeToken(STUDENT_WALLET, 'student')

    const res = await request(app)
      .get(`${endpoint}/me`)
      .set('Authorization', `Bearer ${token.accessToken}`)

    assert.equal(res.status, 200)
    assert.equal(res.body.success, true)
    assert.equal(res.body.message, 'Student identity retrieved successfully')
    assert.equal(res.body.data.wallet_address, STUDENT_WALLET)
    assert.equal(res.body.data.identity.full_name, BLOCKCHAIN_IDENTITY.identity.fullName)
    assert.equal(res.body.data.identity.nationality, BLOCKCHAIN_IDENTITY.identity.nationality)
    assert.equal(res.body.data.status.is_revoked, BLOCKCHAIN_IDENTITY.status.isRevoked)
  })

  it('returns a student identity for an academy caller', async () => {
    const app = await makeApp()

    const res = await request(app)
      .get(`${endpoint}/${STUDENT_WALLET}`)

    assert.equal(res.status, 200)
    assert.equal(res.body.success, true)
    assert.equal(res.body.data.wallet_address, STUDENT_WALLET)
  })

  it('returns a student identity by user id', async () => {
    const app = await makeApp({}, {
      query: async (sql, params) => {
        if (sql.includes("FROM identities") && sql.includes("role = 'student'")) {
          assert.equal(params[0], STUDENT_USER_ID)
          return { rows: [{ wallet_address: STUDENT_WALLET }] }
        }

        return { rows: [] }
      },
    })
    const token = makeToken(ACADEMY_WALLET, 'academy')

    const res = await request(app)
      .get(`${endpoint}/by-user-id/${STUDENT_USER_ID}`)
      .set('Authorization', `Bearer ${token.accessToken}`)

    assert.equal(res.status, 200)
    assert.equal(res.body.success, true)
    assert.equal(res.body.data.wallet_address, STUDENT_WALLET)
  })
})