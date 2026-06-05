import { ethers } from 'ethers';

const signingDataService = async (payload, privateKey) => {
    const { domain, types, message } = payload;
    const wallet = new ethers.Wallet(privateKey);
    const signature = await wallet.signTypedData(domain, types, message);

    return { signature };
}

const signingDataStringService = async (value, privateKey) => {
    const wallet = new ethers.Wallet(privateKey);
    const signature = await wallet.signMessage(value);

    return { signature };
}

export { signingDataService, signingDataStringService };