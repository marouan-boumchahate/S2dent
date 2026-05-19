import request from 'supertest';
import { strict as assert } from 'assert';
import sinon from 'sinon';
import { ethers } from 'ethers';
import app from '../../src/app.js';
import db from '../../src/config/db.js';
import { signTokens } from '../../src/utils/jwt.js';

describe('POST /api/credentials', () => {
  const SEED_ACADEMY_EMAIL = 'seed.credential.create@seed.internal';
  const SEED_WALLET = '0xcccccccccccccccccccccccccccccccccccccccc';
  const STUDENT_WALLET = '0xccccccccccccccccccccccccccccccccccccccc1';
  const PROFESSOR_WALLET = '0xccccccccccccccccccccccccccccccccccccccc2';
  const OTHER_ACADEMY_WALLET = '0xccccccccccccccccccccccccccccccccccccccc3';

  const ALL_TEST_WALLETS = [SEED_WALLET, STUDENT_WALLET, PROFESSOR_WALLET, OTHER_ACADEMY_WALLET].map(w => ethers.getAddress(w).toLowerCase());
  const ALL_TEST_EMAILS = [SEED_ACADEMY_EMAIL, 'student.credential.create@credential.test', 'other.create@test.com'];

  let ACADEMY_ID;
  let ACADEMY_TOKEN;

  const issueAccessToken = (payload = {}) => signTokens(
    { sub: ethers.getAddress(payload.sub || SEED_WALLET), role: payload.role || 'academy', ...payload },
    undefined,
    true,
  ).accessToken;

  const seedAcademy = async (email = SEED_ACADEMY_EMAIL, wallet = SEED_WALLET, number = 'ACD_CRD_C_0001') => {
    const shortName = ('SCC' + number.slice(-4)).toUpperCase();
    const { rows: [academy] } = await db.query(
      `INSERT INTO academies (academy_number, name, short_name, type, email, legal_name, registration_number, tax_id)
       VALUES ($1, $2, $3, 'university', $4, $5, $6, $7)
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [number, 'Seed Academy ' + number, shortName, email, 'Seed A.S. ' + number, 'REG-' + number, 'TAX-' + number]
    );

    await db.query(
      `INSERT INTO identities (academy_id, wallet_address, public_key, role, is_active)
       VALUES ($1, $2, $3, 'academy', TRUE)
       ON CONFLICT (wallet_address) DO UPDATE SET is_active = TRUE, academy_id = EXCLUDED.academy_id`,
      [academy.id, ethers.getAddress(wallet), '0x04pub' + wallet.slice(2).padEnd(120, '0')]
    );

    await db.query(
      `INSERT INTO departments (academy_id, code, name, faculty, total_years)
       VALUES ($1, $2, $3, $4, 4)
       ON CONFLICT (academy_id, code) DO NOTHING`,
      [academy.id, 'DEPT-' + number.slice(-4), 'Department ' + number.slice(-4), 'Faculty ' + number.slice(-4)]
    );

    return academy.id;
  };

  const seedProfessor = async (academyId, wallet = PROFESSOR_WALLET) => {
    const email = `prof.${wallet.slice(-4)}@credential.create.test`;
    const nid = 'NID-PROF-C-' + wallet.slice(-4);
    const fullName = 'Prof Test Create ' + wallet.slice(-4);
    
    const { rows: [user] } = await db.query(
      `INSERT INTO users (first_name, last_name, full_name, email, date_of_birth, gender, national_id, nationality)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name
       RETURNING id`,
      ['Prof', 'Test', fullName, email, '1980-01-01', 'male', nid, 'Turkish']
    );

    await db.query(
      `INSERT INTO professors (user_id, academy_id, department_id, employee_number, title, rank, hire_date)
       VALUES ($1, $2, (SELECT id FROM departments WHERE academy_id = $2 LIMIT 1), $3, $4, $5, $6)
       ON CONFLICT (user_id) DO UPDATE SET academy_id = EXCLUDED.academy_id`,
      [user.id, academyId, 'EMP-C-' + wallet.slice(-4), 'Dr.', 'Prof', '2010-01-01']
    );

    await db.query(
      `INSERT INTO identities (user_id, wallet_address, public_key, role, is_active)
       VALUES ($1, $2, $3, 'professor', TRUE)
       ON CONFLICT (wallet_address) DO UPDATE SET is_active = TRUE, user_id = EXCLUDED.user_id`,
      [user.id, ethers.getAddress(wallet), '0x04profpub' + wallet.slice(2, 10).padEnd(120, '0')]
    );

    return user.id;
  };

  const seedStudent = async (academyId) => {
    const email = 'student.credential.create@credential.test';
    const nid = 'NID-CRD-C-001';
    
    const { rows: [user] } = await db.query(
      `INSERT INTO users (first_name, last_name, full_name, email, date_of_birth, gender, national_id, nationality)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name
       RETURNING id`,
      ['Cred', 'Student', 'Cred Student', email, '2000-01-01', 'female', nid, 'Turkish']
    );

    await db.query(
      `INSERT INTO students (user_id, academy_id, department_id, student_number, enrollment_status, enrollment_date, expected_graduation_date)
       VALUES ($1, $2, (SELECT id FROM departments WHERE academy_id = $2 LIMIT 1), $3, 'active', '2022-09-15', '2026-06-30')
       ON CONFLICT (user_id) DO UPDATE SET academy_id = EXCLUDED.academy_id`,
      [user.id, academyId, 'STU-CRD-C-001']
    );

    await db.query(
      `INSERT INTO identities (user_id, wallet_address, public_key, role, is_active)
       VALUES ($1, $2, $3, 'student', TRUE)
       ON CONFLICT (wallet_address) DO UPDATE SET is_active = TRUE, user_id = EXCLUDED.user_id`,
      [user.id, ethers.getAddress(STUDENT_WALLET), '0x04studpub' + STUDENT_WALLET.slice(2, 10).padEnd(120, '0')]
    );

    return user.id;
  };

  const cleanup = async () => {
    await db.query(`DELETE FROM credentials WHERE code LIKE 'CRD_%'`);
    await db.query(`DELETE FROM pending_transactions WHERE payload->>'credential_code' IS NOT NULL`);
    
    await db.query(`DELETE FROM identities WHERE LOWER(wallet_address) = ANY($1)`, [ALL_TEST_WALLETS]);
    await db.query(`DELETE FROM professors WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@credential.create.test' OR email = ANY($1))`, [ALL_TEST_EMAILS]);
    await db.query(`DELETE FROM students WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@credential.create.test' OR email = ANY($1))`, [ALL_TEST_EMAILS]);
    await db.query(`DELETE FROM identities WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@credential.create.test' OR email = ANY($1))`, [ALL_TEST_EMAILS]);
    await db.query(`DELETE FROM departments WHERE academy_id IN (SELECT id FROM academies WHERE email = ANY($1))`, [ALL_TEST_EMAILS]);
    await db.query(`DELETE FROM academies WHERE email = ANY($1)`, [ALL_TEST_EMAILS]);
    await db.query(`DELETE FROM users WHERE email LIKE '%@credential.create.test' OR email = ANY($1)`, [ALL_TEST_EMAILS]);
  };

  before(async () => {
    await cleanup();
    ACADEMY_ID = await seedAcademy();
    ACADEMY_TOKEN = issueAccessToken({ uid: ACADEMY_ID });
  });

  beforeEach(async () => {
    await db.query(`DELETE FROM credentials WHERE code LIKE 'CRD_%'`);
    await db.query(`DELETE FROM pending_transactions WHERE payload->>'credential_code' IS NOT NULL`);
    
    await db.query(`DELETE FROM identities WHERE user_id IN (SELECT id FROM users WHERE email = 'student.credential.create@credential.test')`);
    await db.query(`DELETE FROM professors WHERE academy_id = $1`, [ACADEMY_ID]);
    await db.query(`DELETE FROM students WHERE academy_id = $1`, [ACADEMY_ID]);
    await db.query(`DELETE FROM users WHERE email = 'student.credential.create@credential.test'`);
  });

  afterEach(async () => {
    sinon.restore();
  });

  after(async () => {
    await cleanup();
  });

  it('returns 200 and signing data on valid input (certificate)', async () => {
    await seedStudent(ACADEMY_ID);

    const body = {
      title: 'Completion Certificate',
      credential_type: 'certificate',
      description: 'Short course completion',
      student_address: ethers.getAddress(STUDENT_WALLET),
      payload: {
        certificate_name: 'Intro to Testing',
        certificate_code: 'CERT-101',
        certificate_category: 'professional',
        program_duration_hours: 40,
        delivery_mode: 'online',
        start_date: '2024-01-01',
        end_date: '2024-02-01',
        final_score: 85,
        passing_score: 60,
        instructor_name: 'Dr. Tester'
      }
    };

    const res = await request(app)
      .post('/api/credentials')
      .set('Authorization', `Bearer ${ACADEMY_TOKEN}`)
      .send(body);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.credential_id);
    assert.ok(res.body.data.signing_data);
  });

  it('returns 422 VALIDATION_ERROR when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/credentials')
      .set('Authorization', `Bearer ${ACADEMY_TOKEN}`)
      .send({});

    assert.equal(res.status, 422);
    assert.equal(res.body.code, 'VALIDATION_ERROR');
  });

  it('returns 500 when DB throws unexpectedly', async () => {
    sinon.stub(db, 'query').rejects(new Error('DB down'));

    const res = await request(app)
      .post('/api/credentials')
      .set('Authorization', `Bearer ${ACADEMY_TOKEN}`)
      .send({ title: 'X', credential_type: 'certificate', student_address: ethers.getAddress(STUDENT_WALLET), payload: { certificate_name: 'A', certificate_code: 'B', certificate_category: 'professional', delivery_mode: 'online', start_date: '2024-01-01', end_date: '2024-02-01', instructor_name: 'I' } });

    assert.equal(res.status, 500);
  });

  it('returns 200 when a professor issues for a student in their academy', async () => {
    await seedStudent(ACADEMY_ID);
    await seedProfessor(ACADEMY_ID);
    const profToken = issueAccessToken({ sub: PROFESSOR_WALLET, role: 'professor' });

    const body = {
      title: 'Professor Endorsement',
      credential_type: 'attendance',
      student_address: ethers.getAddress(STUDENT_WALLET),
      payload: {
        course_code: 'CS101',
        course_name: 'Intro to Logic',
        academic_year: '2023-2024',
        semester: 'fall',
        total_sessions: 30,
        attended_sessions: 28,
        excused_absences: 2,
        period_from: '2023-09-01',
        period_to: '2023-12-30'
      }
    };

    const res = await request(app)
      .post('/api/credentials')
      .set('Authorization', `Bearer ${profToken}`)
      .send(body);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
  });
  
  it('returns 400 when an academy tries to create an attendance credential', async () => {
    const res = await request(app)
      .post('/api/credentials')
      .set('Authorization', `Bearer ${ACADEMY_TOKEN}`)
      .send({
        title: 'Academy Attendance',
        credential_type: 'attendance',
        student_address: ethers.getAddress(STUDENT_WALLET),
        payload: {
          course_code: 'CS101',
          course_name: 'Intro to Logic',
          academic_year: '2023-2024',
          semester: 'fall',
          total_sessions: 30,
          attended_sessions: 28,
          excused_absences: 2,
          period_from: '2023-09-01',
          period_to: '2023-12-30'
        }
      });
    assert.equal(res.status, 400);
    assert.equal(res.body.code, 'INVALID_CREDENTIAL_TYPE_FOR_ACADEMY');
  });
  
  it('returns 400 when a professor tries to create a non-attendance credential', async () => {
    const profToken = issueAccessToken({ sub: PROFESSOR_WALLET, role: 'professor' });
    const res = await request(app)
      .post('/api/credentials')
      .set('Authorization', `Bearer ${profToken}`)
      .send({
        title: 'Professor Certificate',
        credential_type: 'certificate',
        student_address: ethers.getAddress(STUDENT_WALLET),
        payload: {
          certificate_name: 'Advanced Testing',
          certificate_code: 'CERT-202',
          certificate_category: 'professional',
          program_duration_hours: 12,
          delivery_mode: 'online',
          start_date: '2024-01-01',
          end_date: '2024-02-01',
          final_score: 88,
          passing_score: 60,
          instructor_name: 'Dr. Logic'
        }
      });
    assert.equal(res.status, 400);
    assert.equal(res.body.code, 'INVALID_CREDENTIAL_TYPE_FOR_PROFESSOR');
  });

  it('returns 403 when a student tries to create a credential', async () => {
    const studentToken = issueAccessToken({ sub: STUDENT_WALLET, role: 'student' });
    const res = await request(app)
      .post('/api/credentials')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ title: 'X' });

    assert.equal(res.status, 403);
  });

  it('returns 422 for invalid student address format', async () => {
    const res = await request(app)
      .post('/api/credentials')
      .set('Authorization', `Bearer ${ACADEMY_TOKEN}`)
      .send({ 
        title: 'X', 
        credential_type: 'certificate', 
        student_address: '0xinvalid',
        payload: { certificate_name: 'A', certificate_code: 'B', certificate_category: 'professional', delivery_mode: 'online', start_date: '2024-01-01', end_date: '2024-02-01', instructor_name: 'I' }
      });

    assert.equal(res.status, 422);
  });

  it('returns 422 when payload does not match credential type', async () => {
    const res = await request(app)
      .post('/api/credentials')
      .set('Authorization', `Bearer ${ACADEMY_TOKEN}`)
      .send({ 
        title: 'X', 
        credential_type: 'degree', 
        student_address: ethers.getAddress(STUDENT_WALLET),
        payload: { certificate_name: 'A' } 
      });

    assert.equal(res.status, 422);
  });

  it('returns 404 when student wallet is not registered', async () => {
    const res = await request(app)
      .post('/api/credentials')
      .set('Authorization', `Bearer ${ACADEMY_TOKEN}`)
      .send({ 
        title: 'X', 
        credential_type: 'certificate', 
        student_address: '0x1234567890123456789012345678901234567899',
        payload: { certificate_name: 'A', certificate_code: 'B', certificate_category: 'professional', delivery_mode: 'online', start_date: '2024-01-01', end_date: '2024-02-01', instructor_name: 'I' }
      });

    assert.equal(res.status, 404);
    assert.equal(res.body.code, 'STUDENT_NOT_FOUND');
  });

  it('returns 401 when professor from another academy tries to issue', async () => {
    await seedStudent(ACADEMY_ID); 
    const OTHER_ACAD_ID = await seedAcademy('other.create@test.com', OTHER_ACADEMY_WALLET, 'ACD_CRD_C_9999');
    await seedProfessor(OTHER_ACAD_ID, PROFESSOR_WALLET);
    
    const otherProfToken = issueAccessToken({ sub: PROFESSOR_WALLET, role: 'professor' });

    const res = await request(app)
      .post('/api/credentials')
      .set('Authorization', `Bearer ${otherProfToken}`)
      .send({ 
        title: 'X', 
        credential_type: 'attendance', 
        student_address: ethers.getAddress(STUDENT_WALLET),
        payload: {
          course_code: 'CS101',
          course_name: 'Intro to Logic',
          academic_year: '2023-2024',
          semester: 'fall',
          total_sessions: 30,
          attended_sessions: 28,
          excused_absences: 2,
          period_from: '2023-09-01',
          period_to: '2023-12-30'
        }
      });

    assert.equal(res.status, 401);
    assert.equal(res.body.code, 'UNAUTHORIZED_ISSUER');
  });

  it('returns 401 when request is unauthenticated', async () => {
    const res = await request(app)
      .post('/api/credentials')
      .send({ title: 'X' });

    assert.equal(res.status, 401);
  });

  it('returns 404 when student identity is inactive', async () => {
    await seedStudent(ACADEMY_ID);
    await db.query(`UPDATE identities SET is_active = FALSE WHERE wallet_address = $1`, [ethers.getAddress(STUDENT_WALLET)]);

    const res = await request(app)
      .post('/api/credentials')
      .set('Authorization', `Bearer ${ACADEMY_TOKEN}`)
      .send({ 
        title: 'X', 
        credential_type: 'certificate', 
        student_address: ethers.getAddress(STUDENT_WALLET),
        payload: { certificate_name: 'A', certificate_code: 'B', certificate_category: 'professional', delivery_mode: 'online', start_date: '2024-01-01', end_date: '2024-02-01', instructor_name: 'I' }
      });

    assert.equal(res.status, 404);
    assert.equal(res.body.code, 'STUDENT_NOT_FOUND');
  });

  it('returns 500 when generated credential code already exists', async () => {
    await seedStudent(ACADEMY_ID);
    
    const originalQuery = db.query;
    sinon.stub(db, 'query').callsFake(async (text, params) => {
        if (text && text.includes('SELECT id FROM credentials WHERE code = $1')) {
            return { rows: [{ id: 'existing-id' }] };
        }
        return originalQuery.apply(db, [text, params]);
    });

    const res = await request(app)
      .post('/api/credentials')
      .set('Authorization', `Bearer ${ACADEMY_TOKEN}`)
      .send({ 
        title: 'X', 
        credential_type: 'certificate', 
        student_address: ethers.getAddress(STUDENT_WALLET),
        payload: { certificate_name: 'A', certificate_code: 'B', certificate_category: 'professional', delivery_mode: 'online', start_date: '2024-01-01', end_date: '2024-02-01', instructor_name: 'I' }
      });

    assert.equal(res.status, 500);
    assert.equal(res.body.code, 'CREDENTIAL_CODE_CONFLICT');
  });
});
