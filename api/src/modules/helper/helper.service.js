import { ethers } from 'ethers';

const signingDataService = async (payload, privateKey) => {
    const wallet = new ethers.Wallet(privateKey);
    const signature = await wallet.signTypedData(payload.domain, payload.types, payload.message);

    return { signature };
}


export { signingDataService };