import { network } from "hardhat";

async function main() {
  const { ethers } = await network.connect();
  
  const contract = await ethers.getContractAt(
    "StudentIdentity",
    "0x5FbDB2315678afecb367f032d93F642f64180aa3"
  );

  const ACADEMY_PUBLIC_KEY = "0x" + "00".repeat(64); // 64-byte public key
  const data = await contract.academies(ACADEMY_PUBLIC_KEY);

  console.log("Academy Data:", data);
}

main().catch(console.error);