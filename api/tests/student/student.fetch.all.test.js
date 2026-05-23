import request from 'supertest';
import { strict as assert } from 'assert';
import app from '../../src/app.js';
import {
  cleanupFetchDB,
  teardownAcademySeed,
  seedAcademy,
  seedStudent,
  issueAcademyToken,
  TEST_EMAIL_SUFFIX,
  makeStudentToken,
} from './student.fetch.helpers.js';

const endpoint = '/api/students';

let academyId;
let departmentId;
let academyToken;

describe('GET /api/students', () => {
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

  it('returns all students for the academy with summary fields', async () => {
    const active = await seedStudent({
      academyId,
      departmentId,
      email: `active.${Date.now()}${TEST_EMAIL_SUFFIX}`,
      fullName: 'Active Student Fetch',
    });
    const revoked = await seedStudent({
      academyId,
      departmentId,
      email: `revoked.${Date.now()}${TEST_EMAIL_SUFFIX}`,
      fullName: 'Revoked Student Fetch',
      revoked: true,
    });

    const res = await request(app)
      .get(endpoint)
      .set('Authorization', `Bearer ${academyToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.message, 'All students retrieved successfully');

    const { students } = res.body.data;
    assert.ok(Array.isArray(students));
    assert.equal(students.length, 2);

    const summariesByName = Object.fromEntries(students.map((summary) => [summary.name, summary]));
    assert.equal(summariesByName['Active Student Fetch'].wallet_address.length, 42);
    assert.equal(summariesByName['Active Student Fetch'].serial_number.startsWith('STU_'), true);
    assert.equal(summariesByName['Active Student Fetch'].is_revoked, false);
    assert.equal(summariesByName['Revoked Student Fetch'].is_revoked, true);
    assert.equal(summariesByName['Revoked Student Fetch'].email, revoked.user.email);
    assert.equal(summariesByName['Active Student Fetch'].email, active.user.email);
  });

  it('returns 403 when a student token calls the academy list route', async () => {
    const seededStudent = await seedStudent({
      academyId,
      departmentId,
      email: `guard.${Date.now()}${TEST_EMAIL_SUFFIX}`,
      fullName: 'Guard Student Fetch',
    });
    const studentToken = makeStudentToken({ userId: seededStudent.user.id, studentId: seededStudent.student.id });

    const res = await request(app)
      .get(endpoint)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.equal(res.body.code, 'FORBIDDEN');
  });
});