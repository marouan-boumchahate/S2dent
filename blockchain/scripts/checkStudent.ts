import { network } from "hardhat";

async function main() {
  const { ethers } = await network.connect();
  
  // Use StudentIdentity, not AcademyIdentity
  const contract = await ethers.getContractAt(
    "StudentIdentity",
    "0x5fbdb2315678afecb367f032d93f642f64180aa3"
  );

  const STUDENT_PUBLIC_KEY = "0x" + "00".repeat(64); // 64-byte public key
  const data = await contract.students(STUDENT_PUBLIC_KEY);

  console.log("isNotRevoked:", data.status.isNotRevoked);
  console.log("revokedAt:", data.status.revokedAt.toString());
  console.log("revoker:", data.status.revoker);
}

main().catch(console.error);