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
  makeStudentToken,
  assertProfessorShape,
} from './professor.fetch.helpers.js';

const endpoint = '/api/professors';

let academyId;
let departmentId;
let academyToken;

describe('GET /api/professors/:id', () => {
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

  it('returns a professor profile for an academy request', async () => {
    const professor = await seedProfessor({
      academyId,
      departmentId,
      email: `byid.${Date.now()}${TEST_EMAIL_SUFFIX}`,
      fullName: 'By Id Professor Fetch',
    });

    const res = await request(app)
      .get(`${endpoint}/${professor.professor.id}`)
      .set('Authorization', `Bearer ${academyToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.message, 'Professor retrieved successfully');

    const { professor: detail } = res.body.data;
    assertProfessorShape(detail);
    assert.equal(detail.id, professor.professor.id);
    assert.equal(detail.user_id, professor.user.id);
    assert.equal(detail.academy_id, academyId);
    assert.equal(detail.department_id, departmentId);
    assert.equal(detail.serial_number, professor.professor.employee_number);
  });

  it('returns 404 for a non-existent professor id', async () => {
    const res = await request(app)
      .get(`${endpoint}/00000000-0000-0000-0000-000000000001`)
      .set('Authorization', `Bearer ${academyToken}`);

    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
    assert.equal(res.body.code, 'PROFESSOR_NOT_FOUND');
  });

  it('returns 404 for a professor that does not have an active identity', async () => {
    const professor = await seedProfessor({
      academyId,
      departmentId,
      email: `noidentity.${Date.now()}${TEST_EMAIL_SUFFIX}`,
      fullName: 'No Identity Professor',
      withIdentity: false,
    });

    const res = await request(app)
      .get(`${endpoint}/${professor.professor.id}`)
      .set('Authorization', `Bearer ${academyToken}`);

    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
    assert.equal(res.body.code, 'PROFESSOR_NOT_FOUND');
  });

  it('returns 403 when a student token calls the academy route', async () => {
    const professor = await seedProfessor({
      academyId,
      departmentId,
      email: `student-guard.${Date.now()}${TEST_EMAIL_SUFFIX}`,
      fullName: 'Student Guard Professor',
    });
    const studentToken = makeStudentToken();

    const res = await request(app)
      .get(`${endpoint}/${professor.professor.id}`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.equal(res.body.code, 'FORBIDDEN');
  });
});