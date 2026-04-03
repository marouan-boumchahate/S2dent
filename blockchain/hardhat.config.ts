import { configVariable, defineConfig } from "hardhat/config";
import hardhatToolboxMochaEthers from "@nomicfoundation/hardhat-toolbox-mocha-ethers";

/** Shared solc settings — must match on both profiles (see below). */
const solcSettings = {
  optimizer: {
    enabled: true,
    runs: 200,
  },
  // Required for AcademyIdentity.issueAcademyIdentity (many params); avoids "Stack too deep"
  viaIR: true,
  evmVersion: "cancun" as const,
};

export default defineConfig({
  plugins: [hardhatToolboxMochaEthers],
  // Hardhat 3: implicit "production" profile does NOT inherit `settings` from the old
  // `solidity: { version, settings }` form — only `version` is copied. Ignition deploy
  // runs `build` with `defaultBuildProfile: "production"`, so viaIR was missing there.
  solidity: {
    profiles: {
      default: {
        version: "0.8.28",
        settings: solcSettings,
      },
      production: {
        version: "0.8.28",
        settings: solcSettings,
      },
    },
  },
  networks: {
    /** Hardhat 3 simulated network name is `default` (not `hardhat`). */
    default: {
      type: "edr-simulated",
      allowUnlimitedContractSize: true,
    },
    sepolia: {
      type: "http",
      url: configVariable("SEPOLIA_RPC_URL"),
      accounts: [configVariable("SEPOLIA_PRIVATE_KEY")],
    },
  },
  verify: {
    etherscan: {
      apiKey: configVariable("ETHERSCAN_API_KEY"),
    },
  },
});
