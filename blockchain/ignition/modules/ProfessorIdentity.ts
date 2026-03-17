import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("ProfessorModule", (m: any) => {
  const professor = m.contract("ProfessorIdentity");

  return { professor };
});