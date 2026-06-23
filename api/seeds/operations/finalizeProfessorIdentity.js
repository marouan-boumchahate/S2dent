// finalizeProfessorIdentity.js — Finalizes Professor Identity issuance by signing the pending schema as the Academy.
import { askText, askSecret, askConfirm } from '../prompt.js';
import { apiClient } from '../apiClient.js';
import { printResult, printError, printInfo } from '../display.js';
import { ethers } from 'ethers';

export const label = 'Finalize Professor Identity (Academy signs & issues)';

export async function run() {
  while (true) {
    try {
      const walletAddress = await askText('Enter professor wallet address');
      const academyToken = await askSecret('Enter academy access token');
      const academyPrivateKey = await askSecret('Enter academy private key');

      printInfo('Fetching pending identity signature schema...');
      const schemaRes = await apiClient.get(`/identity/professors/pending/${walletAddress}/schema`, academyToken);
      const { domain, types, message } = schemaRes.data;

      printInfo('Signing professor identity schema...');
      const academyWallet = new ethers.Wallet(academyPrivateKey);
      const signature = await academyWallet.signTypedData(domain, types, message);

      printInfo('Submitting issue request...');
      const response = await apiClient.post('/identity/professors/issue', {
        professor_address: walletAddress,
        signature
      }, academyToken);

      printResult('Professor identity finalized and issued successfully', response.data);
      break;
    } catch (err) {
      printError('Failed to finalize professor identity', err);
      const retry = await askConfirm('Retry?');
      if (!retry) break;
    }
  }
}
