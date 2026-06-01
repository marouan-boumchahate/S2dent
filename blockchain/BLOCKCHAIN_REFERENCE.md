# Blockchain Documentation

This document explains the smart contract layer in the `blockchain/` project and describes every function in every contract.

## Contract Overview

The contracts are built as an inheritance chain:

- `S2dent` provides shared validation helpers and owner-based signature checks.
- `AcademyIdentity` extends `S2dent` and manages academy issuance and revocation.
- `ProfessorIdentity` extends `AcademyIdentity` and manages professor identities.
- `StudentIdentity` extends `ProfessorIdentity` and manages student identities.
- `Credential` extends `StudentIdentity` and manages issued credentials.

Each child contract inherits the functions, errors, events, and validation helpers from its parent contracts.

## S2dent

`S2dent` is the base contract. It stores the deployer as the contract owner and provides reusable validation helpers for addresses, strings, timestamps, public keys, and signatures.

### `constructor()`

Sets `owner` to `msg.sender` when the contract is deployed. This makes the deployer the only account allowed to call functions guarded by `onlyOwner`.

### `modifier onlyOwner`

Restricts execution to the contract owner. If the caller is not the owner, the call reverts with `Not authorized: Only owner can perform this operation.`

### `_validateAddressSet(address _addr)`

Internal pure helper that reverts with `InvalidAddress` when `_addr` is the zero address. Used to ensure required addresses are present before state changes.

### `_validatePublicKeySet(bytes memory _publicKey)`

Internal pure helper that checks whether a public key is exactly 65 bytes long. If not, it reverts with `InvalidPublicKey`.

### `_validateSignatureSet(bytes memory _signature)`

Internal pure helper that checks whether a signature is exactly 65 bytes long. If not, it reverts with `InvalidSignature`.

### `_validateStringIsNotEmpty(string memory _value, string memory _msg)`

Internal pure helper that requires a string to contain at least one byte. It reverts with the provided message when the string is empty.

### `_validateStringIsNotShort(string memory _value, uint256 _min, string memory _msg)`

Internal pure helper that requires the string length to be greater than or equal to `_min`. It is used for minimum-length checks such as IDs.

### `_validateStringIsNotLong(string memory _value, uint256 _max, string memory _msg)`

Internal pure helper that requires the string length to be less than or equal to `_max`. It is used to cap user-facing text fields.

### `_validateTimeSet(uint256 _value, string memory _msg)`

Internal pure helper that requires a timestamp-like value to be greater than zero. It prevents unset time values from being accepted.

### `_validateTime1BeforeTime2(uint256 _value1, uint256 _value2, string memory _msg)`

Internal pure helper that requires `_value1 < _value2`. It is used to confirm that dates are in the past and that certificate ranges are valid.

### `isMessageSignedByOwner(string memory _message, bytes memory _signature)`

Public view function that checks whether `_signature` was produced by the contract owner for `_message`. It hashes the message using Ethereum signed message format and compares the recovered signer with `owner`.

## AcademyIdentity

`AcademyIdentity` manages academy registration records. Only the owner can issue or revoke an academy identity, and each academy is tracked with identity, proof, certificate, and status data.

### `modifier onlyAcademy(address _caller)`

Restricts execution to a caller that already has an issued, non-revoked academy identity. The check uses the academy status stored in `academies[_caller]`.

### `_validateHashIsSet(bytes32 _value, string memory _msg)`

Internal pure helper that requires a hash to be non-zero. It is used for certificate fingerprints and other required hashes.

### `_validateCertificate(AcademyCertArgs calldata c)`

Internal pure helper that validates academy certificate details. It checks that the fingerprint exists, the certificate and chain strings are not empty, `notBefore` is set, and `notAfter` is later than `notBefore`.

### `_validateAcademyInfos(AcademyInfosArgs calldata i)`

Internal pure helper that validates the academy identity fields. It checks the public key length, requires an academy ID, enforces name and short name presence and length limits, and ensures the academy type enum value is valid.

### `_validateAcademyProofs(AcademyProofsArgs calldata p)`

Internal pure helper that validates the legal and billing proof fields. It requires `legalName`, `registrationNumber`, `taxId`, and `billingEmail` to all be present.

### `_validateAcademyIssue(address _academyAddress, AcademyIssueArgs calldata a)`

Internal pure helper that validates the full academy issuance payload. It confirms the destination address is set and delegates validation to the academy info, proof, and certificate helpers.

### `_hashString(string memory _value)`

