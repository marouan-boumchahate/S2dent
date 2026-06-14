import db from '../config/db.js';
import { CREDENTIAL_CLEANUP_INTERVAL_MS } from '../config/ttl.js';

const cleanupOrphanCredentials = async () => {
  try {
    const result = await db.query(`
      DELETE FROM credentials
      WHERE issue_tx_hash IS NULL 
        AND created_at < NOW() - INTERVAL '24 hours'
    `);
    
    if (result.rowCount > 0) {
      console.log(`=> Cleaned up ${result.rowCount} orphan credentials.`);
    }
  } catch (err) {
    console.error('=> Error running credential cleanup job:', err);
  }
};

export const startCredentialCleanupJob = () => {
  console.log('=> Credential Cleanup Job initialized.');

  cleanupOrphanCredentials();

  setInterval(cleanupOrphanCredentials, CREDENTIAL_CLEANUP_INTERVAL_MS);
};
