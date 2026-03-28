import { network } from "hardhat";

const { ethers, networkName } = await network.connect();

console.log(`=> Deploying StudentIdentity to ${networkName}...`);

const studentIdentity = await ethers.deployContract("StudentIdentity");

console.log("=> Waiting for the deployment tx to confirm");
await studentIdentity.waitForDeployment();
const studentIdentityAddress = await studentIdentity.getAddress();

console.log("=> StudentIdentity address: ", studentIdentityAddress);
console.log("=> Check it here: https://sepolia.etherscan.io/address/" + studentIdentityAddress);

console.log("=> Deployment successful!");