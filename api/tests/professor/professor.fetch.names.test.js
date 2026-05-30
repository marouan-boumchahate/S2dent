import request from 'supertest';
import { strict as assert } from 'assert';
import db from '../../src/config/db.js';
import app from '../../src/app.js';
import {
  TEST_EMAIL_SUFFIX,
  buildPublicKey,
  buildWalletAddress,
  cleanupFetchDB,
  issueAcademyToken,
  makeProfessorToken,
  makeStudentToken,
  seedAcademy,
  seedUser,
  teardownAcademySeed,
} from './professor.fetch.helpers.js';

const endpoint = '/api/professors/names';

let academyId;
let departmentId;
let academyToken;
let extraAcademyIds = [];

const seedAcademyWithCustomEmail = async ({ email, name, shortName }) => {
  const { rows: [{ nextval }] } = await db.query(`SELECT nextval('academy_seq')`);
  const academyNumber = `ACD_${String(nextval).padStart(7, '0')}`;

  const { rows: [academy] } = await db.query(
    `INSERT INTO academies (
       academy_number, name, short_name, type,
       email, legal_name, registration_number, tax_id
     )
     VALUES ($1, $2, $3, 'university', $4, $5, $6, $7)
     RETURNING id, name`,
    [
      academyNumber,
      name,
      shortName,
      email,
      `${name} Legal`,
      `REG-${nextval}`,
      `TAX-${nextval}`,
    ],
  );

  await db.query(
    `INSERT INTO identities (academy_id, wallet_address, public_key, role, issued_at)
     VALUES ($1, $2, $3, 'academy', NOW())`,
    [academy.id, buildWalletAddress(), buildPublicKey()],
  );

  const { rows: [department] } = await db.query(
    `INSERT INTO departments (academy_id, code, name, faculty, total_years)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [academy.id, `${shortName}D`, `${name} Department`, 'Engineering', 4],
  );

  return { academy, department };
};

const seedProfessorWithStatus = async ({
  academyId: targetAcademyId,
  departmentId: targetDepartmentId,
  email,
  fullName,
  status = 'issued',
}) => {
  const user = await seedUser({
    email,
    fullName,
    firstName: fullName.split(' ')[0] ?? 'Professor',
    lastName: fullName.split(' ').slice(-1)[0] ?? 'Fetch',
  });

  const employeeNumber = `EMP_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;

  const { rows: [professor] } = await db.query(
    `INSERT INTO professors (
       user_id, academy_id, department_id,
       employee_number, title, rank, specialization,
       hire_date, employment_type, office_location, office_hours, bio
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING id, user_id, academy_id, department_id, employee_number`,
    [
      user.id,
      targetAcademyId,
      targetDepartmentId,
      employeeNumber,
      'Dr.',
      'Prof',
      'Computer Vision',
      '2020-01-01',
      'full_time',
      'Building A - 301',
      'Mon 10:00-12:00',
      'Professor profile for fetch names tests.',
    ],
  );

  const walletAddress = buildWalletAddress();
  const identityColumns = status === 'issued'
    ? `user_id, wallet_address, public_key, role, status, issued_at`
    : `user_id, wallet_address, public_key, role, status`;
  const identityValues = status === 'issued'
    ? [user.id, walletAddress, buildPublicKey(), 'professor', status, new Date()]
    : [user.id, walletAddress, buildPublicKey(), 'professor', status];
  const placeholders = identityValues.map((_, index) => `$${index + 1}`).join(', ');

  await db.query(
    `INSERT INTO identities (${identityColumns})
     VALUES (${placeholders})`,
    identityValues,
  );

  return { user, professor, walletAddress };
};

const seedForeignAcademy = async () => {
  const seeded = await seedAcademyWithCustomEmail({
    email: `foreign.prof.fetch.${Date.now()}${TEST_EMAIL_SUFFIX}`,
    name: 'Foreign Professor Academy',
    shortName: 'FPA',
  });

  extraAcademyIds.push(seeded.academy.id);
  return seeded;
};

describe('GET /api/professors/names', () => {
  before(async () => {
    const seeded = await seedAcademy();
    academyId = seeded.academy.id;
    departmentId = seeded.department.id;
    academyToken = issueAcademyToken(academyId);
  });

  beforeEach(async () => {
    await cleanupFetchDB();
    extraAcademyIds = [];
  });

  afterEach(async () => {
    await cleanupFetchDB();

    for (const id of extraAcademyIds) {
      await teardownAcademySeed(id);
    }

    extraAcademyIds = [];
  });

  after(async () => {
    await cleanupFetchDB();
    await teardownAcademySeed(academyId);
  });

  it('returns professor names for the academy with only id and full_name', async () => {
    const professor = await seedProfessorWithStatus({
      academyId,
      departmentId,
      email: `names.success.${Date.now()}${TEST_EMAIL_SUFFIX}`,
      fullName: 'Name List Professor',
      status: 'issued',
    });

    const res = await request(app)
      .get(endpoint)
      .set('Authorization', `Bearer ${academyToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.message, 'All professors names retrieved successfully');
    assert.ok(Array.isArray(res.body.data));
    assert.equal(res.body.data.length, 1);

    const [record] = res.body.data;
    assert.deepEqual(Object.keys(record).sort(), ['full_name', 'id']);
    assert.equal(record.id, professor.professor.id);
    assert.equal(record.full_name, 'Name List Professor');
  });

  it('returns 401 when the request is made without a token', async () => {
    const res = await request(app).get(endpoint);

    assert.equal(res.status, 401);
    assert.equal(res.body.error, 'Missing token');
  });

  it('returns 403 when a professor token calls the academy-only route', async () => {
    const professor = await seedProfessorWithStatus({
      academyId,
      departmentId,
      email: `names.professor.${Date.now()}${TEST_EMAIL_SUFFIX}`,
      fullName: 'Professor Guard Names',
      status: 'issued',
    });

    const professorToken = makeProfessorToken(professor);

    const res = await request(app)
      .get(endpoint)
      .set('Authorization', `Bearer ${professorToken}`);

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.equal(res.body.code, 'FORBIDDEN');
  });

  it('returns 403 when a student token calls the academy-only route', async () => {
    const res = await request(app)
      .get(endpoint)
      .set('Authorization', `Bearer ${makeStudentToken()}`);

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.equal(res.body.code, 'FORBIDDEN');
  });

  it('only returns professors that belong to the requesting academy', async () => {
    const localA = await seedProfessorWithStatus({
      academyId,
      departmentId,
      email: `names.local.a.${Date.now()}${TEST_EMAIL_SUFFIX}`,
      fullName: 'Local Alpha Professor',
      status: 'issued',
    });
    const localB = await seedProfessorWithStatus({
      academyId,
      departmentId,
      email: `names.local.b.${Date.now()}${TEST_EMAIL_SUFFIX}`,
      fullName: 'Local Beta Professor',
      status: 'issued',
    });

    const foreign = await seedForeignAcademy();
    const foreignProfessor = await seedProfessorWithStatus({
      academyId: foreign.academy.id,
      departmentId: foreign.department.id,
      email: `names.foreign.${Date.now()}${TEST_EMAIL_SUFFIX}`,
      fullName: 'Foreign Academy Professor',
      status: 'issued',
    });

    const res = await request(app)
      .get(endpoint)
      .set('Authorization', `Bearer ${academyToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.length, 2);

    const returnedIds = res.body.data.map((record) => record.id);
    assert.deepEqual(returnedIds.sort(), [localA.professor.id, localB.professor.id].sort());
    assert.equal(returnedIds.includes(foreignProfessor.professor.id), false);
  });

  it('only returns professors with issued identities', async () => {
    const issued = await seedProfessorWithStatus({
      academyId,
      departmentId,
      email: `names.issued.${Date.now()}${TEST_EMAIL_SUFFIX}`,
      fullName: 'Issued Identity Professor',
      status: 'issued',
    });
    await seedProfessorWithStatus({
      academyId,
      departmentId,
      email: `names.pending.${Date.now()}${TEST_EMAIL_SUFFIX}`,
      fullName: 'Pending Identity Professor',
      status: 'pending',
    });

    const res = await request(app)
      .get(endpoint)
      .set('Authorization', `Bearer ${academyToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.length, 1);
    assert.equal(res.body.data[0].id, issued.professor.id);
    assert.equal(res.body.data[0].full_name, 'Issued Identity Professor');
  });

  it('returns professor names in ascending alphabetical order', async () => {
    await seedProfessorWithStatus({
      academyId,
      departmentId,
      email: `names.sort.z.${Date.now()}${TEST_EMAIL_SUFFIX}`,
      fullName: 'Zeta Professor',
      status: 'issued',
    });
    await seedProfessorWithStatus({
      academyId,
      departmentId,
      email: `names.sort.a.${Date.now()}${TEST_EMAIL_SUFFIX}`,
      fullName: 'Alpha Professor',
      status: 'issued',
    });
    await seedProfessorWithStatus({
      academyId,
      departmentId,
      email: `names.sort.m.${Date.now()}${TEST_EMAIL_SUFFIX}`,
      fullName: 'Mike Professor',
      status: 'issued',
    });

    const res = await request(app)
      .get(endpoint)
      .set('Authorization', `Bearer ${academyToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.deepEqual(
      res.body.data.map((record) => record.full_name),
      ['Alpha Professor', 'Mike Professor', 'Zeta Professor'],
    );
  });

  it('returns an empty array when the academy has no active professor identities', async () => {
    await seedProfessorWithStatus({
      academyId,
      departmentId,
      email: `names.empty.a.${Date.now()}${TEST_EMAIL_SUFFIX}`,
      fullName: 'Empty Alpha Professor',
      status: 'pending',
    });
    await seedProfessorWithStatus({
      academyId,
      departmentId,
      email: `names.empty.b.${Date.now()}${TEST_EMAIL_SUFFIX}`,
      fullName: 'Empty Beta Professor',
      status: 'pending',
    });

    const res = await request(app)
      .get(endpoint)
      .set('Authorization', `Bearer ${academyToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.deepEqual(res.body.data, []);
  });
});