import { ethers } from 'ethers';
import { post } from './http.js';

export const createCredential = async (payload, token) => {
  const { data } = await post('/credentials', payload, token);
  return data;
};

export const issueCredential = async (credentialId, signature, token) => {
  const { data } = await post(`/credentials/${credentialId}/issue`, { signature }, token);
  return data;
};

export const fullCredentialIssuance = async ({ issuerPrivateKey, issuerToken, ...details }) => {
  const created = await createCredential(details, issuerToken);
  const signer = new ethers.Wallet(issuerPrivateKey);

  const signature = await signer.signTypedData(
    created.signing_data.domain,
    created.signing_data.types,
    created.signing_data.message,
  );

  const issued = await issueCredential(created.credential_id, signature, issuerToken);

  return {
    credential_id: created.credential_id,
    signing_data: created.signing_data,
    signature,
    blockchain_transaction: issued.blockchain_transaction,
  };
};