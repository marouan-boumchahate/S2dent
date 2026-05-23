import esmock from 'esmock'
import request from 'supertest'
import { strict as assert } from 'assert'
import { ethers } from 'ethers'
import { signTokens } from '../../src/utils/jwt.js'

const endpoint = '/api/identity/professors'

const PROFESSOR_WALLET = ethers.getAddress('0x3333333333333333333333333333333333333333')
const ACADEMY_WALLET = ethers.getAddress('0x4444444444444444444444444444444444444444')
const PROFESSOR_USER_ID = '33333333-3333-3333-3333-333333333333'

const BLOCKCHAIN_IDENTITY = {
  identity: {
    employeeIdHash: '0xemployee-hash',
    nationalIdHash: '0xnational-id-hash',
    publicKey: '0xprofessor-public-key',
    fullName: 'Professor Identity',
    rank: 'prof',
    employmentType: 'full_time',
    hireDate: new Date('2018-09-01T00:00:00.000Z'),
  },
  status: {
    issuedAt: new Date('2018-09-02T00:00:00.000Z'),
    issuer: '0xissuer',
    isRevoked: false,
    revokedAt: null,
    revoker: null,
  },
}

const makeToken = (sub, role) => signTokens({ sub, role, rid: 'rid-1' })

const makeApp = async (blockchainImpl = {}, dbImpl = {}) => {
  const mocks = {
    '../../src/blockchain/identity/professor.identity.blockchain.js': {
      getProfessorIdentity: async () => BLOCKCHAIN_IDENTITY,
      issueProfessorIdentity: async () => ({ hash: '0xissue' }),
      revokeProfessorIdentity: async () => ({ hash: '0xrevoke' }),
      ...blockchainImpl,
    },
    '../../src/blockchain/identity/academy.identity.blockchain.js': {
      getAcademyIdentity: async () => null,
      issueAcademyIdentity: async () => ({ hash: '0xissue' }),
      revokeAcademyIdentity: async () => ({ hash: '0xrevoke' }),
    },
    '../../src/blockchain/identity/student.identity.blockchain.js': {
      getStudentIdentity: async () => null,
      issueStudentIdentity: async () => ({ hash: '0xissue' }),
      revokeStudentIdentity: async () => ({ hash: '0xrevoke' }),
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

describe('GET /api/identity/professors', () => {
  it('returns the caller professor identity on /me', async () => {
    const app = await makeApp()
    const token = makeToken(PROFESSOR_WALLET, 'professor')

    const res = await request(app)
      .get(`${endpoint}/me`)
      .set('Authorization', `Bearer ${token.accessToken}`)

    assert.equal(res.status, 200)
    assert.equal(res.body.success, true)
    assert.equal(res.body.message, 'Professor identity retrieved successfully')
    assert.equal(res.body.data.wallet_address, PROFESSOR_WALLET)
    assert.equal(res.body.data.identity.full_name, BLOCKCHAIN_IDENTITY.identity.fullName)
    assert.equal(res.body.data.identity.employment_type, BLOCKCHAIN_IDENTITY.identity.employmentType)
    assert.equal(res.body.data.status.is_revoked, BLOCKCHAIN_IDENTITY.status.isRevoked)
  })

  it('returns a professor identity for a specific address', async () => {
    const app = await makeApp()

    const res = await request(app)
      .get(`${endpoint}/${PROFESSOR_WALLET}`)

    assert.equal(res.status, 200)
    assert.equal(res.body.success, true)
    assert.equal(res.body.data.wallet_address, PROFESSOR_WALLET)
  })

  it('returns a professor identity by user id', async () => {
    const app = await makeApp({}, {
      query: async (sql, params) => {
        if (sql.includes("FROM identities") && sql.includes("role = 'professor'")) {
          assert.equal(params[0], PROFESSOR_USER_ID)
          return { rows: [{ wallet_address: PROFESSOR_WALLET }] }
        }

        return { rows: [] }
      },
    })
    const token = makeToken(ACADEMY_WALLET, 'academy')

    const res = await request(app)
      .get(`${endpoint}/by-id/${PROFESSOR_USER_ID}`)
      .set('Authorization', `Bearer ${token.accessToken}`)

    assert.equal(res.status, 200)
    assert.equal(res.body.success, true)
    assert.equal(res.body.data.wallet_address, PROFESSOR_WALLET)
  })
})