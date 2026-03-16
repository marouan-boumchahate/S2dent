import { network } from "hardhat";

const { ethers, networkName } = await network.connect();

console.log(`Deploying ProfessorRegistry to ${networkName}...`);

const professorRegistry = await ethers.deployContract("ProfessorRegistry");

console.log("Waiting for the deployment tx to confirm");
await professorRegistry.waitForDeployment();

console.log("ProfessorRegistry address:", await professorRegistry.getAddress());

console.log("Deployment successful!");