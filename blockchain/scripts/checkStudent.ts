import { network } from "hardhat";

async function main() {
  const { ethers } = await network.connect();
  
  // Use StudentIdentity, not AcademyIdentity
  const contract = await ethers.getContractAt(
    "StudentIdentity",
    "0x5fbdb2315678afecb367f032d93f642f64180aa3"
  );

  const STUDENT_ADDRESS = "0x0000000000000000000000000000000000000000"; // wallet address
  const data = await contract.students(STUDENT_ADDRESS);

  console.log("isNotRevoked:", data.status.isNotRevoked);
  console.log("revokedAt:", data.status.revokedAt.toString());
  console.log("revoker:", data.status.revoker);
}

main().catch(console.error);