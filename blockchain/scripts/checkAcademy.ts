import { network } from "hardhat";

async function main() {
  const { ethers } = await network.connect();
  
  const contract = await ethers.getContractAt(
    "StudentIdentity",
    "0x5FbDB2315678afecb367f032d93F642f64180aa3"
  );

  const ACADEMY_WALLET = "0x1234567890abcdef1234567890abcdef12345678";
  const data = await contract.academies(ACADEMY_WALLET);

  console.log("Academy Data:", data);
}

main().catch(console.error);