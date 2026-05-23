import request from 'supertest';
import { strict as assert } from 'assert';
import app from '../../src/app.js';
import {
  cleanupFetchDB,
  teardownAcademySeed,
  seedAcademy,
  seedAdvisorProfessor,
  seedStudent,
  issueAcademyToken,
  TEST_EMAIL_SUFFIX,
} from './student.fetch.helpers.js';

const endpoint = '/api/students/:id';

let academyId;
let departmentId;
let academyToken;

describe('GET /api/students/:id', () => {
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

  it('returns a student profile for an academy request', async () => {
    const advisor = await seedAdvisorProfessor({
      academyId,
      departmentId,
      email: `advisor.byid.${Date.now()}${TEST_EMAIL_SUFFIX}`,
      fullName: 'Advisor By Id Student Fetch',
    });

    const seededStudent = await seedStudent({
      academyId,
      departmentId,
      advisorId: advisor.professor.id,
      email: `byid.${Date.now()}${TEST_EMAIL_SUFFIX}`,
      fullName: 'By Id Student Fetch',
    });

    const res = await request(app)
      .get(`/api/students/${seededStudent.student.id}`)
      .set('Authorization', `Bearer ${academyToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.message, 'Student retrieved successfully');

    const { student } = res.body.data;
    assert.equal(student.id, seededStudent.student.id);
    assert.equal(student.user_id, seededStudent.user.id);
    assert.equal(student.academy_id, academyId);
    assert.equal(student.student_number.startsWith('STU_'), true);
  });

  it('returns 404 for a non-existent student id', async () => {
    const res = await request(app)
      .get('/api/students/00000000-0000-0000-0000-000000000001')
      .set('Authorization', `Bearer ${academyToken}`);

    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
    assert.equal(res.body.code, 'STUDENT_NOT_FOUND');
  });

  it('returns 404 for a student that does not have an active identity', async () => {
    const seededStudent = await seedStudent({
      academyId,
      departmentId,
      email: `inactive.${Date.now()}${TEST_EMAIL_SUFFIX}`,
      fullName: 'Inactive Student Fetch',
      revoked: true,
    });

    const res = await request(app)
      .get(`/api/students/${seededStudent.student.id}`)
      .set('Authorization', `Bearer ${academyToken}`);

    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
    assert.equal(res.body.code, 'STUDENT_NOT_FOUND');
  });
});