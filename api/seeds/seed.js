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
  const id = await createAcademy(academyProfile(WALLETS.academy.address));
  log('academy', `created → id=${id}`);

  await createAddress({ academy_id: id, ...addressProfile() });
  log('address', `created for academy=${id}`);

  await issueIdentity('academy', { wallet_address: WALLETS.academy.address });
  log('identity', `issued for academy=${WALLETS.academy.address}`);

  await wait(1500);
  const tokens = await authenticate(WALLETS.academy);
  log('auth', 'academy authenticated');

  return { id, tokens };
};

const seedStudent = async ({ academyId, departmentId, academyToken }) => {
  const profile = userProfile();
  const userId = await createUser(profile, academyToken);
  log('user', `student → id=${userId}`);

  await createAddress({ user_id: userId, ...addressProfile() });
  log('address', `created for student=${userId}`);

  const id = await createStudent(
    { user_id: userId, academy_id: academyId, department_id: departmentId, ...studentProfile() },
    academyToken,
  );
  log('student', `created → id=${id}`);

  await issueIdentity('student', { email: profile.email, wallet_address: WALLETS.student.address });
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

  await issueIdentity('professor', { email: profile.email, wallet_address: WALLETS.professor.address });
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
    { academy_id: academy.id, ...departmentProfile() },
    academy.tokens.accessToken,
  );
  log('department', `created → id=${departmentId}`);

  const ctx = { academyId: academy.id, departmentId, academyToken: academy.tokens.accessToken };
  const student = await seedStudent(ctx);
  const professor = await seedProfessor(ctx);

  printTokens('academy', academy.tokens);
  printTokens('student', student.tokens);
  printTokens('professor', professor.tokens);
};

main().catch((e) => {
  console.error('\nSeed failed:', e.message);
  process.exit(1);
});
