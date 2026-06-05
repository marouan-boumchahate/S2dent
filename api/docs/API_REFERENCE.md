# S2dent API Reference

## Overview
S2dent is a blockchain-backed decentralized identity platform for educational institutions. The backend is Node.js + Express, persists operational data in PostgreSQL, and bridges to Ethereum smart contracts for identity issuance, revocation, and credential signing.

### Base URL
- Production: `https://s2dent.tech/api`
- Development: `http://localhost:3000/api`

### Auth mechanism
1. A caller requests a nonce with `GET /auth/nonce` for a registered wallet or `GET /auth/admin/nonce` for the admin flow.
2. The backend caches the nonce for 5 minutes and returns a message in the form `Sign this nonce to authenticate: <nonce>`.
3. The caller signs the message with the wallet that owns the identity and submits the signature to `POST /auth/verify`.
4. The backend validates the DB identity, on-chain identity state, nonce freshness, and recovered signer, then issues an encrypted access token plus encrypted refresh token.
5. Refresh tokens are cached with an IP + user-agent binding, so `POST /auth/refresh` only works from the same device and IP.
6. The admin flow uses the smart contract verification check (`isMessageSignedByOwner`) and returns an admin-level token pair.
7. OTP-based identity issuance uses `POST /auth/otp/send` to send a 6-character code that is later consumed by identity request-issuance endpoints.

### Role hierarchy
- Admin: platform superuser role used for institution administration.
- Academy: institution-level account.
- Professor: faculty-level account.
- Student: learner-level account.
- Verifier: internal credential-verification role used by credential verification endpoints.
- The practical ordering enforced by the platform is admin > academy > professor > student.

### Standard response envelope
Successful responses use the same envelope everywhere:
```json
{
  "success": true,
  "data": {
    "example": "value"
  },
  "message": "Human readable status text"
}
```

Validation and error responses use:
```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Validation failed",
  "errors": [
    {
      "field": "wallet_address",
      "message": "\"wallet_address\" is required"
    }
  ]
}
```

### Standard error codes table
| Code | HTTP | Meaning |
| --- | --- | --- |
| `VALIDATION_ERROR` | 422 | Request body or query validation failed. |
| `UNAUTHORIZED` | 401 | Missing, expired, invalid, or mismatched token/refresh token. |
| `FORBIDDEN` | 403 | Caller has a valid token but lacks the required role. |
| `INVALID_NONCE` | 400 | A nonce is missing, expired, or invalid. |
| `INVALID_SIGNATURE` | 400/401 | The recovered signer does not match the expected wallet. |
| `IDENTITY_NOT_FOUND` | 404 | No matching identity exists for the requested wallet. |
| `IDENTITY_REVOKED` | 403 | The on-chain identity has been revoked. |
| `EMAIL_NOT_FOUND` | 404 | The email is not registered to a user or academy account. |
| `USER_NOT_FOUND` | 404 | User lookup failed. |
| `ACADEMY_NOT_FOUND` | 404 | Academy lookup failed or the academy is inactive. |
| `ACADEMY_ADDRESS_REQUIRED` | 409 | Academy profile is missing a required address before issuance. |
| `DEPARTMENT_NOT_FOUND` | 404 | Department lookup failed. |
| `DEPARTMENT_INACTIVE` | 403 | The related department is not active. |
| `ADDRESS_NOT_FOUND` | 400/404 | A required address record is missing. |
| `STUDENT_NOT_FOUND` | 404 | Student lookup failed or the student is inactive. |
| `PROFESSOR_NOT_FOUND` | 404 | Professor lookup failed or the professor is inactive. |
| `CREDENTIAL_NOT_FOUND` | 404 | Credential lookup failed. |
| `CREDENTIAL_DATA_INTEGRITY_ERROR` | 500 | Stored payload hash does not match the current payload. |
| `BLOCKCHAIN_ERROR` | 502 | A smart contract call failed. |
| `WALLET_ADDRESS_NOT_UNIQUE` | 409 | Wallet already belongs to another identity. |
| `USER_NOT_UNIQUE` | 409 | Email or national ID already exists. |
| `ACADEMY_EMAIL_DUPLICATE` | 409 | Academy email already exists. |
| `ACADEMY_DUPLICATE` | 409 | Academy name already exists. |
| `ACADEMY_SHORT_NAME_DUPLICATE` | 409 | Academy short name already exists. |

## Modules

## Auth

### GET /api/auth/admin/nonce
- Summary: Generates a 5-minute nonce for the admin authentication flow.
- Auth: None
- Roles: public
- Middleware: none
- Path Params: None
- Query Params: None
- Request Body: None
- Success Response 2xx:
```json
{
  "success": true,
  "data": {
    "message": "Sign this nonce to authenticate as admin: 9c8f2a6d1b7e4f3c..."
  },
  "message": "Nonce expires in 5 minutes"
}
```
Error Responses:
- 500 INTERNAL_ERROR: unexpected failure while generating or caching the nonce.
Side Effects:
- Blockchain: none
- Socket: none
- Email: none

### GET /api/auth/nonce
- Summary: Generates a 5-minute nonce for a registered wallet identity.
- Auth: None
- Roles: public
- Middleware: `validate(generateNonceSchema, 'query') -> generateNonceController`
- Path Params: None
- Query Params:
  - `wallet_address` | `string` | required | Ethereum address tied to the identity record.
- Request Body: None
- Success Response 2xx:
```json
{
  "success": true,
  "data": {
    "message": "Sign this nonce to authenticate: 2f7eab1c9d4f0a6b..."
  },
  "message": "Nonce expires in 5 minutes"
}
```
Error Responses:
- 422 VALIDATION_ERROR: wallet_address is missing or malformed.
- 404 IDENTITY_NOT_FOUND: no DB identity exists for the wallet.
- 403 IDENTITY_REVOKED: the on-chain identity is revoked.
- 400 INVALID_ROLE: the identity role cannot be used for nonce generation.
- 502 BLOCKCHAIN_ERROR: on-chain identity lookup failed.
Side Effects:
- Blockchain: reads the relevant identity contract record.
- Socket: none
- Email: none

### POST /api/auth/verify
- Summary: Verifies a signed nonce and returns encrypted access and refresh tokens.
- Auth: None
- Roles: public
- Middleware: `authLimiter -> validate(verifySignatureSchema) -> verifySignatureController`
- Path Params: None
- Query Params: None
- Request Body:
  - `wallet_address` | `string` | required | Wallet that signed the nonce.
  - `signature` | `string` | required | 132-character Ethereum signature over the nonce message.
```json
{
  "wallet_address": "0x7cB57B5A97eAbe94205C07890BE6d4E79C4eE6b6",
  "signature": "0x9f1d7c4a8a6a3e5f2b3d4c6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3"
}
```
Success Response 2xx:
```json
{
  "success": true,
  "data": {
    "access_token": "3a9b2c1d:7f2e9a11:8c7d6e5f...",
    "refresh_token": "5c6d7e8f:1a2b3c4d:9e8f7a6b..."
  },
  "message": "User authenticated successfully"
}
```
Error Responses:
- 422 VALIDATION_ERROR: body is missing required fields or signature length is invalid.
- 400 INVALID_NONCE: stored nonce is missing or expired.
- 401 INVALID_SIGNATURE: recovered signer does not match the requested wallet.
- 401 UNAUTHORIZED: refresh token/session state cannot be established.
- 404 IDENTITY_NOT_FOUND: wallet has no registered identity.
- 403 IDENTITY_REVOKED: on-chain identity is revoked.
- 502 BLOCKCHAIN_ERROR: on-chain identity lookup failed.
Side Effects:
- Blockchain: reads identity state only.
- Socket: none
- Email: none

### POST /api/auth/admin/verify
- Summary: Verifies an admin signature and issues encrypted tokens.
- Auth: None
- Roles: public
- Middleware: `authLimiter -> validate(verifyAdminSignatureSchema, 400) -> verifyAdminSignatureController`
- Path Params: None
- Query Params: None
- Request Body:
- `signature` | `string` | required | 132-character Ethereum signature over the admin nonce message.
```json
{
  "signature": "0xa7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5"
}
```
Success Response 2xx:
```json
{
  "success": true,
  "data": {
    "access_token": "4d3c2b1a:9f8e7d6c:5b4a3928...",
    "refresh_token": "1f2e3d4c:6a7b8c9d:0e1f2a3b..."
  },
  "message": "Admin authenticated successfully"
}
```
Error Responses:
- 400 INVALID_NONCE: admin nonce is missing or expired.
- 401 INVALID_SIGNATURE: signature does not prove admin-level control.
- 422 VALIDATION_ERROR: signature is missing or malformed.
- 502 BLOCKCHAIN_ERROR: admin-signature verification failed at the contract layer.
Side Effects:
- Blockchain: reads `isMessageSignedByOwner` on the S2dent contract.
- Socket: none
- Email: none

### POST /api/auth/refresh
- Summary: Exchanges a valid refresh token for a new access token.
- Auth: None
- Roles: public
- Middleware: `validate(refreshTokenSchema) -> refreshTokenController`
- Path Params: None
- Query Params: None
- Request Body:
  - `refresh_token` | `string` | required | Encrypted refresh token issued by the login flow.
```json
{
  "refresh_token": "5c6d7e8f:1a2b3c4d:9e8f7a6b..."
}
```
Success Response 2xx:
```json
{
  "success": true,
  "data": {
    "access_token": "9c8b7a6d:5e4f3a2b:1c0d9e8f...",
    "refresh_token": "5c6d7e8f:1a2b3c4d:9e8f7a6b..."
  },
  "message": "Token refreshed successfully"
}
```
Error Responses:
- 422 VALIDATION_ERROR: refresh_token is missing.
- 401 UNAUTHORIZED: token is invalid, expired, revoked, or used from the wrong IP/device.
- 404 IDENTITY_NOT_FOUND: the subject's on-chain identity no longer exists.
- 403 IDENTITY_REVOKED: the on-chain identity has been revoked.
- 502 BLOCKCHAIN_ERROR: on-chain identity check failed.
Side Effects:
- Blockchain: reads identity state before refreshing.
- Socket: none
- Email: none

### DELETE /api/auth/logout
- Summary: Revokes the current refresh token from cache.
- Auth: None
- Roles: public
- Middleware: `validate(refreshTokenSchema) -> logoutController`
- Path Params: None
- Query Params: None
- Request Body:
  - `refresh_token` | `string` | required | Encrypted refresh token to revoke.
```json
{
  "refresh_token": "5c6d7e8f:1a2b3c4d:9e8f7a6b..."
}
```
Success Response 2xx:

### POST /api/auth/otp/send
 - Auth: None
 - Roles: public
 - Middleware: `authLimiter -> validate(sendOtpSchema) -> sendOtpController`
Path Params: None
Query Params: None
Request Body:
 - `email` | `string` | required | Email that must already belong to a user or academy record.
```json
{
  "email": "fatima.hassan@s2dent.edu"
}
```
Success Response 2xx:
```json
{
  "success": true,
  "data": {
    "message": "Sign this nonce to verify your identity: 0a9f2b3c..."
  },
  "message": "check your email for the OTP code"
}
```
Error Responses:
- 422 VALIDATION_ERROR: email is missing or invalid.
- 404 EMAIL_NOT_FOUND: email is not registered.
- 502 INTERNAL_ERROR: mail delivery or cache write failed.
Side Effects:
- Blockchain: none
- Socket: none
- Email: sends the OTP message.

## Academies

### GET /api/academies
 - Summary: Lists all academies visible to the admin role.
 - Auth: Required
 - Roles: admin
 - Middleware: `authenticate -> requireRole('admin') -> getAllAcademiesController`
 - Path Params: None
 - Query Params: None
 - Request Body: None
 - Success Response 2xx:
```json
{
  "success": true,
  "data": {
    "academies": [
      {
        "id": "5d9f4ce2-6f43-4c0f-b9aa-0f3e2c0c3a12",
        "serial_number": "ACD_2605311",
        "email": "info@northgate.edu",
        "name": "Northgate University",
        "short_name": "NGU",
        "type": "university",
        "description": "Private university focused on engineering and health sciences.",
        "website": "https://northgate.edu",
        "logo_url": "https://cdn.s2dent.io/academies/ngu.png",
        "phone": "+233501234567",
        "legal_name": "Northgate University Limited",
        "registration_number": "REG-2026-0019",
        "tax_id": "TIN-99887766",
        "billing_email": "billing@northgate.edu"
      }
    ]
  },
  "message": "Academies retrieved successfully"
}
```
Error Responses:
- 401 UNAUTHORIZED: bearer token missing or invalid.
- 403 FORBIDDEN: caller is not an admin.
- 502 BLOCKCHAIN_ERROR: academy listing query depends on contract-backed identity state.
Side Effects:
- Blockchain: reads identity state from the academy identity tables and pending transaction ledger.
- Socket: none
- Email: none

### GET /api/academies/summary
 - Summary: Returns a compact academy view for a professor or student.
 - Auth: Required
 - Roles: professor | student
 - Middleware: `authenticate -> requireRole('professor', 'student') -> getAcademySummaryController`
 - Path Params: None
 - Query Params: None
 - Request Body: None
 - Success Response 2xx:
```json
{
  "success": true,
  "data": {
    "academy": {
      "id": "5d9f4ce2-6f43-4c0f-b9aa-0f3e2c0c3a12",
      "email": "info@northgate.edu",
      "name": "Northgate University",
      "short_name": "NGU",
      "description": "Private university focused on engineering and health sciences.",
      "website": "https://northgate.edu",
      "logo_url": "https://cdn.s2dent.io/academies/ngu.png",
      "phone": "+233501234567"
    }
  },
  "message": "Academy summary retrieved successfully"
}
```
Error Responses:
- 401 UNAUTHORIZED: bearer token missing or invalid.
- 403 FORBIDDEN: caller is not a professor or student.
- 400 INVALID_ROLE: role is not supported by the summary lookup.
- 404 ACADEMY_NOT_FOUND: the caller is not attached to an active academy.
Side Effects:
- Blockchain: none
- Socket: none
- Email: none

### GET /api/academies/:id
 - Summary: Returns a specific academy by DB id for the admin role.
 - Auth: Required
 - Roles: admin
 - Middleware: `authenticate -> requireRole('admin') -> getAcademyByIdController`
 - Path Params:
   - `id` | `string` | required | Academy DB UUID.
 - Query Params: None
 - Request Body: None
 - Success Response 2xx:
