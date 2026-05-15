import { network } from "hardhat";

async function main() {
  const { ethers } = await network.connect();
  
  const contract = await ethers.getContractAt(
    "ProfessorIdentity",
    "0x5fbdb2315678afecb367f032d93f642f64180aa3"
  );

  const PROFESSOR_PUBLIC_KEY = "0x" + "00".repeat(64); // 64-byte public key
  const data = await contract.professors(PROFESSOR_PUBLIC_KEY);

  console.log("isNotRevoked:", data.status.isNotRevoked); // false = already revoked
  console.log("revokedAt:", data.status.revokedAt.toString());
  console.log("revoker:", data.status.revoker);
}

main().catch(console.error);