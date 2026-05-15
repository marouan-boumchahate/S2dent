import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("CredentialModule", (m: any) => {
  const credential = m.contract("Credential");

  return { credential };
});