```json
{
  "success": true,
  "data": {
    "academy": {
      "id": "5d9f4ce2-6f43-4c0f-b9aa-0f3e2c0c3a12",
      "serial_number": "ACD_2605311",
      "email": "info@northgate.edu",
      "name": "Northgate University",
      "short_name": "NGU",
      "type": "university",
      "description": "Private university focused on engineering and health sciences.",
      "website": "https://northgate.edu",
      "logo_url": "https://cdn.s2dent.io/academies/ngu.png",
      "phone": "+233501234567",
      "legal_name": "Northgate University Limited",
      "registration_number": "REG-2026-0019",
      "tax_id": "TIN-99887766",
      "billing_email": "billing@northgate.edu"
    }
  },
  "message": "Academy retrieved successfully"
}
```
Error Responses:
- 401 UNAUTHORIZED: bearer token missing or invalid.
- 403 FORBIDDEN: caller is not an admin.
- 404 ACADEMY_NOT_FOUND: academy does not exist or has no active identity.
Side Effects:
- Blockchain: reads academy identity state.
- Socket: none
- Email: none

### POST /api/academies
 - Summary: Creates a new academy record.
 - Auth: Required
 - Roles: admin
 - Middleware: `authenticate -> requireRole('admin') -> validate(createAcademySchema) -> createAcademyController`
 - Path Params: None
 - Query Params: None
Request Body:
- `email` | `string` | required | Academy contact email.
- `name` | `string` | required | Legal display name.
- `short_name` | `string` | required | Short name used for the academy code.
- `type` | `string` | required | One of university, college, school, institute, online_platform, other.
- `description` | `string` | optional | Public description.
- `website` | `string` | optional | Public website URL.
- `logo_url` | `string` | optional | Logo image URL.
- `phone` | `string` | optional | Contact phone number.
- `legal_name` | `string` | required | Registered legal name.
- `registration_number` | `string` | required | Government registration number.
- `tax_id` | `string` | required | Tax identifier.
- `billing_email` | `string` | optional | Billing mailbox.
```json
{
  "email": "info@northgate.edu",
  "name": "Northgate University",
  "short_name": "ngu",
  "type": "university",
  "description": "Private university focused on engineering and health sciences.",
  "website": "https://northgate.edu",
  "logo_url": "https://cdn.s2dent.io/academies/ngu.png",
  "phone": "+233501234567",
  "legal_name": "Northgate University Limited",
  "registration_number": "REG-2026-0019",
  "tax_id": "TIN-99887766",
  "billing_email": "billing@northgate.edu"
}
```
Success Response 2xx:
```json
{
  "success": true,
  "data": {
    "academy": {
      "id": "5d9f4ce2-6f43-4c0f-b9aa-0f3e2c0c3a12",
      "serial_number": "ACD_2605311",
      "email": "info@northgate.edu",
      "name": "Northgate University",
      "short_name": "NGU",
      "type": "university",
      "description": "Private university focused on engineering and health sciences.",
      "website": "https://northgate.edu",
      "logo_url": "https://cdn.s2dent.io/academies/ngu.png",
      "phone": "+233501234567",
      "legal_name": "Northgate University Limited",
      "registration_number": "REG-2026-0019",
      "tax_id": "TIN-99887766",
      "billing_email": "billing@northgate.edu"
    }
  },
  "message": "Academy registered successfully"
}
```
Error Responses:
- 422 VALIDATION_ERROR: schema fields are missing or invalid.
- 409 ACADEMY_EMAIL_DUPLICATE: email already exists.
- 409 ACADEMY_DUPLICATE: academy name already exists.
- 409 ACADEMY_SHORT_NAME_DUPLICATE: academy short name already exists.
- 401 UNAUTHORIZED: bearer token missing or invalid.
- 403 FORBIDDEN: caller is not an admin.
Side Effects:
- Blockchain: none
- Socket: none
- Email: none

### PUT /api/academies/me
 - Summary: Updates the authenticated academy profile.
 - Auth: Required
 - Roles: academy
 - Middleware: `authenticate -> requireRole('academy') -> validate(updateAcademySchema) -> updateAcademyController`
 - Path Params: None
 - Query Params: None
 - Request Body:
   - `description` | `string` | optional | Public description.
   - `website` | `string` | optional | Public website URL.
- `logo_url` | `string` | optional | Logo image URL.
- `phone` | `string` | optional | Contact phone number.
```json
{
  "description": "Updated description for the academy.",
  "website": "https://northgate.edu/about",
  "logo_url": "https://cdn.s2dent.io/academies/ngu-new.png",
  "phone": "+233501234568"
}
```
Success Response 2xx:
```json
{
  "success": true,
  "data": {
    "academy": {
      "id": "5d9f4ce2-6f43-4c0f-b9aa-0f3e2c0c3a12",
      "serial_number": "ACD_2605311",
      "email": "info@northgate.edu",
      "name": "Northgate University",
      "short_name": "NGU",
      "type": "university",
      "description": "Updated description for the academy.",
      "website": "https://northgate.edu/about",
      "logo_url": "https://cdn.s2dent.io/academies/ngu-new.png",
      "phone": "+233501234568",
      "legal_name": "Northgate University Limited",
      "registration_number": "REG-2026-0019",
      "tax_id": "TIN-99887766",
      "billing_email": "billing@northgate.edu"
    }
  },
  "message": "Academy updated successfully"
}
```
Error Responses:
- 422 VALIDATION_ERROR: at least one update field is required.
- 401 UNAUTHORIZED: bearer token missing or invalid.
- 403 FORBIDDEN: caller is not an academy.
- 404 ACADEMY_NOT_FOUND: academy has no active identity or no record exists.
Side Effects:
- Blockchain: none
- Socket: none
- Email: none

## Professors

### GET /api/professors
 - Summary: Lists all professors in the authenticated academy.
 - Auth: Required
 - Roles: academy
 - Middleware: `authenticate -> requireRole('academy') -> getAllProfessorsController`
 - Path Params: None
 - Query Params: None
 - Request Body: None
 - Success Response 2xx:
```json
{
  "success": true,
  "data": {
    "professors": [
      {
        "id": "a96e27d4-90cf-47d5-8aa4-9d7b2cdd8d8a",
        "wallet_address": "0x2f8B0d6c1bE7E3A0b0C2E4D5f6A7B8C9d0E1F2a3",
        "name": "Dr. Amina Yusuf",
        "department": "Computer Science",
        "last_transaction_status": "verified",
        "issued_at": "2026-05-30T10:20:31.000Z",
        "is_revoked": false,
        "email": "amina.yusuf@northgate.edu"
      }
    ]
  },
  "message": "All professors retrieved successfully"
}
```
Error Responses:
- 401 UNAUTHORIZED: bearer token missing or invalid.
- 403 FORBIDDEN: caller is not an academy.
Side Effects:
- Blockchain: reads professor identity and pending transaction state.
- Socket: none
- Email: none

### GET /api/professors/names
 - Summary: Returns professor ids and display names for the authenticated academy.
 - Auth: Required
 - Roles: academy
 - Middleware: `authenticate -> requireRole('academy') -> getAllProfessorsNamesController`
 - Path Params: None
 - Query Params: None
 - Request Body: None
Success Response 2xx:
```json
{
  "success": true,
  "data": [
    {
      "id": "a96e27d4-90cf-47d5-8aa4-9d7b2cdd8d8a",
      "full_name": "Dr. Amina Yusuf"
    }
  ],
  "message": "All professors names retrieved successfully"
}
```
Error Responses:
- 401 UNAUTHORIZED: bearer token missing or invalid.
- 403 FORBIDDEN: caller is not an academy.
Side Effects:
- Blockchain: none
- Socket: none
- Email: none

### GET /api/professors/me
 - Summary: Returns the authenticated professor profile.
 - Auth: Required
 - Roles: professor
 - Middleware: `authenticate -> requireRole('professor') -> getMyProfileController`
 - Path Params: None
 - Query Params: None
 - Request Body: None
 - Success Response 2xx:
```json
{
  "success": true,
  "data": {
    "professor": {
      "id": "a96e27d4-90cf-47d5-8aa4-9d7b2cdd8d8a",
      "user_id": "2f9a4d1b-5e6c-4f7a-8a3f-9d0e1f2a3b4c",
      "academy_id": "5d9f4ce2-6f43-4c0f-b9aa-0f3e2c0c3a12",
      "department_id": "b6f4c29e-6d63-4b70-99a1-2c9d1d1b9f21",
      "serial_number": "EMP_2605312",
      "title": "Dr.",
      "rank": "Prof",
      "specialization": "Distributed systems",
      "hire_date": "2025-08-15T00:00:00.000Z",
      "employment_type": "full_time",
      "office_location": "Block B, Room 204",
      "office_hours": "Mon-Wed 10:00-14:00",
      "bio": "Researcher in distributed systems and applied cryptography.",
      "is_active": true
    }
  },
  "message": "Professor profile retrieved successfully"
}
```
Error Responses:
- 401 UNAUTHORIZED: bearer token missing or invalid.
- 403 FORBIDDEN: caller is not a professor.
- 404 PROFESSOR_NOT_FOUND: no active professor profile exists.
Side Effects:
- Blockchain: reads professor identity state.
- Socket: none
- Email: none

### GET /api/professors/:id
 - Summary: Returns a professor by DB id for the authenticated academy.
 - Auth: Required
 - Roles: academy
 - Middleware: `authenticate -> requireRole('academy') -> getProfessorByIdController`
 - Path Params:
   - `id` | `string` | required | Professor DB UUID.
 - Query Params: None
 - Request Body: None
Success Response 2xx:
```json
{
  "success": true,
  "data": {
    "professor": {
      "id": "a96e27d4-90cf-47d5-8aa4-9d7b2cdd8d8a",
      "user_id": "2f9a4d1b-5e6c-4f7a-8a3f-9d0e1f2a3b4c",
      "academy_id": "5d9f4ce2-6f43-4c0f-b9aa-0f3e2c0c3a12",
      "department_id": "b6f4c29e-6d63-4b70-99a1-2c9d1d1b9f21",
      "serial_number": "EMP_2605312",
      "title": "Dr.",
      "rank": "Prof",
      "specialization": "Distributed systems",
      "hire_date": "2025-08-15T00:00:00.000Z",
      "employment_type": "full_time",
      "office_location": "Block B, Room 204",
      "office_hours": "Mon-Wed 10:00-14:00",
      "bio": "Researcher in distributed systems and applied cryptography.",
      "is_active": true
    }
  },
  "message": "Professor retrieved successfully"
}
```
Error Responses:
- 401 UNAUTHORIZED: bearer token missing or invalid.
- 403 FORBIDDEN: caller is not an academy.
- 404 PROFESSOR_NOT_FOUND: no active professor profile exists.
Side Effects:
- Blockchain: reads professor identity state.
- Socket: none
- Email: none

### POST /api/professors
 - Summary: Creates a professor profile inside an academy.
 - Auth: Required
 - Roles: academy
 - Middleware: `authenticate -> requireRole('academy') -> validate(createProfessorSchema) -> createProfessorController`
 - Path Params: None
 - Query Params: None
 - Request Body:
   - `user_id` | `string` | required | Existing user UUID.
   - `academy_id` | `string` | required | Academy UUID that owns the professor.
- `department_id` | `string` | required | Department UUID inside the academy.
- `title` | `string` | required | Honorific or title.
- `rank` | `string` | required | One of Assist. Prof, Assoc. Prof, Prof, Lecturer, Instructor.
- `specialization` | `string` | optional | Academic specialization.
- `hire_date` | `date` | optional | ISO date.
- `employment_type` | `string` | optional | Defaults to full_time; one of full_time, part_time, adjunct, visiting, contract.
- `office_location` | `string` | optional | Office location.
- `office_hours` | `string` | optional | Office hours text.
- `bio` | `string` | optional | Profile biography.
```json
{
  "user_id": "2f9a4d1b-5e6c-4f7a-8a3f-9d0e1f2a3b4c",
  "academy_id": "5d9f4ce2-6f43-4c0f-b9aa-0f3e2c0c3a12",
  "department_id": "b6f4c29e-6d63-4b70-99a1-2c9d1d1b9f21",
  "title": "Dr.",
  "rank": "Prof",
  "specialization": "Distributed systems",
  "hire_date": "2025-08-15",
  "employment_type": "full_time",
  "office_location": "Block B, Room 204",
  "office_hours": "Mon-Wed 10:00-14:00",
  "bio": "Researcher in distributed systems and applied cryptography."
}
```
Success Response 2xx:
```json
{
  "success": true,
  "data": {
    "professor": {
      "id": "a96e27d4-90cf-47d5-8aa4-9d7b2cdd8d8a",
      "user_id": "2f9a4d1b-5e6c-4f7a-8a3f-9d0e1f2a3b4c",
      "academy_id": "5d9f4ce2-6f43-4c0f-b9aa-0f3e2c0c3a12",
      "department_id": "b6f4c29e-6d63-4b70-99a1-2c9d1d1b9f21",
      "serial_number": "EMP_2605312",
      "title": "Dr.",
      "rank": "Prof",
      "specialization": "Distributed systems",
      "hire_date": "2025-08-15T00:00:00.000Z",
      "employment_type": "full_time",
      "office_location": "Block B, Room 204",
      "office_hours": "Mon-Wed 10:00-14:00",
      "bio": "Researcher in distributed systems and applied cryptography.",
      "is_active": true
    }
  },
  "message": "Professor registered successfully"
}
```
Error Responses:
- 422 VALIDATION_ERROR: required professor fields are missing or invalid.
- 404 USER_NOT_FOUND: user does not exist.
- 404 ACADEMY_NOT_FOUND: academy identity is inactive or missing.
- 404 DEPARTMENT_NOT_FOUND: department does not belong to the academy.
- 409 PROFESSOR_DUPLICATE: generated employee number already exists.
- 401 UNAUTHORIZED: bearer token missing or invalid.
- 403 FORBIDDEN: caller is not an academy.
Side Effects:
- Blockchain: none
- Socket: none
- Email: none

### PUT /api/professors/:id
 - Summary: Updates academy-managed professor metadata.
 - Auth: Required
 - Roles: academy
 - Middleware: `authenticate -> requireRole('academy') -> validate(updateProfessorByAdminSchema) -> updateProfessorByAdminController`
 - Path Params:
   - `id` | `string` | required | Professor DB UUID.
 - Query Params: None
 - Request Body:
   - `rank` | `string` | optional | One of Assist. Prof, Assoc. Prof, Prof, Lecturer, Instructor.
