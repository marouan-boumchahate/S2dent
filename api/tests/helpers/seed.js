import db from '../../src/config/db.js';

const PUBLIC_KEY_LEN = 132;
const buildPublicKey = (suffix = '') => '0x04' + (suffix + 'a').padEnd(PUBLIC_KEY_LEN - 4, 'a').slice(0, PUBLIC_KEY_LEN - 4);

export const seedAcademyRow = async ({ academy_number, email, name, short_name, legal_name, registration_number, tax_id }) => {
  const { rows: [academy] } = await db.query(
    `INSERT INTO academies (
        academy_number, email, name, short_name, type,
        legal_name, registration_number, tax_id
     )
     VALUES ($1, $2, $3, $4, 'university', $5, $6, $7)
     RETURNING id`,
    [academy_number, email, name, short_name, legal_name, registration_number, tax_id],
  );
  return academy.id;
};

export const seedAcademyIdentity = async (academyId, walletAddress, { is_active = true, public_key } = {}) => {
  const pk = public_key ?? buildPublicKey(walletAddress.slice(2, 8));
  await db.query(
    `INSERT INTO identities (academy_id, wallet_address, public_key, role, is_active)
     VALUES ($1, $2, $3, 'academy', $4)
     ON CONFLICT (wallet_address) DO UPDATE SET is_active = EXCLUDED.is_active, academy_id = EXCLUDED.academy_id`,
    [academyId, walletAddress, pk, is_active],
  );
};

export const seedUserIdentity = async (userId, walletAddress, role, { is_active = true, public_key } = {}) => {
  const pk = public_key ?? buildPublicKey(walletAddress.slice(2, 8));
  await db.query(
    `INSERT INTO identities (user_id, wallet_address, public_key, role, is_active)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (wallet_address) DO UPDATE SET is_active = EXCLUDED.is_active, user_id = EXCLUDED.user_id, role = EXCLUDED.role`,
    [userId, walletAddress, pk, role, is_active],
  );
};

export { buildPublicKey };
