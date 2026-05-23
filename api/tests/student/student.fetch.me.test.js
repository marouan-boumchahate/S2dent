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
  makeStudentToken,
  TEST_EMAIL_SUFFIX,
} from './student.fetch.helpers.js';

const endpoint = '/api/students/me';

let academyId;
let departmentId;
let academyToken;

describe('GET /api/students/me', () => {
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

  it('returns the authenticated student profile', async () => {
    const advisor = await seedAdvisorProfessor({
      academyId,
      departmentId,
      email: `advisor.${Date.now()}${TEST_EMAIL_SUFFIX}`,
      fullName: 'Advisor Student Fetch',
    });

    const seededStudent = await seedStudent({
      academyId,
      departmentId,
      advisorId: advisor.professor.id,
      email: `me.${Date.now()}${TEST_EMAIL_SUFFIX}`,
      fullName: 'Me Student Fetch',
    });
    const studentToken = makeStudentToken({ userId: seededStudent.user.id, studentId: seededStudent.student.id });

    const res = await request(app)
      .get(endpoint)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.message, 'Student profile retrieved successfully');

    const { student } = res.body.data;
    assert.equal(student.id, seededStudent.student.id);
    assert.equal(student.user_id, seededStudent.user.id);
    assert.equal(student.academy_id, academyId);
    assert.equal(student.student_number.startsWith('STU_'), true);
    assert.equal(student.enrollment_status, 'active');
  });

  it('returns 403 when an academy token calls the student profile route', async () => {
    const res = await request(app)
      .get(endpoint)
      .set('Authorization', `Bearer ${academyToken}`);

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.equal(res.body.code, 'FORBIDDEN');
  });
});