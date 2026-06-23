import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const platformPrivateKey = process.env.BLOCKCHAIN_PLATFORM_PRIVATE_KEY;
if (!platformPrivateKey) {
  console.error('Error: BLOCKCHAIN_PLATFORM_PRIVATE_KEY is missing in the .env file.');
  process.exit(1);
}

export const env = {
  blockchain: {
    platformPrivateKey,
  },
  apiUrl: process.env.API_URL || 'http://localhost:3000/api',
};
