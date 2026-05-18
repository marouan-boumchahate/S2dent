import { ethers, keccak256 } from 'ethers';
import crypto from 'crypto';
import { encrypt } from 'eciesjs';

const ALGORITHM = 'aes-256-gcm';

const recoverSigner = (message, signature) => {
    const msgHash = ethers.hashMessage(message);

    const signerPublicKey = ethers.SigningKey.recoverPublicKey(msgHash, signature);
    const signerAddress = ethers.computeAddress(signerPublicKey);

    return { signerPublicKey, signerAddress };
};
const recoverSignerFromTypedData = (domain, types, message, signature) => {
    const signerAddress = ethers.verifyTypedData(domain, types, message, signature);
    return signerAddress;
};

const hash = (text) => keccak256(Buffer.from(text, 'utf8'));
const getPayloadHash = (payload) => keccak256(hash(JSON.stringify(payload)));
const getNonce = (byteLength = 32) => crypto.randomBytes(byteLength).toString('hex');

const encryptBySecretKey = (text, SECRET) => {
    try{
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv(ALGORITHM, SECRET, iv);

        const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
        const tag = cipher.getAuthTag();

        return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
    }
    catch(err){
        console.error('Encryption error:', err);
        throw new Error('Failed to encrypt data');
    }
};
const decryptBySecretKey = (payload, SECRET) => {
    const [ivHex, tagHex, encryptedHex] = payload.split(':');

    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, SECRET, iv);
    decipher.setAuthTag(tag);

    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
};

const encryptWithPublicKey = async (payloadJson, publicKey) => {
    const pubKeyBuffer = Buffer.from(
        publicKey.startsWith('0x') 
            ? publicKey.slice(2) 
            : publicKey, 
        'hex'
    );

    const jsonString = JSON.stringify(payloadJson, Object.keys(payloadJson).sort());
    
    const data = Buffer.from(jsonString, 'utf8');
    const encrypted = encrypt(pubKeyBuffer, data);
    
    return encrypted.toString('hex');
};


export { 
    recoverSigner, 
    getNonce, 
    encryptBySecretKey, 
    decryptBySecretKey, 
    hash, 
    encryptWithPublicKey, 
    recoverSignerFromTypedData
};
