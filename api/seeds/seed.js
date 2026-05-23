import {
  WALLETS,
  academyProfile,
  addressProfile,
  departmentProfile,
  professorProfile,
  studentProfile,
  userProfile,
} from './data.js';
import { authenticate } from './auth.js';
import { createAcademy } from './academy.js';
import { createAddress } from './address.js';
import { createUser } from './user.js';
import { createDepartment } from './department.js';
import { createStudent } from './student.js';
import { createProfessor } from './professor.js';
import { issueIdentity } from './identity.js';


// Helpers
// -------
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (label, msg) => console.log(`[${label}] ${msg}`);
const printTokens = (label, { accessToken, refreshToken }) => {
  console.log(`\n── ${label.toUpperCase()} TOKENS ──`);
  console.log(`access : ${accessToken}`);
  console.log(`refresh: ${refreshToken}`);
};


// Seeders
// -------
const seedAcademy = async () => {
  const profile = academyProfile();
  const id = await createAcademy(profile);
  log('academy', `created → id=${id}`);

  await createAddress({ academy_id: id, ...addressProfile() });
  log('address', `created for academy=${id}`);

  await issueIdentity('academy', { email: profile.email, privateKey: WALLETS.academy.privateKey });
  log('identity', `issued for academy=${WALLETS.academy.address}`);

  await wait(1500);
  const tokens = await authenticate(WALLETS.academy);
  log('auth', 'academy authenticated');

  return { id, tokens };
};

const seedStudent = async ({ academyId, departmentId, academyToken, advisorId }) => {
  const profile = userProfile();
  const userId = await createUser(profile, academyToken);
  log('user', `student → id=${userId}`);

  await createAddress({ user_id: userId, ...addressProfile() });
  log('address', `created for student=${userId}`);

  const id = await createStudent(
    {
      user_id: userId,
      academy_id: academyId,
      department_id: departmentId,
      advisor_id: advisorId,
      ...studentProfile(),
    },
    academyToken,
  );
  log('student', `created → id=${id}`);

  await issueIdentity('student', { email: profile.email, privateKey: WALLETS.student.privateKey });
  log('identity', `issued for student=${WALLETS.student.address}`);

  await wait(1500);
  const tokens = await authenticate(WALLETS.student);
  log('auth', 'student authenticated');

  return { id, tokens };
};

const seedProfessor = async ({ academyId, departmentId, academyToken }) => {
  const profile = userProfile();
  const userId = await createUser(profile, academyToken);
  log('user', `professor → id=${userId}`);

  await createAddress({ user_id: userId, ...addressProfile() });
  log('address', `created for professor=${userId}`);

  const id = await createProfessor(
    { user_id: userId, academy_id: academyId, department_id: departmentId, ...professorProfile() },
    academyToken,
  );
  log('professor', `created → id=${id}`);

  await issueIdentity('professor', { email: profile.email, privateKey: WALLETS.professor.privateKey });
  log('identity', `issued for professor=${WALLETS.professor.address}`);

  await wait(1500);
  const tokens = await authenticate(WALLETS.professor);
  log('auth', 'professor authenticated');

  return { id, tokens };
};


// Orchestrator
// ------------
const main = async () => {
  console.log('Starting seed...\n');

  const academy = await seedAcademy();

  const departmentId = await createDepartment(
    departmentProfile(),
    academy.tokens.accessToken,
  );
  log('department', `created → id=${departmentId}`);

  const ctx = { academyId: academy.id, departmentId, academyToken: academy.tokens.accessToken };
  const professor = await seedProfessor(ctx);
  //console.log('\n\n\nProfessor ID:', professor.id); // Debug log
  const student = await seedStudent({ ...ctx, advisorId: professor.id });

  printTokens('academy', academy.tokens);
  printTokens('student', student.tokens);
  printTokens('professor', professor.tokens);
};

main().catch((e) => {
  console.error('\nSeed failed:', e.message);
  process.exit(1);
});
