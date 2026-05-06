import { network } from "hardhat";

async function main() {
  const { ethers } = await network.connect();
  
  const contract = await ethers.getContractAt(
    "ProfessorIdentity",
    "0x5fbdb2315678afecb367f032d93f642f64180aa3"
  );

  const PROFESSOR_WALLET = "0x1234567890abcdef1234567890abcdef12345678";
  const data = await contract.professors(PROFESSOR_WALLET);

  console.log("isNotRevoked:", data.status.isNotRevoked); // false = already revoked
  console.log("revokedAt:", data.status.revokedAt.toString());
  console.log("revoker:", data.status.revoker);
}

main().catch(console.error);