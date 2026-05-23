import esmock from 'esmock'
import request from 'supertest'
import { strict as assert } from 'assert'
import { ethers } from 'ethers'
import { signTokens } from '../../src/utils/jwt.js'

const endpoint = '/api/identity/academies'

const ACADEMY_WALLET = ethers.getAddress('0x1111111111111111111111111111111111111111')
const OTHER_WALLET = ethers.getAddress('0x2222222222222222222222222222222222222222')
const ACADEMY_ID = '22222222-2222-2222-2222-222222222222'

const BLOCKCHAIN_IDENTITY = {
  identity: {
    academyIdHash: '0xacademy-id-hash',
    publicKey: '0xacademy-public-key',
    name: 'Academy Identity',
    shortName: 'AI',
    academyType: 'university',
  },
  proofs: {
    legalName: 'Academy Identity Legal',
    registrationNumber: 'REG-ACADEMY',
    taxId: 'TAX-ACADEMY',
    billingEmail: 'billing@academy.test',
  },
  cert: {
    fingerprint: '0xacademy-fingerprint',
    certificate: 'CERT_PEM',
    chain: 'CHAIN_PEM',
    issuedAt: new Date('2024-01-01T00:00:00.000Z'),
    expiresAt: new Date('2025-01-01T00:00:00.000Z'),
  },
  status: {
    issuedAt: new Date('2024-01-02T00:00:00.000Z'),
    issuer: '0xissuer',
    isRevoked: false,
    revokedAt: null,
    revoker: null,
    revokeReason: null,
  },
}

const makeToken = (sub, role) => signTokens({ sub, role, rid: 'rid-1' })

const makeApp = async (blockchainImpl = {}, dbImpl = {}) => {
  const db = {
    query: async () => ({ rows: [] }),
    ...dbImpl,
  }

  const { default: app } = await esmock.strict(
    '../../src/app.js',
    import.meta.url,
    {},
    {
      '../../src/blockchain/identity/academy.identity.blockchain.js': {
        getAcademyIdentity: async () => BLOCKCHAIN_IDENTITY,
        issueAcademyIdentity: async () => ({ hash: '0xissue' }),
        revokeAcademyIdentity: async () => ({ hash: '0xrevoke' }),
        ...blockchainImpl,
      },
      '../../src/blockchain/identity/professor.identity.blockchain.js': {
        getProfessorIdentity: async () => null,
        issueProfessorIdentity: async () => ({ hash: '0xissue' }),
        revokeProfessorIdentity: async () => ({ hash: '0xrevoke' }),
      },
      '../../src/blockchain/identity/student.identity.blockchain.js': {
        getStudentIdentity: async () => null,
        issueStudentIdentity: async () => ({ hash: '0xissue' }),
        revokeStudentIdentity: async () => ({ hash: '0xrevoke' }),
      },
      '../../src/config/db.js': db,
    },
  )

  return app
}

describe('GET /api/identity/academies', () => {
  it('returns the caller academy identity on /me', async () => {
    const app = await makeApp()
    const token = makeToken(ACADEMY_WALLET, 'academy')

    const res = await request(app)
      .get(`${endpoint}/me`)
      .set('Authorization', `Bearer ${token.accessToken}`)

    assert.equal(res.status, 200)
    assert.equal(res.body.success, true)
    assert.equal(res.body.message, 'Academy identity retrieved successfully')
    assert.equal(res.body.data.wallet_address, ACADEMY_WALLET)
    assert.equal(res.body.data.identity.name, BLOCKCHAIN_IDENTITY.identity.name)
    assert.equal(res.body.data.identity.short_name, BLOCKCHAIN_IDENTITY.identity.shortName)
    assert.equal(res.body.data.identity.academy_type, BLOCKCHAIN_IDENTITY.identity.academyType)
    assert.equal(res.body.data.proofs.legal_name, BLOCKCHAIN_IDENTITY.proofs.legalName)
    assert.equal(res.body.data.status.is_revoked, BLOCKCHAIN_IDENTITY.status.isRevoked)
  })

  it('returns an academy identity for a specific address', async () => {
    const app = await makeApp()

    const res = await request(app)
      .get(`${endpoint}/${ACADEMY_WALLET}`)

    assert.equal(res.status, 200)
    assert.equal(res.body.success, true)
    assert.equal(res.body.data.wallet_address, ACADEMY_WALLET)
  })

  it('returns an academy identity by academy id', async () => {
    const app = await makeApp({}, {
      query: async (sql, params) => {
        if (sql.includes("FROM identities") && sql.includes("role = 'academy'")) {
          assert.equal(params[0], ACADEMY_ID)
          return { rows: [{ wallet_address: ACADEMY_WALLET }] }
        }

        return { rows: [] }
      },
    })

    const res = await request(app)
      .get(`${endpoint}/by-id/${ACADEMY_ID}`)

    assert.equal(res.status, 200)
    assert.equal(res.body.success, true)
    assert.equal(res.body.data.wallet_address, ACADEMY_WALLET)
  })
})