- `employment_type` | `string` | optional | One of full_time, part_time, adjunct, visiting, contract.
- `office_location` | `string` | optional | Office location.
- `office_hours` | `string` | optional | Office hours text.
```json
{
  "rank": "Assoc. Prof",
  "employment_type": "part_time",
  "office_location": "Block C, Room 12",
  "office_hours": "Tue-Thu 09:00-13:00"
}
```
Success Response 2xx:
```json
{
  "success": true,
  "data": {
    "professor": {
      "id": "a96e27d4-90cf-47d5-8aa4-9d7b2cdd8d8a",
      "user_id": "2f9a4d1b-5e6c-4f7a-8a3f-9d0e1f2a3b4c",
      "academy_id": "5d9f4ce2-6f43-4c0f-b9aa-0f3e2c0c3a12",
      "department_id": "b6f4c29e-6d63-4b70-99a1-2c9d1d1b9f21",
      "serial_number": "EMP_2605312",
      "title": "Dr.",
      "rank": "Assoc. Prof",
      "specialization": "Distributed systems",
      "hire_date": "2025-08-15T00:00:00.000Z",
      "employment_type": "part_time",
      "office_location": "Block C, Room 12",
      "office_hours": "Tue-Thu 09:00-13:00",
      "bio": "Researcher in distributed systems and applied cryptography.",
      "is_active": true
    }
  },
  "message": "Professor updated successfully"
}
```
Error Responses:
- 422 VALIDATION_ERROR: no editable field was provided or a value is invalid.
- 404 PROFESSOR_NOT_FOUND: the professor profile is missing or inactive.
- 401 UNAUTHORIZED: bearer token missing or invalid.
- 403 FORBIDDEN: caller is not an academy.
Side Effects:
- Blockchain: none
- Socket: none
- Email: none

### PUT /api/professors
 - Summary: Updates the authenticated professor bio.
 - Auth: Required
 - Roles: professor
 - Middleware: `authenticate -> requireRole('professor') -> validate(updateProfessorSchema) -> updateProfessorController`
 - Path Params: None
 - Query Params: None
 - Request Body:
   - `bio` | `string` | required | Professor biography.
```json
{
  "bio": "Researcher in distributed systems and applied cryptography."
}
```
Success Response 2xx:
```json
{
  "success": true,
  "data": {
    "professor": {
      "id": "a96e27d4-90cf-47d5-8aa4-9d7b2cdd8d8a",
      "user_id": "2f9a4d1b-5e6c-4f7a-8a3f-9d0e1f2a3b4c",
      "academy_id": "5d9f4ce2-6f43-4c0f-b9aa-0f3e2c0c3a12",
      "department_id": "b6f4c29e-6d63-4b70-99a1-2c9d1d1b9f21",
      "serial_number": "EMP_2605312",
      "title": "Dr.",
      "rank": "Prof",
      "specialization": "Distributed systems",
      "hire_date": "2025-08-15T00:00:00.000Z",
      "employment_type": "full_time",
      "office_location": "Block B, Room 204",
      "office_hours": "Mon-Wed 10:00-14:00",
      "bio": "Researcher in distributed systems and applied cryptography.",
      "is_active": true
    }
  },
  "message": "Professor updated successfully"
}
```
Error Responses:
- 422 VALIDATION_ERROR: bio is missing.
- 404 PROFESSOR_NOT_FOUND: the authenticated professor profile is missing or inactive.
- 401 UNAUTHORIZED: bearer token missing or invalid.
- 403 FORBIDDEN: caller is not a professor.
Side Effects:
- Blockchain: none
- Socket: none
- Email: none

## Students

### GET /api/students
 - Summary: Lists all students in the authenticated academy.
 - Auth: Required
 - Roles: academy
 - Middleware: `authenticate -> requireRole('academy') -> getAllStudentsController`
 - Path Params: None
 - Query Params: None
 - Request Body: None
 - Success Response 2xx:
```json
{
  "success": true,
  "data": {
    "students": [
      {
        "id": "9c5b1f1d-4d92-4d5a-9e2c-5f3d0e9a7b1c",
        "wallet_address": "0x4b5C6D7e8F9A0b1C2D3E4F5A6B7C8D9e0F1a2b3C",
        "name": "Mariam Bello",
        "serial_number": "STU_2605318",
        "department": "Computer Science",
        "advisor_name": "Dr. Amina Yusuf",
        "last_transaction_status": "verified",
        "issued_at": "2026-05-30T11:02:45.000Z",
        "is_revoked": false,
        "email": "mariam.bello@northgate.edu"
      }
    ]
  },
  "message": "All students retrieved successfully"
}
```
Error Responses:
- 401 UNAUTHORIZED: bearer token missing or invalid.
- 403 FORBIDDEN: caller is not an academy.
Side Effects:
- Blockchain: reads student identity and pending transaction state.
- Socket: none
- Email: none

### GET /api/students/me
 - Summary: Returns the authenticated student profile.
 - Auth: Required
 - Roles: student
 - Middleware: `authenticate -> requireRole('student') -> getMyProfileController`
 - Path Params: None
Query Params: None
Request Body: None
Success Response 2xx:
```json
{
  "success": true,
  "data": {
    "student": {
      "id": "9c5b1f1d-4d92-4d5a-9e2c-5f3d0e9a7b1c",
      "user_id": "4f8e1a2b-3c4d-5e6f-7a8b-9c0d1e2f3a4b",
      "academy_id": "5d9f4ce2-6f43-4c0f-b9aa-0f3e2c0c3a12",
      "department_id": "b6f4c29e-6d63-4b70-99a1-2c9d1d1b9f21",
      "advisor_id": "a96e27d4-90cf-47d5-8aa4-9d7b2cdd8d8a",
      "advisor_name": "Dr. Amina Yusuf",
      "student_number": "STU_2605318",
      "current_level": 2,
      "enrollment_status": "active",
      "cgpa": 4.28,
      "enrollment_date": "2025-09-01T00:00:00.000Z",
      "expected_graduation_date": "2029-09-01T00:00:00.000Z",
      "actual_graduation_date": null
    }
  },
  "message": "Student profile retrieved successfully"
}
```
Error Responses:
- 401 UNAUTHORIZED: bearer token missing or invalid.
- 403 FORBIDDEN: caller is not a student.
- 404 STUDENT_NOT_FOUND: no active student profile exists.
Side Effects:
- Blockchain: reads student identity state.
- Socket: none
- Email: none

### GET /api/students/:id
 - Summary: Returns a student by DB id for the authenticated academy.
 - Auth: Required
 - Roles: academy
 - Middleware: `authenticate -> requireRole('academy') -> getStudentByIdController`
 - Path Params:
   - `id` | `string` | required | Student DB UUID.
 - Query Params: None
 - Request Body: None
 - Success Response 2xx:
```json
{
  "success": true,
  "data": {
    "student": {
      "id": "9c5b1f1d-4d92-4d5a-9e2c-5f3d0e9a7b1c",
      "user_id": "4f8e1a2b-3c4d-5e6f-7a8b-9c0d1e2f3a4b",
      "academy_id": "5d9f4ce2-6f43-4c0f-b9aa-0f3e2c0c3a12",
      "department_id": "b6f4c29e-6d63-4b70-99a1-2c9d1d1b9f21",
      "advisor_id": "a96e27d4-90cf-47d5-8aa4-9d7b2cdd8d8a",
      "advisor_name": "Dr. Amina Yusuf",
      "student_number": "STU_2605318",
      "current_level": 2,
      "enrollment_status": "active",
      "cgpa": 4.28,
      "enrollment_date": "2025-09-01T00:00:00.000Z",
      "expected_graduation_date": "2029-09-01T00:00:00.000Z",
      "actual_graduation_date": null
    }
  },
  "message": "Student retrieved successfully"
}
```
Error Responses:
- 401 UNAUTHORIZED: bearer token missing or invalid.
- 403 FORBIDDEN: caller is not an academy.
- 404 STUDENT_NOT_FOUND: no active student profile exists.
Side Effects:
- Blockchain: reads student identity state.
- Socket: none
- Email: none

### POST /api/students
 - Summary: Creates a student profile inside an academy.
 - Auth: Required
 - Roles: academy
 - Middleware: `authenticate -> requireRole('academy') -> validate(createStudentSchema) -> createStudentController`
 - Path Params: None
 - Query Params: None
 - Request Body:
   - `user_id` | `string` | required | Existing user UUID.
   - `academy_id` | `string` | required | Academy UUID that owns the student.
   - `department_id` | `string` | required | Department UUID inside the academy.
   - `advisor_id` | `string` | required | Professor UUID used as the advisor.
   - `enrollment_status` | `string` | optional | One of active, inactive, graduated.
   - `enrollment_date` | `date` | optional | ISO date.
   - `actual_graduation_date` | `date` | optional | ISO date.
```json
{
  "user_id": "4f8e1a2b-3c4d-5e6f-7a8b-9c0d1e2f3a4b",
  "academy_id": "5d9f4ce2-6f43-4c0f-b9aa-0f3e2c0c3a12",
  "department_id": "b6f4c29e-6d63-4b70-99a1-2c9d1d1b9f21",
  "advisor_id": "a96e27d4-90cf-47d5-8aa4-9d7b2cdd8d8a",
  "enrollment_status": "active",
  "enrollment_date": "2025-09-01",
  "actual_graduation_date": null
}
```
Success Response 2xx:
```json
{
  "success": true,
  "data": {
    "student": {
      "id": "9c5b1f1d-4d92-4d5a-9e2c-5f3d0e9a7b1c",
      "user_id": "4f8e1a2b-3c4d-5e6f-7a8b-9c0d1e2f3a4b",
      "academy_id": "5d9f4ce2-6f43-4c0f-b9aa-0f3e2c0c3a12",
      "department_id": "b6f4c29e-6d63-4b70-99a1-2c9d1d1b9f21",
      "advisor_id": "a96e27d4-90cf-47d5-8aa4-9d7b2cdd8d8a",
      "advisor_name": "Dr. Amina Yusuf",
      "student_number": "STU_2605318",
      "current_level": 1,
      "enrollment_status": "active",
      "cgpa": null,
      "enrollment_date": "2025-09-01T00:00:00.000Z",
      "expected_graduation_date": "2029-09-01T00:00:00.000Z",
      "actual_graduation_date": null
    }
  },
  "message": "Student registered successfully"
}
```
Error Responses:
- 422 VALIDATION_ERROR: required student fields are missing or invalid.
- 404 USER_NOT_FOUND: user does not exist.
- 404 ACADEMY_NOT_FOUND: academy identity is inactive or missing.
- 404 PROFESSOR_NOT_FOUND: advisor does not belong to the academy.
- 409 STUDENT_NUMBER_DUPLICATE: generated student number already exists.
- 401 UNAUTHORIZED: bearer token missing or invalid.
- 403 FORBIDDEN: caller is not an academy.
Side Effects:
- Blockchain: none
- Socket: none
- Email: none

### PUT /api/students/:id
 - Summary: Updates student academic data for the authenticated academy.
 - Auth: Required
 - Roles: academy
 - Middleware: `authenticate -> requireRole('academy') -> validate(updateStudentSchema) -> updateStudentController`
 - Path Params:
   - `id` | `string` | required | Student DB UUID.
 - Query Params: None
 - Request Body:
   - `cgpa` | `number` | optional | CGPA between 0 and 5 with two decimals.
   - `advisor_id` | `string` | optional | Professor UUID used as the new advisor.
```json
{
  "cgpa": 4.31,
  "advisor_id": "a96e27d4-90cf-47d5-8aa4-9d7b2cdd8d8a"
}
```
Success Response 2xx:
```json
{
  "success": true,
  "data": {
    "student": {
      "id": "9c5b1f1d-4d92-4d5a-9e2c-5f3d0e9a7b1c",
      "user_id": "4f8e1a2b-3c4d-5e6f-7a8b-9c0d1e2f3a4b",
      "academy_id": "5d9f4ce2-6f43-4c0f-b9aa-0f3e2c0c3a12",
      "department_id": "b6f4c29e-6d63-4b70-99a1-2c9d1d1b9f21",
      "advisor_id": "a96e27d4-90cf-47d5-8aa4-9d7b2cdd8d8a",
      "advisor_name": "Dr. Amina Yusuf",
      "student_number": "STU_2605318",
      "current_level": 2,
      "enrollment_status": "active",
      "cgpa": 4.31,
      "enrollment_date": "2025-09-01T00:00:00.000Z",
      "expected_graduation_date": "2029-09-01T00:00:00.000Z",
      "actual_graduation_date": null
    }
  },
  "message": "Student updated successfully"
}
```
Error Responses:
- 422 VALIDATION_ERROR: cgpa or advisor_id is invalid.
- 404 STUDENT_NOT_FOUND: the student profile is missing or inactive.
- 404 PROFESSOR_NOT_FOUND: the new advisor does not belong to the academy.
- 401 UNAUTHORIZED: bearer token missing or invalid.
- 403 FORBIDDEN: caller is not an academy.
Side Effects:
- Blockchain: none
- Socket: none
- Email: none

## Users

### POST /api/users
 - Summary: Creates a person-level user profile.
 - Auth: Required
 - Roles: academy
 - Middleware: `authenticate -> requireRole('academy') -> validate(createUserSchema) -> createUserController`
 - Path Params: None
 - Query Params: None
 - Request Body:
   - `first_name` | `string` | required | First name.
   - `middle_name` | `string` | optional | Middle name.
