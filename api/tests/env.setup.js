// tests/env.setup.js
// Set required env vars BEFORE any src module is imported.
// dotenv.config (called inside src/config/env.js) does NOT override
// already-set process.env values, so these stay in effect for tests.

process.env.JWT_ACCESS_SECRET ??= 'test_access_secret_for_testing'
process.env.JWT_REFRESH_SECRET ??= 'test_refresh_secret_for_testing'
process.env.JWT_ENCRYPTION_SECRET ??= '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff'

// Polyfill: src/modules/identity/professor/professor.identity.service.js
// uses `ethers.getAddress(...)` without importing it. Expose it on the global
// so the bare reference resolves at runtime in the test environment.
import { ethers } from 'ethers'
globalThis.ethers ??= ethers
