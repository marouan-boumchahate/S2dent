import { network } from "hardhat";

const { ethers, networkName } = await network.connect();

console.log(`=> Deploying ProfessorIdentity to ${networkName}...`);

const professorIdentity = await ethers.deployContract("ProfessorIdentity");

console.log("=> Waiting for the deployment tx to confirm");
await professorIdentity.waitForDeployment();
const professorIdentityAddress = await professorIdentity.getAddress();

console.log("=> ProfessorIdentity address: ", professorIdentityAddress);
console.log("=> Check it here: https://sepolia.etherscan.io/address/" + professorIdentityAddress);

console.log("=> Deployment successful!");