- `last_name` | `string` | required | Last name.
- `date_of_birth` | `date` | required | ISO date.
- `gender` | `string` | required | One of male or female.
- `nationality` | `string` | required | Nationality text.
- `national_id` | `string` | required | National ID number.
- `email` | `string` | required | Unique email address.
- `phone` | `string` | optional | International phone number.
- `photo_url` | `string` | optional | Profile photo URL.
```json
{
  "first_name": "Mariam",
  "middle_name": "A",
  "last_name": "Bello",
  "date_of_birth": "2004-02-18",
  "gender": "female",
  "nationality": "Ghanaian",
  "national_id": "GHA-1234567-8",
  "email": "mariam.bello@northgate.edu",
  "phone": "+233501112223",
  "photo_url": "https://cdn.s2dent.io/users/mariam.jpg"
}
```
Success Response 2xx:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "4f8e1a2b-3c4d-5e6f-7a8b-9c0d1e2f3a4b",
      "first_name": "Mariam",
      "middle_name": "A",
      "last_name": "Bello",
      "full_name": "Mariam A Bello",
      "date_of_birth": "2004-02-18T00:00:00.000Z",
      "gender": "female",
      "nationality": "Ghanaian",
      "national_id": "GHA-1234567-8",
      "email": "mariam.bello@northgate.edu",
      "phone": "+233501112223",
      "photo_url": "https://cdn.s2dent.io/users/mariam.jpg",
      "notes": null
    }
  },
  "message": "User registered successfully"
}
```
Error Responses:
- 422 VALIDATION_ERROR: required fields are missing or invalid.
- 409 USER_NOT_UNIQUE: email or national ID already exists.
- 401 UNAUTHORIZED: bearer token missing or invalid.
- 403 FORBIDDEN: caller is not an academy.
Side Effects:
- Blockchain: none
- Socket: none
- Email: none

### PUT /api/users
 - Summary: Updates the authenticated professor or student profile contact data.
 - Auth: Required
 - Roles: professor | student
 - Middleware: `authenticate -> requireRole('professor', 'student') -> validate(updateUserSchema) -> updateUserController`
 - Path Params: None
 - Query Params: None
 - Request Body:
   - `phone` | `string` | optional | International phone number.
- `photo_url` | `string` | optional | Profile photo URL.
```json
{
  "phone": "+233501112224",
  "photo_url": "https://cdn.s2dent.io/users/mariam-new.jpg"
}
```
Success Response 2xx:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "4f8e1a2b-3c4d-5e6f-7a8b-9c0d1e2f3a4b",
      "first_name": "Mariam",
      "middle_name": "A",
      "last_name": "Bello",
      "full_name": "Mariam A Bello",
      "date_of_birth": "2004-02-18T00:00:00.000Z",
      "gender": "female",
      "nationality": "Ghanaian",
      "national_id": "GHA-1234567-8",
      "email": "mariam.bello@northgate.edu",
      "phone": "+233501112224",
      "photo_url": "https://cdn.s2dent.io/users/mariam-new.jpg",
      "notes": null
    }
  },
  "message": "User updated successfully"
}
```
Error Responses:
- 422 VALIDATION_ERROR: update fields are missing or invalid.
- 404 USER_NOT_FOUND: no active user profile exists.
- 401 UNAUTHORIZED: bearer token missing or invalid.
- 403 FORBIDDEN: caller is neither professor nor student.
Side Effects:
- Blockchain: none
- Socket: none
- Email: none

### GET /api/users/me
 - Summary: Returns the authenticated professor or student user profile.
 - Auth: Required
 - Roles: professor | student
 - Middleware: `authenticate -> requireRole('professor', 'student') -> getMyProfileController`
 - Path Params: None
 - Query Params: None
 - Request Body: None
 - Success Response 2xx:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "4f8e1a2b-3c4d-5e6f-7a8b-9c0d1e2f3a4b",
      "first_name": "Mariam",
      "middle_name": "A",
      "last_name": "Bello",
      "full_name": "Mariam A Bello",
      "date_of_birth": "2004-02-18T00:00:00.000Z",
      "gender": "female",
      "nationality": "Ghanaian",
      "national_id": "GHA-1234567-8",
      "email": "mariam.bello@northgate.edu",
      "phone": "+233501112223",
      "photo_url": "https://cdn.s2dent.io/users/mariam.jpg",
      "notes": null
    }
  },
  "message": "User profile retrieved successfully"
}
```
Error Responses:
- 401 UNAUTHORIZED: bearer token missing or invalid.
- 403 FORBIDDEN: caller is neither professor nor student.
- 404 USER_NOT_FOUND: no active user profile exists.
Side Effects:
- Blockchain: none
- Socket: none
- Email: none

### GET /api/users/:id
 - Summary: Returns a user by DB id for the authenticated academy.
 - Auth: Required
 - Roles: academy
 - Middleware: `authenticate -> requireRole('academy') -> getUserByIdController`
 - Path Params:
   - `id` | `string` | required | User DB UUID.
 - Query Params: None
 - Request Body: None
 - Success Response 2xx:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "4f8e1a2b-3c4d-5e6f-7a8b-9c0d1e2f3a4b",
      "first_name": "Mariam",
      "middle_name": "A",
      "last_name": "Bello",
      "full_name": "Mariam A Bello",
      "date_of_birth": "2004-02-18T00:00:00.000Z",
      "gender": "female",
      "nationality": "Ghanaian",
      "national_id": "GHA-1234567-8",
      "email": "mariam.bello@northgate.edu",
      "phone": "+233501112223",
      "photo_url": "https://cdn.s2dent.io/users/mariam.jpg",
      "notes": null
    }
  },
  "message": "User retrieved successfully"
}
```
Error Responses:
- 401 UNAUTHORIZED: bearer token missing or invalid.
- 403 FORBIDDEN: caller is not an academy.
- 404 USER_NOT_FOUND: no active user profile exists.
Side Effects:
- Blockchain: none
- Socket: none
- Email: none

## Departments

### GET /api/departments
 - Summary: Lists all departments in the authenticated academy.
 - Auth: Required
 - Roles: academy
 - Middleware: `authenticate -> requireRole('academy') -> listDepartmentsController`
 - Path Params: None
 - Query Params: None
 - Request Body: None
 - Success Response 2xx:
```json
{
  "success": true,
  "data": {
    "departments": [
      {
        "id": "b6f4c29e-6d63-4b70-99a1-2c9d1d1b9f21",
        "academy_id": "5d9f4ce2-6f43-4c0f-b9aa-0f3e2c0c3a12",
        "code": "CSC",
        "name": "Computer Science",
        "faculty": "Faculty of Computing",
        "total_years": 4,
        "description": "Computing and software engineering programs.",
        "is_active": true
      }
    ]
  },
  "message": "Departments retrieved successfully"
}
```
Error Responses:
- 401 UNAUTHORIZED: bearer token missing or invalid.
- 403 FORBIDDEN: caller is not an academy.
- 404 ACADEMY_NOT_FOUND: academy identity is inactive or missing.
Side Effects:
- Blockchain: none
- Socket: none
- Email: none

### GET /api/departments/me
 - Summary: Returns the department of the authenticated professor or student.
 - Auth: Required
 - Roles: professor | student
 - Middleware: `authenticate -> requireRole('professor', 'student') -> getUserDepartmentController`
 - Path Params: None
 - Query Params: None
 - Request Body: None
 - Success Response 2xx:
```json
{
  "success": true,
  "data": {
    "department": {
      "id": "b6f4c29e-6d63-4b70-99a1-2c9d1d1b9f21",
      "academy_id": "5d9f4ce2-6f43-4c0f-b9aa-0f3e2c0c3a12",
      "code": "CSC",
      "name": "Computer Science",
      "faculty": "Faculty of Computing",
      "total_years": 4,
      "description": "Computing and software engineering programs.",
      "is_active": true
    }
  },
  "message": "Department retrieved successfully"
}
```
Error Responses:
- 401 UNAUTHORIZED: bearer token missing or invalid.
- 403 FORBIDDEN: caller is neither professor nor student.
- 404 DEPARTMENT_NOT_FOUND: the user is not linked to a department.
Side Effects:
- Blockchain: none
- Socket: none
- Email: none

### POST /api/departments
 - Summary: Creates a department inside the authenticated academy.
 - Auth: Required
 - Roles: academy
 - Middleware: `authenticate -> requireRole('academy') -> validate(createDepartmentSchema) -> createDepartmentController`
 - Path Params: None
 - Query Params: None
 - Request Body:
   - `code` | `string` | required | Short unique department code.
   - `name` | `string` | required | Department name.
   - `faculty` | `string` | required | Faculty name.
   - `total_years` | `number` | required | Integer between 1 and 10.
- `description` | `string` | optional | Department description.
- `is_active` | `boolean` | optional | Defaults to true.
```json
{
  "code": "CSC",
  "name": "Computer Science",
  "faculty": "Faculty of Computing",
  "total_years": 4,
  "description": "Computing and software engineering programs.",
  "is_active": true
}
```
Success Response 2xx:
```json
{
  "success": true,
  "data": {
    "department": {
      "id": "b6f4c29e-6d63-4b70-99a1-2c9d1d1b9f21",
      "academy_id": "5d9f4ce2-6f43-4c0f-b9aa-0f3e2c0c3a12",
      "code": "CSC",
      "name": "Computer Science",
      "faculty": "Faculty of Computing",
      "total_years": 4,
      "description": "Computing and software engineering programs.",
      "is_active": true
    }
  },
  "message": "Department created successfully"
}
```
Error Responses:
- 422 VALIDATION_ERROR: required fields are missing or invalid.
- 404 ACADEMY_NOT_FOUND: academy identity is inactive or missing.
- 409 DEPARTMENT_CODE_DUPLICATE: code already exists in the academy.
- 409 DEPARTMENT_NAME_DUPLICATE: name already exists in the academy.
- 401 UNAUTHORIZED: bearer token missing or invalid.
- 403 FORBIDDEN: caller is not an academy.
Side Effects:
- Blockchain: none
- Socket: none
- Email: none

### PUT /api/departments/:id
 - Summary: Updates a department description.
 - Auth: Required
 - Roles: academy
 - Middleware: `authenticate -> requireRole('academy') -> validate(updateDepartmentSchema) -> updateDepartmentController`
 - Path Params:
   - `id` | `string` | required | Department DB UUID.
 - Query Params: None
 - Request Body:
- `description` | `string` | required | New department description.
```json
{
  "description": "Updated description for the department."
}
```
Success Response 2xx:
```json
{
  "success": true,
  "data": {
    "department": {
      "id": "b6f4c29e-6d63-4b70-99a1-2c9d1d1b9f21",
      "academy_id": "5d9f4ce2-6f43-4c0f-b9aa-0f3e2c0c3a12",
      "code": "CSC",
      "name": "Computer Science",
      "faculty": "Faculty of Computing",
      "total_years": 4,
      "description": "Updated description for the department.",
      "is_active": true
    }
  },
  "message": "Department updated successfully"
}
```
Error Responses:
- 422 VALIDATION_ERROR: description is missing.
- 404 DEPARTMENT_NOT_FOUND: department does not exist.
- 401 UNAUTHORIZED: bearer token missing or invalid.
- 403 FORBIDDEN: caller is not an academy.
Side Effects:
- Blockchain: none
- Socket: none
- Email: none

### DELETE /api/departments/:id
 - Summary: Deactivates a department.
 - Auth: Required
 - Roles: academy
 - Middleware: `authenticate -> requireRole('academy') -> deleteDepartmentController`
 - Path Params:
   - `id` | `string` | required | Department DB UUID.
Query Params: None
Request Body: None
Success Response 2xx:
```json
{
  "success": true,
  "message": "Department deactivated successfully"
}
```
Error Responses:
- 400 DEPARTMENT_ALREADY_INACTIVE: department is already inactive.
- 404 DEPARTMENT_NOT_FOUND: department does not exist.
- 401 UNAUTHORIZED: bearer token missing or invalid.
- 403 FORBIDDEN: caller is not an academy.
Side Effects:
- Blockchain: none
- Socket: none
- Email: none

## Addresses

### POST /api/addresses
 - Summary: Creates an address for a user or academy.
 - Auth: Required
 - Roles: academy | admin
 - Middleware: `authenticate -> requireRole('academy', 'admin') -> validate(createAddressSchema) -> createAddressController`
 - Path Params: None
 - Query Params: None
 - Request Body:
   - `user_id` | `string` | optional | User UUID for a person address.
   - `academy_id` | `string` | optional | Academy UUID for an academy address.
   - `address_line1` | `string` | optional | Primary address line.
   - `address_line2` | `string` | optional | Secondary address line.
   - `street` | `string` | optional | Street name.
   - `district` | `string` | optional | District or neighborhood.
   - `state` | `string` | optional | State or region.
- `postal_code` | `string` | optional | Postal code.
- `city` | `string` | required | City name.
- `country` | `string` | required | Country name.
- `latitude` | `number` | optional | Latitude between -90 and 90.
- `longitude` | `number` | optional | Longitude between -180 and 180.
```json
{
  "academy_id": "5d9f4ce2-6f43-4c0f-b9aa-0f3e2c0c3a12",
  "address_line1": "12 Jubilee Avenue",
  "address_line2": "West Wing",
  "street": "Jubilee Avenue",
  "district": "Central",
  "state": "Greater Accra",
  "postal_code": "GA-123-4567",
  "city": "Accra",
  "country": "Ghana",
  "latitude": 5.6037,
  "longitude": -0.1870
}
```
Success Response 2xx:
```json
{
  "success": true,
  "data": {
    "address": {
      "id": "f7d2a8c1-5e4f-4d3b-9a2c-8f1e0a3b7c6d",
      "address_line1": "12 Jubilee Avenue",
      "address_line2": "West Wing",
      "street": "Jubilee Avenue",
      "district": "Central",
      "state": "Greater Accra",
      "postal_code": "GA-123-4567",
      "city": "Accra",
      "country": "Ghana",
      "latitude": 5.6037,
      "longitude": -0.187
    }
  },
  "message": "Address created successfully"
}
```
Error Responses:
- 422 VALIDATION_ERROR: required address fields are missing or invalid.
- 401 UNAUTHORIZED: bearer token missing or invalid.
- 403 FORBIDDEN: caller is neither academy nor admin.
Side Effects:
- Blockchain: none
- Socket: none
- Email: none

### PUT /api/addresses
 - Summary: Updates the authenticated user or academy address.
 - Auth: Required
 - Roles: academy | professor | student
 - Middleware: `authenticate -> requireRole('academy', 'professor', 'student') -> validate(updateAddressSchema) -> updateAddressController`
 - Path Params: None
 - Query Params: None
Request Body:
- `address_line1` | `string` | optional | Primary address line.
- `address_line2` | `string` | optional | Secondary address line.
- `street` | `string` | optional | Street name.
- `district` | `string` | optional | District or neighborhood.
- `state` | `string` | optional | State or region.
- `postal_code` | `string` | optional | Postal code.
- `city` | `string` | required | City name.
- `country` | `string` | required | Country name.
- `latitude` | `number` | optional | Latitude between -90 and 90.
- `longitude` | `number` | optional | Longitude between -180 and 180.
```json
{
  "address_line1": "12 Jubilee Avenue",
  "address_line2": "West Wing",
  "street": "Jubilee Avenue",
  "district": "Central",
  "state": "Greater Accra",
  "postal_code": "GA-123-4567",
  "city": "Accra",
  "country": "Ghana",
  "latitude": 5.6037,
  "longitude": -0.1870
}
```
Success Response 2xx:
```json
{
  "success": true,
  "data": {
    "address": {
      "id": "f7d2a8c1-5e4f-4d3b-9a2c-8f1e0a3b7c6d",
      "address_line1": "12 Jubilee Avenue",
      "address_line2": "West Wing",
      "street": "Jubilee Avenue",
      "district": "Central",
      "state": "Greater Accra",
      "postal_code": "GA-123-4567",
      "city": "Accra",
      "country": "Ghana",
      "latitude": 5.6037,
      "longitude": -0.187
    }
  },
  "message": "Address updated successfully"
}
```
Error Responses:
- 422 VALIDATION_ERROR: city or country is missing.
- 404 ADDRESS_NOT_FOUND: no address exists for the authenticated subject.
- 401 UNAUTHORIZED: bearer token missing or invalid.
- 403 FORBIDDEN: caller is not academy, professor, or student.
Side Effects:
- Blockchain: none
- Socket: none
- Email: none

