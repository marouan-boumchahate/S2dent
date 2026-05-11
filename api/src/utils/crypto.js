import { ethers } from 'ethers';
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

const getNonce = (byteLength = 32) => crypto.randomBytes(byteLength).toString('hex');
const recoverSigner = (message, signature) => ethers.verifyMessage(message, signature);
const hash = (text) => crypto.createHash('sha256').update(text).digest('hex');

const encrypt = (text, SECRET) => {
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
const decrypt = (payload, SECRET) => {
    const [ivHex, tagHex, encryptedHex] = payload.split(':');

    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, SECRET, iv);
    decipher.setAuthTag(tag);

    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
};


export { recoverSigner, getNonce, encrypt, decrypt, hash };