Internal pure helper that returns `keccak256(abi.encodePacked(_value))`. It is used to build uniqueness indexes from string identifiers.

### `issueAcademyIdentity(address _academyAddress, AcademyIssueArgs calldata args)`

Public owner-only function that issues a new academy identity.

What it does:

- Validates the input payload.
- Ensures the academy has not already been issued.
- Builds uniqueness hashes for academy ID, name plus short name, and the legal proof bundle.
- Reverts if any of those hashes were already used by another academy.
- Stores the academy identity, proof, certificate, and active status.
- Writes uniqueness indexes so the same academy cannot be issued twice under different addresses.
- Emits `AcademyIssued`.

### `revokeAcademyIdentity(address _academyAddress, string calldata _reason)`

Public owner-only function that revokes an issued academy identity.

What it does:

- Requires a non-zero academy address.
- Reverts if the academy was never issued.
- Reverts if the academy is already revoked.
- Marks the academy as revoked and stores the revocation timestamp, revoker, and reason.
- Emits `AcademyRevoked`.

## ProfessorIdentity

`ProfessorIdentity` manages professor records and depends on an active academy identity. Professors can only be issued by the contract owner for a registered academy.

### `_validateProfessorInfos(ProfessorIssueArgs calldata i, uint256 currentTime)`

Internal pure helper that validates professor issuance fields. It checks the public key, signature, employee ID length, national ID, full name, rank enum, employment type enum, and ensures the hire date is not in the future.

### `_validateProfessorIssue(address _professorAddress, address _academyAddress, ProfessorIssueArgs calldata args, uint256 currentTime)`

Internal pure helper that validates the overall professor issuance request. It requires both addresses to be set and delegates field validation to `_validateProfessorInfos`.

### `issueProfessorIdentity(address _professorAddress, address _academyAddress, ProfessorIssueArgs calldata args)`

Public owner-only function that issues a professor identity on behalf of a specific academy.

What it does:

- Requires the academy to already exist and remain active.
- Validates the professor payload.
- Ensures the professor address has not already been issued.
- Hashes the employee ID and national ID to enforce uniqueness.
- Prevents reuse of the same employee ID within the same academy.
- Prevents reuse of the same national ID globally.
- Stores the professor identity and active status.
- Emits `ProfessorIssued`.

### `revokeProfessorIdentity(address _professorAddress, address _revokerAddress, string calldata _reason)`

Public owner-only function that revokes a professor identity.

What it does:

- Requires the revoker to be a registered academy.
- Requires the professor to have been issued already.
- Reverts if the professor is already revoked.
- Requires the revoker to match the issuing academy.
- Marks the professor as revoked and stores the revocation metadata.
- Emits `ProfessorRevoked`.

## StudentIdentity

`StudentIdentity` manages student records and depends on an active academy identity. It follows the same issue/revoke pattern as professors, with student-specific fields.

### `_validateStudentInfos(StudentIssueArgs calldata i, uint256 _currentTime)`

Internal pure helper that validates student issuance fields. It checks the public key, signature, student ID, full name, nationality, department, country, and enrollment date.

### `_validateStudentIssue(address _studentAddress, address _academyAddress, StudentIssueArgs calldata args, uint256 _currentTime)`

Internal pure helper that validates the overall student issuance request. It requires both addresses to be set and then validates the student fields.

### `issueStudentIdentity(address _studentAddress, address _academyAddress, StudentIssueArgs calldata args)`

Public owner-only function that issues a student identity for a specific academy.

What it does:

- Requires the academy to already exist and remain active.
- Validates the student payload.
- Ensures the student address has not already been issued.
- Hashes the student ID and national ID for uniqueness checks.
- Prevents reuse of the same student ID within the same academy.
- Prevents reuse of the same national ID globally.
- Reads the academy name and stores it in the student record.
- Stores the student identity and active status.
- Emits `StudentIssued`.

### `revokeStudentIdentity(address _studentAddress, address _revokerAddress, string calldata _reason)`

Public owner-only function that revokes a student identity.

What it does:

- Requires the revoker to be a registered academy.
- Requires the student to have been issued already.
- Reverts if the student is already revoked.
- Requires the revoker to match the issuing academy.
- Marks the student as revoked and stores the revocation metadata.
- Emits `StudentRevoked`.

## Credential

`Credential` manages credentials issued to students. It builds on the academy, professor, and student identity layers so credentials can only be issued by authorized parties.

### `_validateCredentialInfos(CredentialInfosArgs calldata i)`