### GET /api/addresses
 - Summary: Returns the authenticated subject address.
 - Auth: Required
 - Roles: academy | professor | student
 - Middleware: `authenticate -> requireRole('academy', 'professor', 'student') -> getUserAddressController`
 - Path Params: None
 - Query Params: None
Request Body: None
Success Response 2xx:
```json
{
  "success": true,
  "data": {
    "address": {
      "id": "f7d2a8c1-5e4f-4d3b-9a2c-8f1e0a3b7c6d",
      "address_line1": "12 Jubilee Avenue",
      "address_line2": "West Wing",
      "street": "Jubilee Avenue",
      "district": "Central",
      "state": "Greater Accra",
      "postal_code": "GA-123-4567",
      "city": "Accra",
      "country": "Ghana",
      "latitude": 5.6037,
      "longitude": -0.187
    }
  },
  "message": "Address fetched successfully"
}
```
Error Responses:
- 404 ADDRESS_NOT_FOUND: address does not exist for the caller.
- 401 UNAUTHORIZED: bearer token missing or invalid.
- 403 FORBIDDEN: caller is not academy, professor, or student.
Side Effects:
- Blockchain: none
- Socket: none
- Email: none

## Credentials

### GET /api/credentials
 - Summary: Lists credentials visible to the authenticated principal.
 - Auth: Required
 - Roles: student | professor | academy
 - Middleware: `authenticate -> requireRole('student', 'professor', 'academy') -> fetchAllCredentialsController`
 - Path Params: None
 - Query Params: None
 - Request Body: None
Success Response 2xx:
```json
{
  "success": true,
  "data": {
    "credentials": [
      {
        "id": "8b2a3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
        "title": "Attendance Certificate - Programming 101",
        "code": "CRD_2605319",
        "type": "attendance",
        "student_name": "Mariam Bello",
        "issued_at": "2026-05-30T16:18:21.000Z",
        "is_revoked": false,
        "status": "verified"
      }
    ]
  },
  "message": "Credentials fetched successfully"
}
```
Error Responses:
- 401 UNAUTHORIZED: bearer token missing or invalid.
- 403 FORBIDDEN: caller is not student, professor, or academy.
- 400 INVALID_ROLE: credential access role is not supported.
Side Effects:
- Blockchain: reads credential state from the contract.
- Socket: none
- Email: none

### GET /api/credentials/verification
 - Summary: Returns the credential payload bound to the verifier access token.
 - Auth: Required
 - Roles: verifier
 - Middleware: `authenticate -> requireRole('verifier') -> fetchCredentialForVerificationController`
 - Path Params: None
 - Query Params: None
 - Request Body: None
 - Notes: `credential_id`, `student_address`, and `student_signature` are read from the verifier token issued by `POST /api/credentials/:id/token`.
 - Success Response 2xx:
```json
{
  "success": true,
  "data": {
    "meta": {
      "id": "8b2a3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
      "title": "Attendance Certificate - Programming 101",
      "code": "CRD_2605319",
      "type": "attendance",
      "description": "End-of-course attendance record.",
      "locale": null,
      "issued_at": "2026-05-30T16:18:21.000Z",
      "is_revoked": false
    },
    "student": {
      "address": "0x4b5C6D7e8F9A0b1C2D3E4F5A6B7C8D9e0F1a2b3C",
      "name": "Mariam Bello"
    },
    "blockchain": {
      "issue_tx_hash": "0x6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a",
      "revoke_tx_hash": null,
      "revocation_reason": null,
      "credential_index": 0,
      "academy_address": "0x2f8B0d6c1bE7E3A0b0C2E4D5f6A7B8C9d0E1F2a3",
      "issuer_address": "0x2f8B0d6c1bE7E3A0b0C2E4D5f6A7B8C9d0E1F2a3"
    },
    "verification": {
      "payload_hash": "0x8ac0f4e3d2c1b0a9988776655443322110ffeeddccbbaa998877665544332211",
      "issuer_signature": "0x9f1d7c4a8a6a3e5f2b3d4c6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3",
      "student_signature": "0xa7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5"
    },
    "payload": {
      "course_name": "Programming 101",
      "course_code": "CSC101",
      "academic_year": "2025-2026",
      "semester": "fall",
      "enrollment_date": "2025-09-01"
    },
    "encryptedPayload": "8b1f7c..."
  },
  "message": "Credential fetched successfully for verification"
}
```
Error Responses:
- 401 UNAUTHORIZED: bearer token missing or invalid.
- 403 FORBIDDEN: caller is not a verifier.
- 404 CREDENTIAL_NOT_FOUND: credential or dependent identity is missing.
- 400 INVALID_SIGNATURE: student signature does not match the credential payload.
- 500 CREDENTIAL_DATA_INTEGRITY_ERROR: stored payload hash does not match the current payload.
- 502 BLOCKCHAIN_ERROR: contract read failed.
Side Effects:
- Blockchain: reads credential state and validates on-chain signature material.
- Socket: none
- Email: none

### GET /api/credentials/:id/signature-schema
 - Summary: Returns the typed-data signing schema for a credential.
 - Auth: Required
 - Roles: student | professor | academy | verifier
 - Middleware: `authenticate -> requireRole('student', 'professor', 'academy', 'verifier') -> getCredentialSignatureSchemaController`
 - Path Params:
   - `id` | `string` | required | Credential DB UUID.
 - Query Params: None
 - Request Body: None
Success Response 2xx:
```json
{
  "success": true,
  "data": {
    "signature_schema": {
      "domain": {
        "name": "S2dent",
        "version": "1",
        "chainId": 31337,
        "verifyingContract": "0x1234567890abcdef1234567890abcdef12345678"
      },
      "types": {
        "Credential": [
          { "name": "credentialIdHash", "type": "bytes32" },
          { "name": "title", "type": "string" },
          { "name": "code", "type": "string" },
          { "name": "credentialType", "type": "string" },
          { "name": "authorizerWalletAddress", "type": "address" },
          { "name": "authorizerName", "type": "string" },
          { "name": "issuerWalletAddress", "type": "address" },
          { "name": "studentWalletAddress", "type": "address" },
          { "name": "studentName", "type": "string" },
          { "name": "payloadHash", "type": "bytes32" }
        ]
      },
      "message": {
        "credentialIdHash": "0x8ac0f4e3d2c1b0a9988776655443322110ffeeddccbbaa998877665544332211",
        "title": "Attendance Certificate - Programming 101",
        "code": "CRD_2605319",
        "credentialType": "attendance",
        "authorizerWalletAddress": "0x2f8B0d6c1bE7E3A0b0C2E4D5f6A7B8C9d0E1F2a3",
        "authorizerName": "Northgate University",
        "issuerWalletAddress": "0x2f8B0d6c1bE7E3A0b0C2E4D5f6A7B8C9d0E1F2a3",
        "studentWalletAddress": "0x4b5C6D7e8F9A0b1C2D3E4F5A6B7C8D9e0F1a2b3C",
        "studentName": "Mariam Bello",
        "payloadHash": "0x8ac0f4e3d2c1b0a9988776655443322110ffeeddccbbaa998877665544332211"
      }
    }
  },
  "message": "Credential signature schema fetched successfully"
}
```
Error Responses:
- 401 UNAUTHORIZED: bearer token missing or invalid.
- 403 FORBIDDEN: caller lacks one of the allowed roles.
- 404 CREDENTIAL_NOT_FOUND: credential does not exist.
- 502 BLOCKCHAIN_ERROR: signing schema could not be derived.
Side Effects:
- Blockchain: none
- Socket: none
- Email: none

### GET /api/credentials/:id
 - Summary: Returns a credential visible to the authenticated subject.
 - Auth: Required
 - Roles: student | professor | academy
 - Middleware: `authenticate -> requireRole('student', 'professor', 'academy') -> fetchCredentialController`
 - Path Params:
   - `id` | `string` | required | Credential DB UUID.
 - Query Params: None
 - Request Body: None
Success Response 2xx:
```json
{
  "success": true,
  "data": {
    "meta": {
      "id": "8b2a3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
      "title": "Attendance Certificate - Programming 101",
      "code": "CRD_2605319",
      "type": "attendance",
      "description": "End-of-course attendance record.",
      "locale": null,
      "issued_at": "2026-05-30T16:18:21.000Z",
      "is_revoked": false
    },
    "student": {
      "address": "0x4b5C6D7e8F9A0b1C2D3E4F5A6B7C8D9e0F1a2b3C",
      "name": "Mariam Bello"
    },
    "blockchain": {
      "issue_tx_hash": "0x6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a",
      "revoke_tx_hash": null,
      "revocation_reason": null,
      "credential_index": 0,
      "academy_address": "0x2f8B0d6c1bE7E3A0b0C2E4D5f6A7B8C9d0E1F2a3",
      "issuer_address": "0x2f8B0d6c1bE7E3A0b0C2E4D5f6A7B8C9d0E1F2a3"
    },
    "verification": {
      "payload_hash": "0x8ac0f4e3d2c1b0a9988776655443322110ffeeddccbbaa998877665544332211",
      "issuer_signature": "0x9f1d7c4a8a6a3e5f2b3d4c6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3"
    },
    "payload": {
      "course_name": "Programming 101",
      "course_code": "CSC101",
      "academic_year": "2025-2026",
      "semester": "fall",
      "enrollment_date": "2025-09-01"
    },
    "encryptedPayload": null
  },
  "message": "Credential fetched successfully"
}
```
Error Responses:
- 401 UNAUTHORIZED: bearer token missing or invalid.
- 403 FORBIDDEN: caller lacks access to the credential.
- 404 CREDENTIAL_NOT_FOUND: credential does not exist.
- 400 INVALID_ROLE: caller role cannot read this credential.
- 500 CREDENTIAL_DATA_INTEGRITY_ERROR: payload hash mismatch.
- 502 BLOCKCHAIN_ERROR: contract read failed.
Side Effects:
- Blockchain: reads credential state.
- Socket: none
- Email: none

### POST /api/credentials
 - Summary: Creates a credential draft and returns typed-data signing material for the issuer.
 - Auth: Required
 - Roles: professor | academy
 - Middleware: `authenticate -> requireRole('professor', 'academy') -> validate(createCredentialSchema) -> createCredentialController`
 - Path Params: None
 - Query Params: None
 - Request Body:
   - `title` | `string` | required | Credential title.
   - `credential_type` | `string` | required | One of enrollment, attendance, degree, certificate, achievement, transcript.
   - `description` | `string` | optional | Free-text description.
   - `student_address` | `string` | required | Student wallet address.
   - `payload` | `object` | required | Must match the schema for `credential_type`.
 - Credential-type payloads:
   - enrollment: `course_name`, `course_code`, `academic_year`, `semester`, `enrollment_date`.
   - attendance: `course_code`, `course_name`, `academic_year`, `semester`, `total_sessions`, `attended_sessions`, `excused_absences`, `period_from`, `period_to`.
   - degree: `degree_title`, `degree_level`, `major`, `program_code`, `faculty`, `department`, `graduation_date`, `gpa`, `gpa_scale`, `class_rank`, `class_size`, `honors`, `total_credits_earned`, `required_credits`.
   - certificate: `certificate_name`, `certificate_code`, `certificate_category`, `program_duration_hours`, `delivery_mode`, `start_date`, `end_date`, `final_score`, `passing_score`, `instructor_name`.
   - achievement: `achievement_title`, `achievement_type`, `event_name`, `event_type`, `event_organizer`, `event_date`, `event_location`, `score`, `placement`, `team_name`, `project_title`, `project_description`.
   - transcript: `academic_year_from`, `academic_year_to`, `program_name`, `degree_level`, `cumulative_gpa`, `gpa_scale`, `total_credits_attempted`, `total_credits_earned`.
```json
{
  "title": "Attendance Certificate - Programming 101",
  "credential_type": "attendance",
  "description": "End-of-course attendance record.",
  "student_address": "0x4b5C6D7e8F9A0b1C2D3E4F5A6B7C8D9e0F1a2b3C",
  "payload": {
    "course_code": "CSC101",
    "course_name": "Programming 101",
    "academic_year": "2025-2026",
    "semester": "fall",
    "total_sessions": 28,
    "attended_sessions": 26,
    "excused_absences": 1,
    "period_from": "2025-09-01",
    "period_to": "2025-12-15"
  }
}
```
Success Response 2xx:
```json
{
  "success": true,
  "data": {
    "credential_id": "8b2a3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
    "signing_data": {
      "domain": {
        "name": "S2dent",
        "version": "1",
        "chainId": 31337,
        "verifyingContract": "0x1234567890abcdef1234567890abcdef12345678"
      },
      "types": {
        "Credential": [
          { "name": "credentialIdHash", "type": "bytes32" },
          { "name": "title", "type": "string" },
          { "name": "code", "type": "string" },
          { "name": "credentialType", "type": "string" },
          { "name": "authorizerWalletAddress", "type": "address" },
          { "name": "authorizerName", "type": "string" },
          { "name": "issuerWalletAddress", "type": "address" },
          { "name": "studentWalletAddress", "type": "address" },
          { "name": "studentName", "type": "string" },
          { "name": "payloadHash", "type": "bytes32" }
        ]
      },
      "message": {
        "credentialIdHash": "0x8ac0f4e3d2c1b0a9988776655443322110ffeeddccbbaa998877665544332211",
        "title": "Attendance Certificate - Programming 101",
        "code": "CRD_2605319",
        "credentialType": "attendance",
        "authorizerWalletAddress": "0x2f8B0d6c1bE7E3A0b0C2E4D5f6A7B8C9d0E1F2a3",
        "authorizerName": "Northgate University",
        "issuerWalletAddress": "0x2f8B0d6c1bE7E3A0b0C2E4D5f6A7B8C9d0E1F2a3",
        "studentWalletAddress": "0x4b5C6D7e8F9A0b1C2D3E4F5A6B7C8D9e0F1a2b3C",
        "studentName": "Mariam Bello",
        "payloadHash": "0x8ac0f4e3d2c1b0a9988776655443322110ffeeddccbbaa998877665544332211"
      }
    }
  },
  "message": "Credential signing data generated successfully"
}
```
Error Responses:
- 422 VALIDATION_ERROR: title, credential_type, student_address, or payload is invalid.
- 400 INVALID_CREDENTIAL_TYPE_FOR_PROFESSOR: professor tried to issue a non-attendance credential.
- 400 INVALID_CREDENTIAL_TYPE_FOR_ACADEMY: academy tried to issue attendance.
- 401 UNAUTHORIZED_ISSUER: issuer is not a valid active issuer for the target academy.
- 403 NOT_STUDENT_ADVISOR: professor is not the assigned advisor.
- 404 STUDENT_NOT_FOUND: student identity or academy linkage is missing.
- 409 CREDENTIAL_CODE_CONFLICT: generated credential code already exists.
- 502 BLOCKCHAIN_ERROR: signing material could not be derived from the contract-backed state.
Side Effects:
- Blockchain: none yet; the credential is drafted for later on-chain issuance.
- Socket: none
- Email: none

