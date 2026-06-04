import { ethers } from 'ethers';

const signingDataService = async (payload, privateKey) => {
    const wallet = new ethers.Wallet(privateKey);
    const signature = await wallet.signMessage(payload);

    return { signature };
}


export { signingDataService };