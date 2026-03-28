import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("StudentModule", (m: any) => {
  const student = m.contract("StudentIdentity");

  return { student };
});