import { network } from "hardhat";

async function main() {
  const { ethers } = await network.connect();
  
  const contract = await ethers.getContractAt(
    "StudentIdentity",
    "0x5FbDB2315678afecb367f032d93F642f64180aa3"
  );

  const ACADEMY_ADDRESS = "0x0000000000000000000000000000000000000000"; // wallet address
  const data = await contract.academies(ACADEMY_ADDRESS);

  console.log("Academy Data:", data);
}

main().catch(console.error);