### POST /api/credentials/:id/token
 - Summary: Generates a short-lived verifier access token for a specific credential.
 - Auth: Required
 - Roles: student
 - Middleware: `authenticate -> requireRole('student') -> validate(verifyCredentialTokenSchema) -> generateVerifierCredentialTokenController`
 - Path Params:
   - `id` | `string` | required | Credential DB UUID.
 - Query Params: None
 - Request Body:
   - `student_address` | `string` | required | Student wallet address.
   - `student_signature` | `string` | required | Signature over the verification challenge.
```json
{
  "student_address": "0x4b5C6D7e8F9A0b1C2D3E4F5A6B7C8D9e0F1a2b3C",
  "student_signature": "0xa7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5"
}
```
Success Response 2xx:
```json
{
  "success": true,
  "data": "6f7a8b9c:0d1e2f3a:4b5c6d7e...",
  "message": "Verifier credential token generated successfully"
}
```
Error Responses:
- 422 VALIDATION_ERROR: student_address or student_signature is invalid.
- 401 UNAUTHORIZED: bearer token missing or invalid.
- 403 FORBIDDEN: caller is not a student.
- 404 CREDENTIAL_NOT_FOUND_FOR_TOKEN: credential is not eligible for token generation.
- 404 CREDENTIAL_NOT_FOUND: credential or verification state is missing.
Side Effects:
- Blockchain: none
- Socket: none
- Email: none

### POST /api/credentials/:id/issue
 - Summary: Submits the issuer signature and sends the credential issuance transaction.
 - Auth: Required
 - Roles: professor | academy
 - Middleware: `authenticate -> requireRole('professor', 'academy') -> validate(issueCredentialSchema) -> issueCredentialController`
 - Path Params:
   - `id` | `string` | required | Credential DB UUID.
 - Query Params: None
 - Request Body:
   - `signature` | `string` | required | Issuer signature over the typed credential data.
```json
{
  "signature": "0x9f1d7c4a8a6a3e5f2b3d4c6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3"
}
```
Success Response 2xx:
```json
{
  "success": true,
  "data": {
    "credential_id": "8b2a3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
    "credential_code": "CRD_2605319",
    "blockchain_transaction": {
      "tx_hash": "0x6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a",
      "status": "pending"
    }
  },
  "message": "Credential issued successfully"
}
```
Error Responses:
- 422 VALIDATION_ERROR: signature is missing or malformed.
- 401 UNAUTHORIZED_ISSUER: issuer is not active or no longer authorized.
- 403 FORBIDDEN_ISSUANCE: caller is not the issuer.
- 404 CREDENTIAL_NOT_FOUND_OR_INACTIVE_IDENTITIES: credential or dependent identities are missing.
- 400 INVALID_SIGNATURE: signature does not match the credential data.
- 502 BLOCKCHAIN_ERROR: the issue transaction failed.
Side Effects:
- Blockchain: sends `issueCredential` to the S2dent contract.
- Socket: pending transaction confirmation emits `notification` events to the student wallet.
- Email: sends issuance success/failure email once the transaction is confirmed or fails.

### DELETE /api/credentials/:id/revoke
 - Summary: Sends the credential revocation transaction.
 - Auth: Required
 - Roles: academy
 - Middleware: `authenticate -> requireRole('academy') -> validate(revokeCredentialSchema) -> revokeCredentialController`
 - Path Params:
   - `id` | `string` | required | Credential DB UUID.
 - Query Params: None
 - Request Body:
   - `reason` | `string` | required | Revocation reason up to 500 characters.
```json
{
  "reason": "Attendance record contained an attendance integrity error."
}
```
Success Response 2xx:
```json
{
  "success": true,
  "data": {
    "credential_id": "8b2a3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
    "credential_code": "CRD_2605319",
    "blockchain_transaction": {
      "tx_hash": "0x8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a291817161514131211100f0e0d0c0b0a",
      "status": "pending"
    }
  },
  "message": "Credential revoked successfully"
}
```
Error Responses:
- 422 VALIDATION_ERROR: reason is missing or too long.
- 403 FORBIDDEN_REVOCATION: caller is not the academy authorizer.
- 404 CREDENTIAL_NOT_FOUND: credential does not exist or is already inactive.
- 502 BLOCKCHAIN_ERROR: the revoke transaction failed.
Side Effects:
- Blockchain: sends `revokeCredential` to the S2dent contract.
- Socket: pending transaction confirmation emits `notification` events to the student wallet.
- Email: sends revocation success/failure email once the transaction is confirmed or fails.

## Media

### POST /api/media/upload
 - Summary: Uploads a single JPG or PNG image to Cloudinary.
 - Auth: Required
 - Roles: admin | professor | student | academy
 - Middleware: `authenticate -> requireRole('admin', 'professor', 'student', 'academy') -> uploadSingleImage -> validateMediaUpload -> uploadMediaController`
 - Path Params: None
 - Query Params: None
 - Request Body:
   - Multipart form-data field `image` | `file` | required | JPG or PNG image up to 5 MB.
```json
{
  "image": "multipart file upload"
}
```
Success Response 2xx:
```json
{
  "success": true,
  "data": {
    "url": "https://res.cloudinary.com/s2dent/image/upload/v1717160000/profiles/mariam.jpg"
  },
  "message": "Image uploaded successfully"
}
```
Error Responses:
- 422 VALIDATION_ERROR: file is missing, larger than 5 MB, or not JPG/PNG.
- 401 UNAUTHORIZED: bearer token missing or invalid.
- 403 FORBIDDEN: caller lacks one of the allowed roles.
- 500 INTERNAL_ERROR: Cloudinary upload failed.
Side Effects:
- Blockchain: none
- Socket: none
- Email: none

## Helper

### GET /api/helper/signature
 - Summary: Signs arbitrary EIP-712 typed data with a provided private key.
 - Auth: None
 - Roles: public
 - Middleware: `validate(signingDataSchema) -> signingDataController`
 - Path Params: None
 - Query Params: None
 - Request Body:
   - `payload` | `object` | required | Typed-data object containing `domain`, `types`, and `message`.
   - `privateKey` | `string` | required | Ethereum private key used for signing.
```json
{
  "payload": {
    "domain": {
      "name": "S2dent",
      "version": "1",
      "chainId": 31337,
      "verifyingContract": "0x1234567890abcdef1234567890abcdef12345678"
    },
    "types": {
      "Mail": [
        { "name": "contents", "type": "string" }
      ]
    },
    "message": {
      "contents": "Hello from S2dent"
    }
  },
  "privateKey": "0x4c0883a69102937d6231471b5dbb6204fe512961708279b7b7d0b0f5c4a3e2d1"
}
```
Success Response 2xx:
```json
{
  "success": true,
  "data": {
    "signature": "0x5e1d7c4a8a6a3e5f2b3d4c6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3"
  },
  "message": "Data signed successfully"
}
```
Error Responses:
- 422 VALIDATION_ERROR: payload or privateKey is missing or malformed.
- 500 INTERNAL_ERROR: signing operation failed.
Side Effects:
- Blockchain: none
- Socket: none
- Email: none

## Identities

### GET /api/identities/waiting
 - Summary: Lists student and professor identities that are waiting for issuance inside an academy.
 - Auth: Required
 - Roles: academy
 - Middleware: `authenticate -> requireRole('academy') -> getWaitingIdentitiesController`
 - Path Params: None
 - Query Params: None
 - Request Body: None
 - Success Response 2xx:
```json
{
  "success": true,
  "data": [
    {
      "wallet_address": "0x4b5C6D7e8F9A0b1C2D3E4F5A6B7C8D9e0F1a2b3C",
      "role": "student",
      "full_name": "Mariam Bello",
      "email": "mariam.bello@northgate.edu",
      "status": "waiting"
    }
  ],
  "message": "Waiting identities retrieved successfully"
}
```
Error Responses:
- 401 UNAUTHORIZED: bearer token missing or invalid.
- 403 FORBIDDEN: caller is not an academy.
Side Effects:
- Blockchain: none
- Socket: none
- Email: none

## Academy Identities

### GET /api/identity/academies/me
 - Summary: Returns the authenticated academy identity from the contract state.
 - Auth: Required
 - Roles: academy
 - Middleware: `authenticate -> requireRole('academy') -> getMyIdentity`
 - Path Params: None
 - Query Params: None
 - Request Body: None
 - Success Response 2xx:
```json
{
  "success": true,
  "data": {
    "wallet_address": "0x2f8B0d6c1bE7E3A0b0C2E4D5f6A7B8C9d0E1F2a3",
    "identity": {
      "academy_id_hash": "0x5f4e3d2c1b0a99887766554433221100ffeeddccbbaa99887766554433221100",
      "public_key": "0x04a1b2c3d4e5f60718293a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5",
      "name": "Northgate University",
      "short_name": "NGU",
      "academy_type": "university"
    },
    "proofs": {
      "legal_name": "Northgate University Limited",
      "registration_number": "REG-2026-0019",
      "tax_id": "TIN-99887766",
      "billing_email": "billing@northgate.edu"
    },
    "cert": {
      "fingerprint": "0x7c5e4d3b2a1908f7e6d5c4b3a291817161514131211100f0e0d0c0b0a0908070",
      "certificate": "-----BEGIN CERTIFICATE-----...",
      "chain": "-----BEGIN CERTIFICATE-----...",
      "issued_at": "2026-05-30T10:20:31.000Z",
      "expires_at": "2027-05-30T10:20:31.000Z"
    },
    "status": {
      "issued_at": "2026-05-30T10:20:31.000Z",
      "issuer": "0x2f8B0d6c1bE7E3A0b0C2E4D5f6A7B8C9d0E1F2a3",
      "is_revoked": false,
      "revoked_at": null,
      "revoker": null,
      "revoke_reason": null
    }
  },
  "message": "Academy identity retrieved successfully"
}
```
Error Responses:
- 401 UNAUTHORIZED: bearer token missing or invalid.
- 403 FORBIDDEN: caller is not an academy.
- 404 ACADEMY_IDENTITY_NOT_FOUND: the wallet has no active academy identity.
- 400 INVALID_ADDRESS: wallet address is malformed.
- 502 BLOCKCHAIN_ERROR: contract read failed.
Side Effects:
- Blockchain: reads academy identity state.
- Socket: none
- Email: none

### GET /api/identity/academies/by-id/:id
 - Summary: Returns an academy identity by academy DB id.
 - Auth: None
 - Roles: public
 - Middleware: `getIdentityById`
 - Path Params:
   - `id` | `string` | required | Academy DB UUID.
 - Query Params: None
 - Request Body: None
 - Success Response 2xx:
```json
{
  "success": true,
  "data": {
    "wallet_address": "0x2f8B0d6c1bE7E3A0b0C2E4D5f6A7B8C9d0E1F2a3",
    "identity": {
      "academy_id_hash": "0x5f4e3d2c1b0a99887766554433221100ffeeddccbbaa99887766554433221100",
      "public_key": "0x04a1b2c3d4e5f60718293a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5",
      "name": "Northgate University",
      "short_name": "NGU",
      "academy_type": "university"
    },
    "proofs": {
      "legal_name": "Northgate University Limited",
      "registration_number": "REG-2026-0019",
      "tax_id": "TIN-99887766",
      "billing_email": "billing@northgate.edu"
    },
    "cert": {
      "fingerprint": "0x7c5e4d3b2a1908f7e6d5c4b3a291817161514131211100f0e0d0c0b0a0908070",
      "certificate": "-----BEGIN CERTIFICATE-----...",
      "chain": "-----BEGIN CERTIFICATE-----...",
      "issued_at": "2026-05-30T10:20:31.000Z",
      "expires_at": "2027-05-30T10:20:31.000Z"
    },
    "status": {
      "issued_at": "2026-05-30T10:20:31.000Z",
      "issuer": "0x2f8B0d6c1bE7E3A0b0C2E4D5f6A7B8C9d0E1F2a3",
      "is_revoked": false,
      "revoked_at": null,
      "revoker": null,
      "revoke_reason": null
    }
  },
  "message": "Academy identity retrieved successfully"
}
```
Error Responses:
- 404 ACADEMY_IDENTITY_NOT_FOUND: academy identity does not exist.
- 404 ACADEMY_NOT_FOUND: academy id has no wallet identity.
- 400 INVALID_ADDRESS: derived wallet address is malformed.
- 502 BLOCKCHAIN_ERROR: contract read failed.
Side Effects:
- Blockchain: reads academy identity state.
- Socket: none
- Email: none

### GET /api/identity/academies/:address
 - Summary: Returns an academy identity by wallet address.
 - Auth: None
 - Roles: public
 - Middleware: `getIdentityByAddress`
 - Path Params:
   - `address` | `string` | required | Academy wallet address.
 - Query Params: None
 - Request Body: None
