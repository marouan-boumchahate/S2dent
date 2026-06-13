import db from '../config/db.js';
import { CLEANUP_INTERVAL_MS } from '../config/ttl.js';

const cleanupExpiredNonces = async () => {
  try {
    const result = await db.query(`
      UPDATE identities
      SET nonce = NULL, nonce_expires_at = NULL
      WHERE nonce IS NOT NULL 
        AND nonce_expires_at < NOW()
    `);
    
    if (result.rowCount > 0) {
      console.log(`🧹 Cleaned up ${result.rowCount} expired nonces.`);
    }
  } catch (err) {
    console.error('❌ Error running nonce cleanup job:', err);
  }
};

export const startNonceCleanupJob = () => {
  console.log('🔄 Nonce Cleanup Job initialized.');

  cleanupExpiredNonces();

  setInterval(cleanupExpiredNonces, CLEANUP_INTERVAL_MS);
};
