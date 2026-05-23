import request from 'supertest';
import { strict as assert } from 'assert';
import app from '../../src/app.js';
import {
  TEST_EMAIL_SUFFIX,
  cleanupFetchDB,
  teardownAcademySeed,
  seedAcademy,
  seedProfessor,
  issueAcademyToken,
  makeProfessorToken,
  assertSummaryShape,
} from './professor.fetch.helpers.js';

const endpoint = '/api/professors';

let academyId;
let departmentId;
let academyToken;

describe('GET /api/professors', () => {
  before(async () => {
    const seeded = await seedAcademy();
    academyId = seeded.academy.id;
    departmentId = seeded.department.id;
    academyToken = issueAcademyToken(academyId);
  });

  beforeEach(async () => {
    await cleanupFetchDB();
  });

  afterEach(async () => {
    await cleanupFetchDB();
  });

  after(async () => {
    await teardownAcademySeed(academyId);
  });

  it('returns all professors for the academy with summary fields', async () => {
    const active = await seedProfessor({
      academyId,
      departmentId,
      email: `active.${Date.now()}${TEST_EMAIL_SUFFIX}`,
      fullName: 'Active Professor Fetch',
    });
    const revoked = await seedProfessor({
      academyId,
      departmentId,
      email: `revoked.${Date.now()}${TEST_EMAIL_SUFFIX}`,
      fullName: 'Revoked Professor Fetch',
      revoked: true,
    });

    const res = await request(app)
      .get(endpoint)
      .set('Authorization', `Bearer ${academyToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.message, 'All professors retrieved successfully');

    const { professors } = res.body.data;
    assert.ok(Array.isArray(professors));
    assert.equal(professors.length, 2);

    const summariesByName = Object.fromEntries(professors.map((summary) => [summary.name, summary]));
    assertSummaryShape(summariesByName['Active Professor Fetch']);
    assertSummaryShape(summariesByName['Revoked Professor Fetch']);
    assert.equal(summariesByName['Active Professor Fetch'].walletAddress, active.walletAddress);
    assert.equal(summariesByName['Revoked Professor Fetch'].walletAddress, revoked.walletAddress);
    assert.equal(summariesByName['Revoked Professor Fetch'].isRevoked, true);
  });

  it('returns 401 when the request has no token', async () => {
    const res = await request(app).get(endpoint);

    assert.equal(res.status, 401);
    assert.equal(res.body.error, 'Missing token');
  });

  it('returns 403 when a professor token calls the academy list route', async () => {
    const professor = await seedProfessor({
      academyId,
      departmentId,
      email: `professor.${Date.now()}${TEST_EMAIL_SUFFIX}`,
      fullName: 'Professor Role Fetch',
    });
    const professorToken = makeProfessorToken(professor);

    const res = await request(app)
      .get(endpoint)
      .set('Authorization', `Bearer ${professorToken}`);

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.equal(res.body.code, 'FORBIDDEN');
  });

  it('returns an empty array when the academy has no professors', async () => {
    const res = await request(app)
      .get(endpoint)
      .set('Authorization', `Bearer ${academyToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.professors));
    assert.deepEqual(res.body.data.professors, []);
  });
});