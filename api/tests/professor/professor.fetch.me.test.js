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
  assertProfessorShape,
} from './professor.fetch.helpers.js';

const endpoint = '/api/professors';

let academyId;
let departmentId;
let academyToken;

describe('GET /api/professors/me', () => {
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

  it('returns the authenticated professor profile', async () => {
    const professor = await seedProfessor({
      academyId,
      departmentId,
      email: `me.${Date.now()}${TEST_EMAIL_SUFFIX}`,
      fullName: 'Me Professor Fetch',
    });
    const professorToken = makeProfessorToken(professor);

    const res = await request(app)
      .get(`${endpoint}/me`)
      .set('Authorization', `Bearer ${professorToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.message, 'Professor profile retrieved successfully');

    const { professor: detail } = res.body.data;
    assertProfessorShape(detail);
    assert.equal(detail.id, professor.professor.id);
    assert.equal(detail.user_id, professor.user.id);
    assert.equal(detail.academy_id, academyId);
    assert.equal(detail.department_id, departmentId);
    assert.equal(detail.serial_number, professor.professor.employee_number);
  });

  it('returns 401 when the request has no token', async () => {
    const res = await request(app).get(`${endpoint}/me`);

    assert.equal(res.status, 401);
    assert.equal(res.body.error, 'Missing token');
  });

  it('returns 403 when an academy token calls the professor profile route', async () => {
    const res = await request(app)
      .get(`${endpoint}/me`)
      .set('Authorization', `Bearer ${academyToken}`);

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.equal(res.body.code, 'FORBIDDEN');
  });

  it('returns 404 when the professor identity is missing or revoked', async () => {
    const missingIdentity = await seedProfessor({
      academyId,
      departmentId,
      email: `missing.${Date.now()}${TEST_EMAIL_SUFFIX}`,
      fullName: 'Missing Identity Professor',
      withIdentity: false,
    });
    const missingToken = makeProfessorToken(missingIdentity);

    const missingRes = await request(app)
      .get(`${endpoint}/me`)
      .set('Authorization', `Bearer ${missingToken}`);

    assert.equal(missingRes.status, 404);
    assert.equal(missingRes.body.success, false);
    assert.equal(missingRes.body.code, 'PROFESSOR_NOT_FOUND');

    const revoked = await seedProfessor({
      academyId,
      departmentId,
      email: `revoked-me.${Date.now()}${TEST_EMAIL_SUFFIX}`,
      fullName: 'Revoked Me Professor',
      revoked: true,
    });
    const revokedToken = makeProfessorToken(revoked);

    const revokedRes = await request(app)
      .get(`${endpoint}/me`)
      .set('Authorization', `Bearer ${revokedToken}`);

    assert.equal(revokedRes.status, 404);
    assert.equal(revokedRes.body.success, false);
    assert.equal(revokedRes.body.code, 'PROFESSOR_NOT_FOUND');
  });
});