Success Response 2xx:
```json
{
  "success": true,
  "data": {
    "wallet_address": "0x2f8B0d6c1bE7E3A0b0C2E4D5f6A7B8C9d0E1F2a3",
    "identity": {
      "academy_id_hash": "0x5f4e3d2c1b0a99887766554433221100ffeeddccbbaa99887766554433221100",
      "public_key": "0x04a1b2c3d4e5f60718293a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5",
      "name": "Northgate University",
      "short_name": "NGU",
      "academy_type": "university"
    },
    "proofs": {
      "legal_name": "Northgate University Limited",
      "registration_number": "REG-2026-0019",
      "tax_id": "TIN-99887766",
      "billing_email": "billing@northgate.edu"
    },
    "cert": {
      "fingerprint": "0x7c5e4d3b2a1908f7e6d5c4b3a291817161514131211100f0e0d0c0b0a0908070",
      "certificate": "-----BEGIN CERTIFICATE-----...",
      "chain": "-----BEGIN CERTIFICATE-----...",
      "issued_at": "2026-05-30T10:20:31.000Z",
      "expires_at": "2027-05-30T10:20:31.000Z"
    },
    "status": {
      "issued_at": "2026-05-30T10:20:31.000Z",
      "issuer": "0x2f8B0d6c1bE7E3A0b0C2E4D5f6A7B8C9d0E1F2a3",
      "is_revoked": false,
      "revoked_at": null,
      "revoker": null,
      "revoke_reason": null
    }
  },
  "message": "Academy identity retrieved successfully"
}
```
Error Responses:
- 404 ACADEMY_IDENTITY_NOT_FOUND: academy identity does not exist.
- 400 INVALID_ADDRESS: wallet address is malformed.
- 502 BLOCKCHAIN_ERROR: contract read failed.
Side Effects:
- Blockchain: reads academy identity state.
- Socket: none
- Email: none

### POST /api/identity/academies/issue
 - Summary: Submits a request to issue an academy identity.
 - Auth: None
 - Roles: public
 - Middleware: `validate(issueIdentitySchema) -> issueIdentity`
 - Path Params: None
 - Query Params: None
 - Request Body:
   - `email` | `string` | required | Academy email that previously requested an OTP.
   - `otp` | `string` | required | 6-character OTP from the email flow.
   - `signature` | `string` | required | Signature over the cached issuance message.
```json
{
  "email": "info@northgate.edu",
  "otp": "A1B2C3",
  "signature": "0x9f1d7c4a8a6a3e5f2b3d4c6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3"
}
```
Success Response 2xx:
```json
{
  "success": true,
  "data": {
    "academy_address": "0x2f8B0d6c1bE7E3A0b0C2E4D5f6A7B8C9d0E1F2a3",
    "blockchain_transaction": {
      "tx_hash": "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3",
      "status": "pending"
    },
    "certificate_metadata": {
      "certificate_hash": "0x7c5e4d3b2a1908f7e6d5c4b3a291817161514131211100f0e0d0c0b0a0908070",
      "issued_at": "2026-05-30T10:20:31.000Z",
      "expires_at": "2027-05-30T10:20:31.000Z"
    }
  },
  "message": "Academy identity issuance request submitted successfully"
}
```
Error Responses:
- 422 VALIDATION_ERROR: email, otp, or signature is missing or malformed.
- 400 INVALID_OTP: OTP is invalid or expired.
- 400 INVALID_ADDRESS: recovered wallet address is malformed.
- 409 WALLET_ADDRESS_NOT_UNIQUE: wallet is already bound to another identity.
- 404 ACADEMY_NOT_FOUND: OTP does not map to a valid academy or the academy is missing.
- 409 ACADEMY_ADDRESS_REQUIRED: academy must have an address before issuance.
- 502 BLOCKCHAIN_ERROR: issuance transaction failed.
Side Effects:
- Blockchain: sends `issueAcademyIdentity` to the S2dent contract.
- Socket: none directly; the issuance is tracked via the pending transaction listener.
- Email: none directly from this endpoint; confirmation mail is sent after transaction confirmation.

### POST /api/identity/academies/revoke
 - Summary: Submits a request to revoke an academy identity.
 - Auth: None
 - Roles: public
 - Middleware: `validate(revokeIdentitySchema) -> revokeIdentity`
 - Path Params: None
 - Query Params: None
Request Body:
- `wallet_address` | `string` | required | Academy wallet address.
- `revocation_reason` | `string` | required | Revocation reason.
```json
{
  "wallet_address": "0x2f8B0d6c1bE7E3A0b0C2E4D5f6A7B8C9d0E1F2a3",
  "revocation_reason": "Institution requested closure of the academy profile."
}
```
Success Response 2xx:
```json
{
  "success": true,
  "data": {
    "academy_address": "0x2f8B0d6c1bE7E3A0b0C2E4D5f6A7B8C9d0E1F2a3",
    "blockchain_transaction": {
      "tx_hash": "0x7e6d5c4b3a291817161514131211100f0e0d0c0b0a09080706050403020100ff",
      "status": "pending"
    }
  },
  "message": "Academy identity revocation request submitted successfully"
}
```
Error Responses:
- 422 VALIDATION_ERROR: wallet_address or revocation_reason is invalid.
- 404 ACADEMY_NOT_FOUND: academy identity does not exist.
- 409 ACADEMY_ADDRESS_REQUIRED: academy address record is missing.
- 502 BLOCKCHAIN_ERROR: revocation transaction failed.
Side Effects:
- Blockchain: sends `revokeAcademyIdentity` to the S2dent contract.
- Socket: none directly; result is finalized by the transaction listener.
- Email: confirmation/rejection mail is sent after transaction confirmation.

## Professor Identities

### GET /api/identity/professors/me
 - Summary: Returns the authenticated professor identity from the contract state.
 - Auth: Required
 - Roles: professor
 - Middleware: `authenticate -> requireRole('professor') -> getMyIdentity`
 - Path Params: None
 - Query Params: None
Request Body: None
Success Response 2xx:
```json
{
  "success": true,
  "data": {
    "wallet_address": "0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3",
    "identity": {
      "employee_id_hash": "0x4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5",
      "national_id_hash": "0x5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6",
      "public_key": "0x04a1b2c3d4e5f60718293a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5",
      "signature": "0x9f1d7c4a8a6a3e5f2b3d4c6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3",
      "full_name": "Dr. Amina Yusuf",
      "rank": "prof",
      "employment_type": "full_time",
      "hire_date": "2025-08-15T00:00:00.000Z"
    },
    "status": {
      "issued_at": "2026-05-30T10:20:31.000Z",
      "issuer": "0x2f8B0d6c1bE7E3A0b0C2E4D5f6A7B8C9d0E1F2a3",
      "is_revoked": false,
      "revoked_at": null,
      "revoker": null
    }
  },
  "message": "Professor identity retrieved successfully"
}
```
Error Responses:
- 401 UNAUTHORIZED: bearer token missing or invalid.
- 403 FORBIDDEN: caller is not a professor.
- 404 PROFESSOR_IDENTITY_NOT_FOUND: professor identity does not exist.
- 400 INVALID_ADDRESS: wallet address is malformed.
- 502 BLOCKCHAIN_ERROR: contract read failed.
Side Effects:
- Blockchain: reads professor identity state.
- Socket: none
- Email: none

### GET /api/identity/professors/by-id/:id
 - Summary: Returns a professor identity by user id.
 - Auth: Required
 - Roles: academy
 - Middleware: `authenticate -> requireRole('academy') -> getIdentityById`
 - Path Params:
   - `id` | `string` | required | Professor user UUID.
Query Params: None
Request Body: None
Success Response 2xx:
```json
{
  "success": true,
  "data": {
    "wallet_address": "0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3",
    "identity": {
      "employee_id_hash": "0x4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5",
      "national_id_hash": "0x5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6",
      "public_key": "0x04a1b2c3d4e5f60718293a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5",
      "signature": "0x9f1d7c4a8a6a3e5f2b3d4c6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3",
      "full_name": "Dr. Amina Yusuf",
      "rank": "prof",
      "employment_type": "full_time",
      "hire_date": "2025-08-15T00:00:00.000Z"
    },
    "status": {
      "issued_at": "2026-05-30T10:20:31.000Z",
      "issuer": "0x2f8B0d6c1bE7E3A0b0C2E4D5f6A7B8C9d0E1F2a3",
      "is_revoked": false,
      "revoked_at": null,
      "revoker": null
    }
  },
  "message": "Professor identity retrieved successfully"
}
```
Error Responses:
- 401 UNAUTHORIZED: bearer token missing or invalid.
- 403 FORBIDDEN: caller is not an academy.
- 404 PROFESSOR_IDENTITY_NOT_FOUND: professor identity does not exist.
- 502 BLOCKCHAIN_ERROR: contract read failed.
Side Effects:
- Blockchain: reads professor identity state.
- Socket: none
- Email: none

### GET /api/identity/professors/:address
 - Summary: Returns a professor identity by wallet address.
 - Auth: None
 - Roles: public
 - Middleware: `getIdentityByAddress`
 - Path Params:
   - `address` | `string` | required | Professor wallet address.
 - Query Params: None
 - Request Body: None
 - Success Response 2xx:
```json
{
  "success": true,
  "data": {
    "wallet_address": "0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3",
    "identity": {
      "employee_id_hash": "0x4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5",
      "national_id_hash": "0x5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6",
      "public_key": "0x04a1b2c3d4e5f60718293a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5",
      "signature": "0x9f1d7c4a8a6a3e5f2b3d4c6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3",
      "full_name": "Dr. Amina Yusuf",
      "rank": "prof",
      "employment_type": "full_time",
      "hire_date": "2025-08-15T00:00:00.000Z"
    },
    "status": {
      "issued_at": "2026-05-30T10:20:31.000Z",
      "issuer": "0x2f8B0d6c1bE7E3A0b0C2E4D5f6A7B8C9d0E1F2a3",
      "is_revoked": false,
      "revoked_at": null,
      "revoker": null
    }
  },
  "message": "Professor identity retrieved successfully"
}
```
Error Responses:
- 404 PROFESSOR_IDENTITY_NOT_FOUND: professor identity does not exist.
- 400 INVALID_ADDRESS: wallet address is malformed.
- 502 BLOCKCHAIN_ERROR: contract read failed.
Side Effects:
- Blockchain: reads professor identity state.
- Socket: none
- Email: none

### GET /api/identity/professors/pending/:wallet_address/schema
 - Summary: Returns the typed-data schema an academy signs before issuing a professor identity.
 - Auth: Required
 - Roles: academy
 - Middleware: `authenticate -> requireRole('academy') -> generateIdentitySignatureSchemaController`
 - Path Params:
   - `wallet_address` | `string` | required | Professor wallet address pending issuance.
 - Query Params: None
 - Request Body: None
 - Success Response 2xx:
```json
{
  "success": true,
  "data": {
    "domain": {
      "name": "S2dent",
      "version": "1",
      "chainId": 31337,
      "verifyingContract": "0x1234567890abcdef1234567890abcdef12345678"
    },
    "types": {
      "ProfessorIdentity": [
        { "name": "professorIdHash", "type": "bytes32" },
        { "name": "fullName", "type": "string" },
        { "name": "nationalIdHash", "type": "bytes32" },
        { "name": "publicKey", "type": "string" },
        { "name": "walletAddress", "type": "address" },
        { "name": "academyWalletAddress", "type": "address" },
        { "name": "academyName", "type": "string" },
        { "name": "hireDate", "type": "string" }
      ]
    },
    "message": {
      "professorIdHash": "0x4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5",
      "fullName": "Dr. Amina Yusuf",
      "nationalIdHash": "0x5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6",
      "publicKey": "0x04a1b2c3d4e5f60718293a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5",
      "walletAddress": "0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3",
      "academyWalletAddress": "0x2f8B0d6c1bE7E3A0b0C2E4D5f6A7B8C9d0E1F2a3",
      "academyName": "Northgate University",
      "hireDate": "2025-08-15"
    }
  },
  "message": "Professor identity signature schema generated successfully"
}
```
Error Responses:
- 401 UNAUTHORIZED: bearer token missing or invalid.
- 403 FORBIDDEN: caller is not an academy.
- 404 PROFESSOR_NOT_FOUND: pending professor record is missing.
- 400 DEPARTMENT_INACTIVE: professor's department is inactive.
- 400 ADDRESS_NOT_FOUND: professor has no registered address.
- 502 BLOCKCHAIN_ERROR: schema derivation failed.
Side Effects:
- Blockchain: none
- Socket: none
- Email: none

### POST /api/identity/professors/request-issuance
 - Summary: Stores a professor issuance request after OTP verification.
 - Auth: None
 - Roles: public
 - Middleware: `validate(issueReqIdentitySchema) -> requestIdentityIssuanceController`
 - Path Params: None
 - Query Params: None
 - Request Body:
   - `email` | `string` | required | Professor email that requested the OTP.
   - `otp` | `string` | required | 6-character OTP from the email flow.
   - `signature` | `string` | required | Signature over the cached issuance challenge.
```json
{
  "email": "amina.yusuf@northgate.edu",
  "otp": "A1B2C3",
  "signature": "0x9f1d7c4a8a6a3e5f2b3d4c6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3"
}
```
Success Response 2xx:
```json
{
  "success": true,
  "data": {
    "wallet_address": "0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3"
  },
  "message": "Professor identity issuance request submitted successfully"
}
```
Error Responses:
- 422 VALIDATION_ERROR: email, otp, or signature is invalid.
- 400 INVALID_OTP: OTP is missing, expired, or wrong.
- 400 INVALID_ADDRESS: recovered wallet address is malformed.
- 409 WALLET_ADDRESS_NOT_UNIQUE: wallet already belongs to another identity.
- 404 PROFESSOR_NOT_FOUND: cached email does not resolve to a professor account.
- 502 INTERNAL_ERROR: cache or signature recovery failed.
Side Effects:
- Blockchain: none
- Socket: emits a `notification` event to the academy wallet noting the issuance request.
- Email: none

### POST /api/identity/professors/issue
 - Summary: Submits the professor identity issuance transaction.
 - Auth: Required
 - Roles: academy
 - Middleware: `authenticate -> requireRole('academy') -> validate(issueIdentitySchema) -> issueIdentityController`
 - Path Params: None
 - Query Params: None
 - Request Body:
   - `professor_address` | `string` | required | Professor wallet address to issue.
   - `signature` | `string` | required | Academy signature over the typed professor identity.
```json
{
  "professor_address": "0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3",
  "signature": "0x9f1d7c4a8a6a3e5f2b3d4c6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3"
}
```
Success Response 2xx:
```json
{
  "success": true,
  "data": {
    "professor_wallet": "0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3",
    "blockchain_transaction": {
      "tx_hash": "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3",
      "status": "pending"
    }
  },
  "message": "Professor identity issued successfully"
}
```
Error Responses:
- 422 VALIDATION_ERROR: professor_address or signature is invalid.
- 404 PROFESSOR_NOT_FOUND: professor record is missing or inactive.
- 404 ACADEMY_NOT_FOUND: academy identity or address is missing.
- 403 DEPARTMENT_INACTIVE: the professor's department is inactive.
- 400 ADDRESS_NOT_FOUND: the professor has no registered address.
- 400 INVALID_SIGNATURE: academy signature does not match the typed data.
- 502 BLOCKCHAIN_ERROR: issuance transaction failed.
Side Effects:
- Blockchain: sends `issueProfessorIdentity` to the S2dent contract.
- Socket: pending transaction confirmation emits `notification` events to the academy wallet.
- Email: issuance success/failure email is sent after transaction confirmation.