Internal pure helper that validates credential metadata. It enforces title length limits, requires a code, caps the code length, caps the description length, and validates the credential type enum range.

### `_validateCredentialPayload(CredentialPayloadArgs calldata p)`

Internal pure helper that validates the credential payload. It requires a non-zero payload hash and a non-empty encrypted payload.

### `_validateCredentialAuthorities(address _studentAddress, address _issuerAddress, address _academyAddress)`

Internal view helper that validates the relationship between the student, issuer, and academy.

What it checks:

- All three addresses must be set.
- The academy must exist and be active.
- The student must exist and be active.
- The student must belong to the specified academy.
- If the issuer is not the academy, the issuer must be a professor.
- The professor must exist, be active, and belong to the same academy.

This function is the main authorization gate before a credential can be issued.

### `issueCredential(address _studentAddress, address _issuerAddress, address _academyAddress, CredentialIssueArgs calldata args)`

External owner-only function that issues a credential to a student.

What it does:

- Validates the student, issuer, and academy relationships.
- Validates the credential metadata and payload.
- Requires a non-empty signature.
- Prevents reuse of the same payload hash across credentials.
- Reads the academy name from the academy identity record.
- Appends a new credential entry to the student’s credential list.
- Marks the payload hash as used.
- Emits `CredentialIssued` with the student address, issuer address, payload hash, and list index.

### `revokeCredential(address _studentAddress, uint256 _index, address _revokerAddress, string calldata _reason)`

External owner-only function that revokes a specific credential entry for a student.

What it does:

- Requires the revoker to be a registered academy.
- Requires the student address to be set.
- Verifies that the requested credential index exists.
- Reverts if the selected credential is already revoked.
- Requires the revoker to be the issuing academy for that credential.
- Marks the credential as revoked and stores the revocation metadata.
- Emits `CredentialRevoked`.

### `getCredentialCount(address _studentAddress)`

External view function that returns the number of credentials stored for a student address.

### `getCredential(address _studentAddress, uint256 _index)`

External view function that returns a single credential by index for a student address.

What it does:

- Requires the student address to be set.
- Reverts if the index is out of range.
- Returns the stored credential data structure.

## Practical Notes

- All issuance and revocation flows are controlled by the contract owner.
- Academy issuance is the root authorization step for professor, student, and credential workflows.
- The contracts rely on hashes to enforce uniqueness without iterating over arrays.
- Public keys and signatures are expected to be 65 bytes long.
- Most validation failures revert early with a descriptive error string or custom error.

## Events

The contracts emit events when identities or credentials are issued or revoked. These events are the main on-chain signal for off-chain services such as APIs, listeners, or indexers.

- `AcademyIssued` / `AcademyRevoked`
- `ProfessorIssued` / `ProfessorRevoked`
- `StudentIssued` / `StudentRevoked`
- `CredentialIssued` / `CredentialRevoked`

## Custom Errors

The contracts define custom errors to make revert reasons more explicit and gas-efficient. The most important ones are:

- `InvalidAddress`, `InvalidPublicKey`, `InvalidSignature`, `InvalidString`, `InvalidNumber`
- `AcademyIdentityAlreadyIssued`, `AcademyIdAlreadyUsed`, `AcademyNameShortNameAlreadyUsed`, `AcademyLegalBundleAlreadyUsed`, `AcademyIdentityNotIssued`, `AcademyIdentityAlreadyRevoked`
- `ProfessorIdentityAlreadyIssued`, `ProfessorEmployeeIdAlreadyUsed`, `ProfessorNationalIdAlreadyUsed`, `ProfessorIdentityNotIssued`, `ProfessorIdentityAlreadyRevoked`
- `StudentIdentityAlreadyIssued`, `StudentIdAlreadyUsed`, `StudentNationalIdAlreadyUsed`, `StudentIdentityNotIssued`, `StudentIdentityAlreadyRevoked`
- `InvalidCredentialType`, `InvalidPayloadHash`, `InvalidPayloadSignature`, `InvalidEncryptedPayload`, `CredentialPayloadAlreadyUsed`, `CredentialIndexOutOfRange`, `CredentialAlreadyRevoked`

## Summary

The system is organized as a single identity and credential hierarchy:

- `S2dent` validates inputs and owner signatures.
- `AcademyIdentity` establishes trusted academies.
- `ProfessorIdentity` and `StudentIdentity` register people under those academies.
- `Credential` issues revocable credentials only when the academy and issuer relationships are valid.

This design keeps authorization centralized, enforces identity uniqueness with hashes, and gives off-chain services a clear event trail to follow.