### DELETE /api/identity/professors/revoke
 - Summary: Submits the professor identity revocation transaction.
 - Auth: Required
 - Roles: academy
 - Middleware: `authenticate -> requireRole('academy') -> validate(revokeIdentitySchema) -> revokeIdentity`
 - Path Params: None
 - Query Params: None
 - Request Body:
   - `professor_address` | `string` | required | Professor wallet address to revoke.
   - `revocation_reason` | `string` | required | Revocation reason.
```json
{
  "professor_address": "0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3",
  "revocation_reason": "Employment ended at the academy."
}
```
Success Response 2xx:
```json
{
  "success": true,
  "data": {
    "professor_wallet": "0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3",
    "blockchain_transaction": {
      "tx_hash": "0x7e6d5c4b3a291817161514131211100f0e0d0c0b0a09080706050403020100ff",
      "status": "pending"
    }
  },
  "message": "Professor identity revocation request submitted successfully"
}
```
Error Responses:
- 422 VALIDATION_ERROR: professor_address or revocation_reason is invalid.
- 404 PROFESSOR_NOT_FOUND: professor record is missing or inactive.
- 404 ACADEMY_NOT_FOUND: academy identity is missing.
- 403 DEPARTMENT_INACTIVE: professor's department is inactive.
- 400 ADDRESS_NOT_FOUND: professor has no registered address.
- 502 BLOCKCHAIN_ERROR: revocation transaction failed.
Side Effects:
- Blockchain: sends `revokeProfessorIdentity` to the S2dent contract.
- Socket: pending transaction confirmation emits `notification` events to the academy wallet.
- Email: revocation success/failure email is sent after transaction confirmation.

## Student Identities

### GET /api/identity/students/me
 - Summary: Returns the authenticated student identity from the contract state.
 - Auth: Required
 - Roles: student
 - Middleware: `authenticate -> requireRole('student') -> getMyIdentity`
 - Path Params: None
 - Query Params: None
Request Body: None
Success Response 2xx:
```json
{
  "success": true,
  "data": {
    "wallet_address": "0x4b5C6D7e8F9A0b1C2D3E4F5A6B7C8D9e0F1a2b3C",
    "identity": {
      "student_id_hash": "0x6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7",
      "national_id_hash": "0x7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8",
      "public_key": "0x04a1b2c3d4e5f60718293a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5",
      "signature": "0x9f1d7c4a8a6a3e5f2b3d4c6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3",
      "full_name": "Mariam Bello",
      "nationality": "Ghanaian",
      "academy_name": "Northgate University",
      "department": "Computer Science",
      "country": "Ghana",
      "enrollment_date": "2025-09-01T00:00:00.000Z"
    },
    "status": {
      "issued_at": "2026-05-30T10:20:31.000Z",
      "issuer": "0x2f8B0d6c1bE7E3A0b0C2E4D5f6A7B8C9d0E1F2a3",
      "is_revoked": false,
      "revoked_at": null,
      "revoker": null
    }
  },
  "message": "Student identity retrieved successfully"
}
```
Error Responses:
- 401 UNAUTHORIZED: bearer token missing or invalid.
- 403 FORBIDDEN: caller is not a student.
- 404 STUDENT_IDENTITY_NOT_FOUND: student identity does not exist.
- 400 INVALID_ADDRESS: wallet address is malformed.
- 502 BLOCKCHAIN_ERROR: contract read failed.
Side Effects:
- Blockchain: reads student identity state.
- Socket: none
- Email: none

### GET /api/identity/students/by-id/:id
 - Summary: Returns a student identity by user id.
 - Auth: Required
 - Roles: academy
 - Middleware: `authenticate -> requireRole('academy') -> getIdentityById`
 - Path Params:
   - `id` | `string` | required | Student user UUID.
 - Query Params: None
 - Request Body: None
 - Success Response 2xx:
```json
{
  "success": true,
  "data": {
    "wallet_address": "0x4b5C6D7e8F9A0b1C2D3E4F5A6B7C8D9e0F1a2b3C",
    "identity": {
      "student_id_hash": "0x6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7",
      "national_id_hash": "0x7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8",
      "public_key": "0x04a1b2c3d4e5f60718293a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5",
      "signature": "0x9f1d7c4a8a6a3e5f2b3d4c6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3",
      "full_name": "Mariam Bello",
      "nationality": "Ghanaian",
      "academy_name": "Northgate University",
      "department": "Computer Science",
      "country": "Ghana",
      "enrollment_date": "2025-09-01T00:00:00.000Z"
    },
    "status": {
      "issued_at": "2026-05-30T10:20:31.000Z",
      "issuer": "0x2f8B0d6c1bE7E3A0b0C2E4D5f6A7B8C9d0E1F2a3",
      "is_revoked": false,
      "revoked_at": null,
      "revoker": null
    }
  },
  "message": "Student identity retrieved successfully"
}
```
Error Responses:
- 401 UNAUTHORIZED: bearer token missing or invalid.
- 403 FORBIDDEN: caller is not an academy.
- 404 STUDENT_IDENTITY_NOT_FOUND: student identity does not exist.
- 502 BLOCKCHAIN_ERROR: contract read failed.
Side Effects:
- Blockchain: reads student identity state.
- Socket: none
- Email: none

### GET /api/identity/students/:address
 - Summary: Returns a student identity by wallet address.
 - Auth: None
 - Roles: public
 - Middleware: `getIdentityByAddress`
 - Path Params:
   - `address` | `string` | required | Student wallet address.
 - Query Params: None
 - Request Body: None
 - Success Response 2xx:
```json
{
  "success": true,
  "data": {
    "wallet_address": "0x4b5C6D7e8F9A0b1C2D3E4F5A6B7C8D9e0F1a2b3C",
    "identity": {
      "student_id_hash": "0x6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7",
      "national_id_hash": "0x7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8",
      "public_key": "0x04a1b2c3d4e5f60718293a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5",
      "signature": "0x9f1d7c4a8a6a3e5f2b3d4c6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3",
      "full_name": "Mariam Bello",
      "nationality": "Ghanaian",
      "academy_name": "Northgate University",
      "department": "Computer Science",
      "country": "Ghana",
      "enrollment_date": "2025-09-01T00:00:00.000Z"
    },
    "status": {
      "issued_at": "2026-05-30T10:20:31.000Z",
      "issuer": "0x2f8B0d6c1bE7E3A0b0C2E4D5f6A7B8C9d0E1F2a3",
      "is_revoked": false,
      "revoked_at": null,
      "revoker": null
    }
  },
  "message": "Student identity retrieved successfully"
}
```
Error Responses:
- 404 STUDENT_IDENTITY_NOT_FOUND: student identity does not exist.
- 400 INVALID_ADDRESS: wallet address is malformed.
- 502 BLOCKCHAIN_ERROR: contract read failed.
Side Effects:
- Blockchain: reads student identity state.
- Socket: none
- Email: none

### GET /api/identity/students/pending/:wallet_address/schema
 - Summary: Returns the typed-data schema an academy signs before issuing a student identity.
 - Auth: Required
 - Roles: academy
 - Middleware: `authenticate -> requireRole('academy') -> generateIdentitySignatureSchemaController`
 - Path Params:
   - `wallet_address` | `string` | required | Student wallet address pending issuance.
 - Query Params: None
 - Request Body: None
 - Success Response 2xx:
```json
{
  "success": true,
  "data": {
    "domain": {
      "name": "S2dent",
      "version": "1",
      "chainId": 31337,
      "verifyingContract": "0x1234567890abcdef1234567890abcdef12345678"
    },
    "types": {
      "StudentIdentity": [
        { "name": "studentIdHash", "type": "bytes32" },
        { "name": "fullName", "type": "string" },
        { "name": "nationalIdHash", "type": "bytes32" },
        { "name": "publicKey", "type": "string" },
        { "name": "walletAddress", "type": "address" },
        { "name": "academyWalletAddress", "type": "address" },
        { "name": "academyName", "type": "string" },
        { "name": "enrollmentDate", "type": "string" },
        { "name": "department", "type": "string" }
      ]
    },
    "message": {
      "studentIdHash": "0x6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7",
      "fullName": "Mariam Bello",
      "nationalIdHash": "0x7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8",
      "publicKey": "0x04a1b2c3d4e5f60718293a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5",
      "walletAddress": "0x4b5C6D7e8F9A0b1C2D3E4F5A6B7C8D9e0F1a2b3C",
      "academyWalletAddress": "0x2f8B0d6c1bE7E3A0b0C2E4D5f6A7B8C9d0E1F2a3",
      "academyName": "Northgate University",
      "enrollmentDate": "2025-09-01T00:00:00.000Z",
      "department": "Computer Science"
    }
  },
  "message": "Student identity signature schema generated successfully"
}
```
Error Responses:
- 401 UNAUTHORIZED: bearer token missing or invalid.
- 403 FORBIDDEN: caller is not an academy.
- 404 STUDENT_NOT_FOUND: pending student record is missing.
- 403 DEPARTMENT_INACTIVE: student's department is inactive.
- 400 ADDRESS_NOT_FOUND: student has no registered address.
- 502 BLOCKCHAIN_ERROR: schema derivation failed.
Side Effects:
- Blockchain: none
- Socket: none
- Email: none

### POST /api/identity/students/request-issuance
 - Summary: Stores a student issuance request after OTP verification.
 - Auth: None
 - Roles: public
 - Middleware: `validate(issueReqIdentitySchema) -> requestIdentityIssuanceController`
 - Path Params: None
 - Query Params: None
 - Request Body:
   - `email` | `string` | required | Student email that requested the OTP.
   - `otp` | `string` | required | 6-character OTP from the email flow.
- `signature` | `string` | required | Signature over the cached issuance challenge.
```json
{
  "email": "mariam.bello@northgate.edu",
  "otp": "A1B2C3",
  "signature": "0x9f1d7c4a8a6a3e5f2b3d4c6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3"
}
```
Success Response 2xx:
```json
{
  "success": true,
  "data": {
    "wallet_address": "0x4b5C6D7e8F9A0b1C2D3E4F5A6B7C8D9e0F1a2b3C"
  },
  "message": "Student identity issuance request submitted successfully"
}
```
Error Responses:
- 422 VALIDATION_ERROR: email, otp, or signature is invalid.
- 400 INVALID_OTP: OTP is missing, expired, or wrong.
- 400 INVALID_ADDRESS: recovered wallet address is malformed.
- 409 WALLET_ADDRESS_NOT_UNIQUE: wallet already belongs to another identity.
- 404 STUDENT_NOT_FOUND: cached email does not resolve to a student account.
- 502 INTERNAL_ERROR: cache or signature recovery failed.
Side Effects:
- Blockchain: none
- Socket: emits a `notification` event to the academy wallet noting the issuance request.
- Email: none

### POST /api/identity/students/issue
 - Summary: Submits the student identity issuance transaction.
 - Auth: Required
 - Roles: academy
 - Middleware: `authenticate -> requireRole('academy') -> validate(issueIdentitySchema) -> issueIdentityController`
 - Path Params: None
 - Query Params: None
 - Request Body:
   - `student_address` | `string` | required | Student wallet address to issue.
   - `signature` | `string` | required | Academy signature over the typed student identity.
```json
{
  "student_address": "0x4b5C6D7e8F9A0b1C2D3E4F5A6B7C8D9e0F1a2b3C",
  "signature": "0x9f1d7c4a8a6a3e5f2b3d4c6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3"
}
```
Success Response 2xx:
```json
{
  "success": true,
  "data": {
    "student_wallet": "0x4b5C6D7e8F9A0b1C2D3E4F5A6B7C8D9e0F1a2b3C",
    "blockchain_transaction": {
      "tx_hash": "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3",
      "status": "pending"
    }
  },
  "message": "Student identity issued successfully"
}
```
Error Responses:
- 422 VALIDATION_ERROR: student_address or signature is invalid.
- 404 STUDENT_NOT_FOUND: student record is missing or inactive.
- 404 ACADEMY_NOT_FOUND: academy identity or address is missing.
- 403 DEPARTMENT_INACTIVE: the student's department is inactive.
- 400 ADDRESS_NOT_FOUND: the student has no registered address.
- 400 INVALID_SIGNATURE: academy signature does not match the typed data.
- 502 BLOCKCHAIN_ERROR: issuance transaction failed.
Side Effects:
- Blockchain: sends `issueStudentIdentity` to the S2dent contract.
- Socket: pending transaction confirmation emits `notification` events to the academy wallet.
- Email: issuance success/failure email is sent after transaction confirmation.

### DELETE /api/identity/students/revoke
 - Summary: Submits the student identity revocation transaction.
 - Auth: Required
 - Roles: academy
 - Middleware: `authenticate -> requireRole('academy') -> validate(revokeIdentitySchema) -> revokeIdentity`
 - Path Params: None
 - Query Params: None
 - Request Body:
   - `student_address` | `string` | required | Student wallet address to revoke.
   - `revocation_reason` | `string` | required | Revocation reason.
```json
{
  "student_address": "0x4b5C6D7e8F9A0b1C2D3E4F5A6B7C8D9e0F1a2b3C",
  "revocation_reason": "Student has left the academy."
}
```
Success Response 2xx:
```json
{
  "success": true,
  "data": {
    "student_wallet": "0x4b5C6D7e8F9A0b1C2D3E4F5A6B7C8D9e0F1a2b3C",
    "blockchain_transaction": {
      "tx_hash": "0x7e6d5c4b3a291817161514131211100f0e0d0c0b0a09080706050403020100ff",
      "status": "pending"
    }
  },
  "message": "Student identity revocation request submitted successfully"
}
```
Error Responses:
- 422 VALIDATION_ERROR: student_address or revocation_reason is invalid.
- 404 STUDENT_NOT_FOUND: student record is missing or inactive.
- 404 ACADEMY_NOT_FOUND: academy identity is missing.
- 403 DEPARTMENT_INACTIVE: student's department is inactive.
- 400 ADDRESS_NOT_FOUND: student has no registered address.
- 502 BLOCKCHAIN_ERROR: revocation transaction failed.
Side Effects:
- Blockchain: sends `revokeStudentIdentity` to the S2dent contract.
- Socket: pending transaction confirmation emits `notification` events to the academy wallet.
- Email: revocation success/failure email is sent after transaction confirmation.
