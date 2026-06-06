# S2dent API: System & Architecture Documentation

S2dent is a decentralized identity management system for educational institutions. It uses blockchain technology to provide secure, transparent, and tamper-proof digital identities for academies, professors, and students.

This document serves as a complete technical guide for business stakeholders and new developers.

---

## Glossary of Technical Terms

*   **Relational Database:** A database that stores data in structured tables that connect to each other using unique IDs called keys.
*   **Cryptographic Hash:** A unique, fixed-length text code generated from input data that cannot be reversed to reveal the original input.
*   **Cryptographic Nonce:** A random, single-use number sent by a server to a client to prevent security replay attacks during logins.
*   **Digital Wallet Signature:** A unique cryptographic proof showing that a specific message was authorized by the owner of a blockchain wallet.
*   **EIP-712 Typed Data:** An Ethereum standard for signing structured data packages rather than plain text, making messages readable and safe for users.
*   **X.509 Certificate:** A digital document that uses public keys to securely bind an identity (such as an institution or user) to a cryptographic key pair.
*   **Certificate Authority (CA):** A trusted server entity that issues, signs, and manages digital security certificates.
*   **JSON-RPC:** A lightweight protocol that lets applications send commands and queries to blockchain networks in JSON format.

---

## 🌟 1. System Overview & Startup Process

The S2dent API acts as the main server for the platform. It handles institutional profiles, generates cryptographic identities, issues academic credentials, and stores verification data on the blockchain.

### How the System Boots Up

When the application starts, it follows a step-by-step startup process to prepare the database and launch the HTTP and WebSocket servers. This process is defined in the boot scripts and server configurations:

1. **Docker Container Launch:** The application runs inside Docker using [entrypoint.sh](file:///home/santetu/S2dent/api/entrypoint.sh), which runs database migrations before booting the server.
2. **Database Initialization:** In [server.js](file:///home/santetu/S2dent/api/server.js), the bootstrap process executes [ensureDatabaseExists](file:///home/santetu/S2dent/api/src/config/db.js#L8) to verify if the target PostgreSQL database exists. If not, it creates it.
3. **Database Migrations:** The server calls [runMigrations](file:///home/santetu/S2dent/api/src/db/migrate.js#L53) to scan the SQL migration files in the `src/db/migrations/` folder. It runs any outstanding migrations sequentially and records them in the `_migrations` tracker table.
4. **App and Middleware Setup:** The Express app in [app.js](file:///home/santetu/S2dent/api/src/app.js) is configured. It sets up CORS permissions, JSON parsing, global rate limiters, and attaches module routers.
5. **WebSocket Server Initialization:** The HTTP server is wrapped to start Socket.io using [initSocket](file:///home/santetu/S2dent/api/src/config/socket.js#L76), which sets up client listeners for real-time events.
6. **Port Listening:** The server starts listening on the port configured in [env.js](file:///home/santetu/S2dent/api/src/config/env.js#L30) (default: `3000`).

---

## 🏗️ 2. Architectural Layers & Code Structure

The API is built using a clean MVC-style layering pattern to separate concerns:

```
Client Request ─> [Express Router] ─> [Joi Validation] ─> [Auth & Role Checks]
                                                                  │
                                                                  ▼
[Response JSON] <── [Controller] <── [Service Logic] <── [Database/Blockchain]
```

### Explanation of Layers

*   **Routing Layer (`*.routes.js` / `*.route.js`):** Matches HTTP request paths and methods to specific controllers. This layer binds authentication and validation middlewares.
*   **Validation Layer (`*.validator.js`):** Uses Joi schemas to validate incoming request data (body, query params) before running business logic.
*   **Controller Layer (`*.controller.js`):** Extracts parameters from HTTP requests, calls the appropriate service, and formats JSON responses using response utility helpers.
*   **Service Layer (`*.service.js`):** Implements core business logic, coordinates database queries, manages token generations, and executes blockchain transactions.
*   **Access Layer (`db.js`, `blockchain.js`, `redis.js`):** Interacts with databases, Redis cache stores, and Ethereum blockchain node connections.

### System Modules

The codebase is organized into modular folders under [src/modules/](file:///home/santetu/S2dent/api/src/modules/):

| Module | Purpose |
| :--- | :--- |
| **academy** | Registers institutions (universities, colleges) and updates profiles. |
| **address** | Manages geographical locations associated with users or institutions. |
| **auth** | Controls cryptographic logins, JWT issuances, refresh cycles, and email OTPs. |
| **credential** | Handles creation, signature verification, and blockchain issuance of academic records. |
| **department** | Manages academic departments (e.g., Computer Science) inside academies. |
| **helper** | Contains test routes to generate mock signatures and developer utility tools. |
| **identity** | Manages the on-chain identity lifecycle (General, Academy, Professor, Student). |
| **media** | Uploads assets (e.g. photos, logos) to secure Cloudinary storage. |
| **professor** | Registers and manages professor ranks, bios, hours, and department roles. |
| **student** | Registers and manages student levels, advisor pairings, and GPA scores. |
| **user** | Manages base user data (names, national ID, email, DOB) shared by profiles. |

---

## 🗄️ 3. Database Schema & Relationships

### Database Tables

The database schema is defined across SQL migrations in [src/db/migrations/](file:///home/santetu/S2dent/api/src/db/migrations/).

#### 1. `users` (Base User Profiles)
Stores personal details of academic members.
*   `id` (UUID, Primary Key): Unique identifier.
*   `first_name`, `middle_name`, `last_name` (VARCHAR): Profile names.
*   `full_name` (VARCHAR, Unique): Automatically built as: `first_name + ' ' + (middle_name ? middle_name + ' ' : '') + last_name` on database insertions.
*   `date_of_birth` (DATE): Date of birth.
*   `gender` (`gender_enum`): User gender.
*   `national_id` (VARCHAR, Unique): Government ID.
*   `nationality` (VARCHAR): User nationality.
*   `email` (VARCHAR, Unique): User email address.
*   `phone` (VARCHAR): Contact number.
*   `photo_url` (VARCHAR): Cloud URL to profile picture.

#### 2. `academies` (Educational Institutions)
*   `id` (UUID, Primary Key): Unique identifier.
*   `academy_number` (VARCHAR, Unique): Auto-incremented sequence code (format: `ACD_YYMMDD{seq}`).
*   `name` (VARCHAR, Unique): Institution name.
*   `short_name` (VARCHAR, Unique): Uppercase short name.
*   `type` (`academy_type`): Academy type classification.
*   `description` (TEXT): Academy overview.
*   `website`, `logo_url` (VARCHAR): Public internet locations.
*   `email`, `phone` (VARCHAR): Contact details.
*   `legal_name`, `registration_number`, `tax_id` (VARCHAR, Unique): Legal billing details.
*   `billing_email` (VARCHAR): Target email for invoices.

#### 3. `departments` (Academic Branches)
*   `id` (UUID, Primary Key): Unique identifier.
*   `academy_id` (UUID, Foreign Key -> `academies.id`): Institution department belongs to.
*   `code` (VARCHAR): Department code (unique per academy).
*   `name` (VARCHAR): Department name (unique per academy).
*   `faculty` (VARCHAR): Parent faculty (e.g. Science, Engineering).
*   `total_years` (INTEGER): Normal program duration.
*   `description` (TEXT): Major descriptions.
*   `is_active` (BOOLEAN): Status toggle.

#### 4. `professors` (Faculty Records)
*   `id` (UUID, Primary Key): Unique identifier.
*   `user_id` (UUID, Unique, Foreign Key -> `users.id`): Link to user metadata.
*   `academy_id` (UUID, Foreign Key -> `academies.id`): Employing institution.
*   `department_id` (UUID, Foreign Key -> `departments.id`): Subject department.
*   `employee_number` (VARCHAR, Unique): Faculty staff ID (format: `EMP_YYMMDD{seq}`).
*   `title` (VARCHAR): Faculty title (e.g. Dr., Prof.).
*   `rank` (`professor_rank_enum`): Academic rank.
*   `specialization` (VARCHAR): Subject expertise.
*   `hire_date` (DATE): Contract start date.
*   `employment_type` (`employment_type_enum`): Employment contract type.
*   `office_location`, `office_hours`, `bio` (TEXT): Bio and scheduling data.
*   `is_active` (BOOLEAN): Status toggle.

#### 5. `students` (Student Records)
*   `id` (UUID, Primary Key): Unique identifier.
*   `user_id` (UUID, Unique, Foreign Key -> `users.id`): Link to user metadata.
*   `academy_id` (UUID, Foreign Key -> `academies.id`): Institution of study.
*   `department_id` (UUID, Foreign Key -> `departments.id`): Program department.
*   `advisor_id` (UUID, Foreign Key -> `professors.id`, Nullable): Paired advisor professor.
*   `student_number` (VARCHAR, Unique): Student academic ID number (format: `STU_YYMMDD{seq}`).
*   `cgpa` (NUMERIC, 0.00 to 4.00): Current Cumulative GPA.
*   `current_level` (Virtual/Computed): Calculated dynamically as `CurrentYear - EnrollmentYear + 1`.
*   `enrollment_status` (`enrollment_status`): Enrolled status code.
*   `enrollment_date` (DATE): Start date.
*   `expected_graduation_date` (DATE): Computed on insertion as `enrollment_date + department.total_years`.
*   `actual_graduation_date` (DATE): Graduation date.

#### 6. `addresses` (Locations)
*   `id` (UUID, Primary Key): Unique identifier.
*   `academy_id` (UUID, Foreign Key -> `academies.id`, Nullable): Linked academy address.
*   `user_id` (UUID, Foreign Key -> `users.id`, Nullable): Linked user address.
*   `address_line1`, `address_line2`, `street`, `district`, `state`, `postal_code`, `city`, `country` (VARCHAR): Details.
*   `latitude`, `longitude` (DECIMAL): Geopoint coords.
*   *Constraint:* Must link to *exactly one* academy_id OR user_id, not both.

#### 7. `identities` (Blockchain Identity Links)
Links database profiles to blockchain public addresses.
*   `id` (UUID, Primary Key): Unique identifier.
*   `user_id` (UUID, Foreign Key -> `users.id`, Nullable): Link to user.
*   `academy_id` (UUID, Foreign Key -> `academies.id`, Nullable): Link to academy.
*   `wallet_address` (VARCHAR, Unique): Cryptographic public wallet address.
*   `public_key` (VARCHAR, Unique): Hex public key of wallet.
*   `role` (`user_role`): Access privileges.
*   `signature` (TEXT): Verified wallet registration signature.
*   `nonce` (VARCHAR): Cryptographic nonce.
*   `nonce_expires_at` (TIMESTAMP): Expiry of nonce.
*   `issue_identity_tx_hash`, `revoke_identity_tx_hash` (VARCHAR): Blockchain hashes.
*   `issued_at`, `revoked_at` (TIMESTAMP): Block confirmation dates.
*   `revocation_reason` (TEXT): Reason logs.
*   `status` (`identity_status`): Identity state.

#### 8. `identity_certificates` (X.509 PKI Certificates)
*   `id` (UUID, Primary Key): Unique identifier.
*   `wallet_address` (TEXT, Unique): Wallet address cert belongs to.
*   `certificate_pem` (TEXT): X.509 client certificate.
*   `chain_pem` (TEXT): Full certificate trust chain (Client -> App CA -> ISRG Root X1).
*   `fingerprint` (TEXT, Unique): Sha256 fingerprint hash of cert.

#### 9. `credentials` (Academic Credentials)
*   `id` (UUID, Primary Key): Unique identifier.
*   `title`, `code` (VARCHAR): Name and unique registration code (format: `CRD_YYMMDD{seq}`).
*   `type` (`credential_type`): Category.
*   `description`, `locale` (TEXT): Metadata.
*   `authorizer_wallet_address` (VARCHAR): Academy smart contract wallet.
*   `issuer_wallet_address` (VARCHAR): Signing issuer wallet.
*   `student_wallet_address` (VARCHAR): Receiving student wallet.
*   `credential_index` (INTEGER): Index location on the blockchain contract array.
*   `issue_tx_hash`, `revoke_tx_hash` (VARCHAR): Blockchain transaction hashes.
*   `issued_at`, `revoked_at` (TIMESTAMP): Dates.
*   `revocation_reason` (TEXT): Reason logs.
*   `payload` (JSONB): Raw credentials parameters (validated by type).
*   `payload_hash` (VARCHAR): Keccak256 hash of credential payload.
*   `encrypted_payload` (TEXT): AES-256-GCM encrypted payload, accessible only by student.
*   `signature` (VARCHAR): Issuer EIP-712 signature.

#### 10. `pending_transactions` (Blockchain Queue)
*   `id` (UUID, Primary Key): Unique identifier.
*   `tx_hash` (TEXT, Unique): Transaction hash broadcast to node.
*   `payload` (JSONB): Sync metadata (e.g. roles, actions, emails).
*   `status` (`transaction_status`): Blockchain confirmation state.

#### 11. `pending_events` (Socket Event Queue)
*   `id` (UUID, Primary Key): Unique identifier.
*   `wallet_address` (VARCHAR): Recipient wallet address.
*   `event_name` (TEXT): WebSocket event name.
*   `payload` (JSONB): Event data.

---

### Database Enums

Database tables validate fields using PostgreSQL enumerations:

| Enum Name | Supported Values |
| :--- | :--- |
| **`gender_enum`** | `male`, `female` |
| **`academy_type`** | `university`, `college`, `school`, `institute`, `online_platform`, `other` |
| **`employment_type_enum`** | `full_time`, `part_time`, `adjunct`, `visiting`, `contract` |
| **`professor_rank_enum`** | `Assist. Prof`, `Assoc. Prof`, `Prof`, `Lecturer`, `Instructor` |
| **`enrollment_status`** | `active`, `inactive`, `graduated` |
| **`user_role`** | `student`, `professor`, `academy`, `system_admin` |
| **`identity_status`** | `pending`, `issued`, `revoked`, `rejected` |
| **`transaction_status`** | `pending`, `verified`, `failed` |
| **`credential_type`** | `attendance`, `enrollment`, `degree`, `achievement`, `certificate`, `transcript` |

---

## 🚦 4. API Endpoints Reference

### Authentication endpoints (`/api/auth`)

| Method | Path | Function | Required Role |
| :--- | :--- | :--- | :--- |
| `GET` | `/admin/nonce` | Generates a 5-minute cryptographic nonce for admin authentication. | Public |
| `GET` | `/nonce` | Generates a 5-minute cryptographic nonce for a specific wallet address. | Public |
| `POST` | `/verify` | Verifies a user's wallet signature and returns Access + Refresh tokens. | Public |
| `POST` | `/admin/verify` | Verifies the admin's wallet signature and returns Access + Refresh tokens. | Public |
| `POST` | `/refresh` | Exposes a new Access token using a cached Refresh token. | Public |
| `DELETE` | `/logout` | Revokes a Refresh token and removes it from the cache store. | Public |
| `POST` | `/otp/send` | Dispatches a 6-digit OTP code to the requested email address. | Public |

### Academy endpoints (`/api/academies`)

| Method | Path | Function | Required Role |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | Retrieves a summary list of all registered academies. | `admin` |
| `GET` | `/me` | Retrieves the profile details of the logged-in academy. | `academy` |
| `GET` | `/summary` | Retrieves a simple summary of the user's parent academy. | `professor`, `student` |
| `GET` | `/:id` | Retrieves full profile details of an academy by ID. | `admin` |
| `POST` | `/` | Registers a new academy on the platform database. | `admin` |
| `PUT` | `/me` | Updates description, logo URL, phone, and website details. | `academy` |

### Professor endpoints (`/api/professors`)

| Method | Path | Function | Required Role |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | Lists all professors registered in the academy. | `academy` |
| `GET` | `/names` | Lists basic IDs and full names of professors in the academy. | `academy` |
| `GET` | `/me` | Retrieves the profile details of the logged-in professor. | `professor` |
| `GET` | `/:id` | Retrieves profile details of a professor by ID. | `academy` |
| `POST` | `/` | Registers a new professor under the academy. | `academy` |
| `PUT` | `/:id` | Updates rank, employment status, and office details. | `academy` |
| `PUT` | `/` | Updates bio statement of the logged-in professor. | `professor` |

### Student endpoints (`/api/students`)

| Method | Path | Function | Required Role |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | Lists all students enrolled in the academy. | `academy`, `professor` |
| `GET` | `/me` | Retrieves the profile details of the logged-in student. | `student` |
| `GET` | `/:id` | Retrieves specific student profile by ID. | `academy`, `professor` |
| `POST` | `/` | Registers a new student under the academy. | `academy` |
| `PUT` | `/:id` | Updates the advisor or CGPA record of a student. | `academy` |

### User endpoints (`/api/users`)

| Method | Path | Function | Required Role |
| :--- | :--- | :--- | :--- |
| `POST` | `/` | Creates a new base user record (identity mapping container). | `academy` |
| `PUT` | `/` | Updates phone number and photo URL properties. | `professor`, `student` |
| `GET` | `/me` | Retrieves personal user profile details. | `professor`, `student` |
| `GET` | `/:id` | Retrieves a user's details by ID. | `academy` |

### Address endpoints (`/api/addresses`)

| Method | Path | Function | Required Role |
| :--- | :--- | :--- | :--- |
| `POST` | `/` | Creates a new geographical location record. | `academy`, `admin` |
| `PUT` | `/` | Updates address details. | `academy`, `professor`, `student` |
| `GET` | `/` | Retrieves own geographical address. | `academy`, `professor`, `student` |
| `GET` | `/:id` | Retrieves address record by ID. | `academy`, `admin` |

### Department endpoints (`/api/departments`)

| Method | Path | Function | Required Role |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | Lists active departments within the academy. | `academy` |
| `GET` | `/me` | Retrieves the program department of the current user. | `professor`, `student` |
| `POST` | `/` | Creates a program department. | `academy` |
| `PUT` | `/:id` | Updates description properties of a department. | `academy` |
| `DELETE` | `/:id` | Deactivates a department (soft delete). | `academy` |

### Identity Management (`/api/identities` & `/api/identity`)

| Method | Path | Function | Required Role |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/identities/waiting` | Lists users awaiting blockchain identity confirmations. | `academy` |
| `GET` | `/api/identity/academies/me` | Retrieves active academy identity attributes. | `academy` |
| `GET` | `/api/identity/academies/by-id/:id` | Retrieves academy identity details by ID. | `admin` |
| `GET` | `/api/identity/academies/:address` | Retrieves academy blockchain details by wallet address. | Public |
| `POST` | `/api/identity/academies/issue` | Broadcasts transaction to issue an academy identity. | `admin` |
| `POST` | `/api/identity/academies/revoke` | Broadcasts transaction to revoke an academy identity. | `admin` |
| `GET` | `/api/identity/professors/me` | Retrieves active professor identity attributes. | `professor` |
| `GET` | `/api/identity/professors/by-id/:id` | Retrieves professor identity by professor ID. | `academy` |
| `GET` | `/api/identity/professors/:address` | Retrieves professor blockchain details by wallet address. | Public |
| `GET` | `/api/identity/professors/pending/:wallet_address/schema` | Generates the EIP-712 typed data schema for issuance. | `academy` |
| `POST` | `/api/identity/professors/request-issuance` | Submits requested wallet registration details. | Public |
| `POST` | `/api/identity/professors/issue` | Broadcasts transaction to issue a professor identity. | `academy` |
| `DELETE` | `/api/identity/professors/revoke` | Broadcasts transaction to revoke a professor identity. | `academy` |
| `GET` | `/api/identity/students/me` | Retrieves active student identity attributes. | `student` |
| `GET` | `/api/identity/students/by-user-id/:id` | Retrieves student identity by user ID. | `academy`, `professor` |
| `GET` | `/api/identity/students/:address` | Retrieves student blockchain details by wallet address. | Public |
| `GET` | `/api/identity/students/pending/:wallet_address/schema` | Generates the EIP-712 typed data schema for student issuance. | `academy` |
| `POST` | `/api/identity/students/request-issuance` | Submits requested student wallet registration details. | Public |
| `POST` | `/api/identity/students/issue` | Broadcasts transaction to issue a student identity. | `academy` |
| `DELETE` | `/api/identity/students/revoke` | Broadcasts transaction to revoke a student identity. | `academy` |

### Credentials Management (`/api/credentials`)

| Method | Path | Function | Required Role |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | Retrieves all credentials linked to the user's wallet address. | `student`, `professor`, `academy` |
| `GET` | `/verification` | Retrieves decrypted credential payloads. | `verifier` |
| `GET` | `/:id/signature-schema` | Retrieves EIP-712 schema for signing a credential draft. | `student`, `professor`, `academy`, `verifier` |
| `GET` | `/:id` | Retrieves full credential profile. | `student`, `professor`, `academy` |
| `POST` | `/` | Registers a new credential draft on the server. | `professor`, `academy` |
| `POST` | `/:id/token` | Generates an ephemeral access token for verifiers. | `student` |
| `POST` | `/:id/issue` | Submits issuer signature to write a credential to the blockchain. | `professor`, `academy` |
| `DELETE` | `/:id/revoke` | Broadcasts transaction to revoke a credential index on-chain. | `academy` |

### Media & Helper (`/api/media` & `/api/helper`)

| Method | Path | Function | Required Role |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/media/upload` | Uploads an image file to Cloudinary. | `admin`, `professor`, `student`, `academy` |
| `GET` | `/api/helper/health` | Simple system health indicator interface. | Public |
| `GET` | `/api/helper/signature` | Signs EIP-712 typed payloads using a testing key. | Public (expects body) |
| `GET` | `/api/helper/signature-string` | Signs string message values using a testing key. | Public (expects body) |

---

## 🔒 5. Authentication, Authorization & Security Flow

Authentication in S2dent is entirely cryptographic. There are no passwords. Users prove their identity by signing data with private keys from their Web3 wallets.

### Authentication Steps

```
[Client App]                             [API Server]                         [Redis Cache]
     │                                         │                                    │
     │ 1. GET /api/auth/nonce?wallet_addr=...  │                                    │
     ├────────────────────────────────────────>│                                    │
     │                                         │                                    │
     │ 2. Return random nonce challenge        │                                    │
     |<────────────────────────────────────────┤                                    │
     │                                         │                                    │
     │ 3. Sign nonce with private key          │                                    │
     │                                         │                                    │
     │ 4. POST /api/auth/verify (signature)    │                                    │
     ├────────────────────────────────────────>│                                    │
     │                                         │ 5. Recover signer address          │
     │                                         │ 6. Verify matches database address │
     │                                         │                                    │
     │ 7. Return Access & Encrypted Refresh    │───────────────────────────────────>│ (Save tokens)
     |<────────────────────────────────────────┤                                    │
```

1. **Nonce Challenge:** The client requests a nonce challenge by sending their public wallet address. The server creates a secure random code and stores it temporarily in the database [nonce](file:///home/santetu/S2dent/api/src/modules/auth/auth.service.js#L25) for 5 minutes.
2. **Signature Verification:** The client signs the nonce message using their Ethereum wallet and submits the signature to the server.
3. **Signer Recovery:** The server uses `ethers` [recoverSigner](file:///home/santetu/S2dent/api/src/utils/crypto.js#L7) to extract the wallet address from the signature. If it matches the user's registered wallet address, they are authenticated.
4. **JWT Issuance:** The server generates role-specific access and refresh tokens.
5. **Token Expirations (TTL):** Depending on the user's mapped role, distinct token lifetimes (TTL) are enforced:
    *   **Student:** Access Token is valid for **15 minutes**; Refresh Token is valid for **3 hours**.
    *   **Academy & Professor:** Access Token is valid for **1 hour**; Refresh Token is valid for **24 hours**.
6. **Token Encryption:** To prevent token hijacking, JWT tokens are encrypted using `aes-256-gcm` using the server's secret key [JWT_ENCRYPTION_SECRET](file:///home/santetu/S2dent/api/src/utils/jwt.js#L8) before transmission to the client.
7. **Token Caching:** Refresh tokens are saved in Redis with key `refresh:<hash_of_token>` to allow verification or revocation on logout.

### OTP (One-Time Password) Mail Flow

To onboard new users, the system links their email addresses to their cryptographic identities:

1. A user requests an OTP at `POST /api/auth/otp/send`.
2. The server generates a mock/testing OTP (`000000`) and cache payload containing user ID, role, and email in Redis using [otpKey](file:///home/santetu/S2dent/api/src/cache/cache.keys.js#L4) with a 5-minute TTL.
3. An email is dispatched to the user containing the OTP.
4. The user enters their email and OTP, along with their wallet signature, at the `/request-issuance` identity endpoint. The server validates the cached payload to link the wallet address to their profile.

### Role-Based Access Control (RBAC)

Authorization is handled by [role.middleware.js](file:///home/santetu/S2dent/api/src/middlewares/role.middleware.js), which matches the authenticated user's role claim against authorized lists. The supported roles are:

*   `system_admin` / `admin`: Can register institutions and issue academy identities.
*   `academy`: Can manage departments, professors, students, and issue faculty/student identities.
*   `professor`: Can request identity issuance, draft and issue credentials.
*   `student`: Can request identity, sign credentials, and view own records.
*   `verifier`: Can verify credentials using public keys.

---

## ⚡ 6. Real-Time WebSockets & Event Synchronization

S2dent uses a custom WebSocket architecture in [socket.js](file:///home/santetu/S2dent/api/src/config/socket.js) to deliver real-time notifications to users.

### Socket Authentication
When a client connects to the WebSocket server, they must pass their access token in the socket auth header. The server verifies and decrypts this token to map the connection ID (`socket.id`) to their `wallet_address` inside an in-memory map.

### Handling Offline Clients
To prevent notifications from being lost when a user is disconnected (e.g. mobile app closed, no internet connection):

1. **Pending Event Saving:** When an event is emitted via [emitToUser](file:///home/santetu/S2dent/api/src/config/socket.js#L118), it is automatically stored in the PostgreSQL database table `pending_events`.
2. **Immediate Emission:** If the target user is currently online, the event is immediately emitted over their WebSocket channel.
3. **Flushing on Reconnect:** When a disconnected user comes back online, the socket connection event automatically triggers [flushPendingEvents](file:///home/santetu/S2dent/api/src/config/socket.js#L26). This selects all unsent events for their wallet address, sends them one by one, and waits for a client-side acknowledgment.
4. **Client-Side Acknowledgment:** Once the client receives the event, they emit an `ack_event` containing the event ID. The server then deletes the event from the `pending_events` table.

---

## 🔗 7. Asynchronous Blockchain Event Listener

A central design pattern in S2dent is **asynchronous, event-driven state synchronization**. Writing transactions directly to a blockchain takes time (block confirmation times range from 10 to 15 seconds). 

To ensure the API is fast and responsive, the server registers the transaction off-chain and responds immediately, while processing confirmations in the background.

```
Client               API Controller          Blockchain Contract            Listener.js
  │                       │                           │                         │
  │ 1. Post /issue        │                           │                         │
  ├──────────────────────>│                           │                         │
  │                       │ 2. Send transaction (tx)  │                         │
  │                       ├──────────────────────────>│                         │
  │                       │                           │                         │
  │                       │ 3. Save pending status    │                         │
  │                       ├───────────────────────────┼────────────────────────>│
  │                       │                           │                         │
  │ 4. HTTP 200 (pending) │                           │                         │
  |<──────────────────────┤                           │                         │
  │                       │                           │                         │
  │                       │                           │ 5. tx block confirmed   │
  │                       │                           │ (after ~10 seconds)     │
  │                       │                           │<────────────────────────┤
  │                       │                           │                         │
  │                       │                           │                         │ 6. Update local DB
  │                       │                           │                         │ 7. Emit WS notification
  │                       │                           │                         │ 8. Send Email notification
```

### The Synchronization Flow

1. **Estimating & Broadcasting:** When a user requests an identity issuance or revocation, the corresponding module service estimates gas usage and broadcasts the transaction to the network using the `platformWallet` signer.
2. **Transaction Queueing:** The service stores the transaction metadata in the `pending_transactions` table with a status of `pending`. It binds the transaction promise to the background listener.
3. **Immediate HTTP Response:** The controller returns a `200 OK` response to the client immediately, containing the transaction hash and a `pending` status, allowing the client interface to remain interactive.
4. **Background Listener:** The [listenOnTransaction](file:///home/santetu/S2dent/api/src/blockchain/listener.js#L124) function calls `tx.wait(1)` to await exactly 1 block confirmation from the Ethereum blockchain provider.
5. **Success Handling:** When the transaction resolves successfully:
    *   The listener updates the `pending_transactions` status to `verified`.
    *   It triggers [performAction](file:///home/santetu/S2dent/api/src/blockchain/listener.js#L76), which updates off-chain state. For example:
        *   **Identity Issuance (`identity_issue`):** Marks the user's database identity record status as `issued` and saves the generated certificate in the `identity_certificates` database table.
        *   **Identity Revocation (`identity_revoke`):** Marks the identity as `revoked`, registers the date/reason, and sets the student/professor status to `inactive`.
        *   **Credential Issuance (`credential_issue`):** Saves the credential indices and block time on the database credential record.
    *   It dispatches confirmation emails via SMTP and pushes real-time WebSocket notifications to the client.
6. **Failure Handling:** If the transaction fails on-chain, the status is marked as `failed` in `pending_transactions`, and a failure notification (via socket and email) is sent to the user.

---

## 📜 8. Public Key Infrastructure (Certificate Authority)

S2dent implements its own X.509 PKI (Public Key Infrastructure) inside the [ca/](file:///home/santetu/S2dent/api/src/ca/) module to issue client certificates verifying identity properties.

```
ISRG Root X1 (Trust Anchor)
          │
          ▼
   S2dent App CA (Self-Signed Dev / Configured Production)
          │
          ▼
   Client Certificate (Common Name = Wallet Address, OID Extensions)
```

1. **Trust Anchor:** The system references Let's Encrypt's **ISRG Root X1** DER root certificate (fetched from [ca.constants.js](file:///home/santetu/S2dent/api/src/ca/ca.constants.js#L3) or downloaded dynamically).
2. **App CA:** The [getAppCa](file:///home/santetu/S2dent/api/src/ca/ca.app.js#L59) function returns the signing certificate. In production, it loads certificates from environment variables (`APP_CA_PRIVATE_KEY_PEM` and `APP_CA_CERT_PEM`). In development environments, it creates an ephemeral 10-year root key.
3. **Certificate Builder:** The [buildIdentityCertificate](file:///home/santetu/S2dent/api/src/ca/ca.identity.js#L51) generates a client certificate signed by the App CA:
    *   **RSA Keypair:** Generates a 2048-bit RSA key pair for the user.
    *   **Serial Number:** Formatted as `sha256(wallet_address:unique_id).hex().slice(0, 16)`.
    *   **Custom OIDs:** Embeds structured attributes in the certificate metadata chain:
        *   `1.3.6.1.4.1.99999.1`: Stated issuer wallet address.
        *   `1.3.6.1.4.1.99999.2`: Internal profile unique identifier.
    *   **Chaining:** Combines the client certificate, App CA certificate, and ISRG Root X1 cert into a single PEM trust bundle.
    *   **On-Chain Anchor:** Stores the certificate PEM and chain in the database, and registers the SHA-256 cert fingerprint on the smart contract.

---

## 🔗 9. Blockchain Contract Interface (Solidity Specs)

The API coordinates actions with smart contracts using compiled contract interfaces (ABIs) in [contracts/S2dent.json](file:///home/santetu/S2dent/api/src/blockchain/contracts/S2dent.json).

### Solidity Custom Errors & Revert Codes
The smart contract contains custom errors that throw during transaction execution when validation rules are violated:

| Revert Error | Cause |
| :--- | :--- |
| `AcademyIdAlreadyUsed` | The academy identifier has already been registered on-chain. |
| `AcademyIdentityAlreadyIssued` | An active identity already exists for the academy's wallet. |
| `AcademyIdentityAlreadyRevoked` | The institution's identity has already been revoked. |
| `AcademyIdentityNotIssued` | No identity exists for the institution on-chain. |
| `ProfessorEmployeeIdAlreadyUsed` | The professor employee ID is already bound to another wallet. |
| `StudentIdAlreadyUsed` | The student number is already bound to another wallet. |
| `ECDSAInvalidSignature` | The signature recover address does not match the expected signer. |
| `CredentialPayloadAlreadyUsed` | The Keccak256 hash of the credential payload has already been registered. |

### Contract Verification Events
The contract broadcasts the following Solidity events, which can be monitored:
*   `AcademyIssued(address academy)`
*   `AcademyRevoked(address academy)`
*   `ProfessorIssued(address professor, address academy)`
*   `ProfessorRevoked(address professor, address academy)`
*   `StudentIssued(address student, address academy)`
*   `StudentRevoked(address student, address academy)`
*   `CredentialIssued(address studentAddress, address issuerAddress, bytes32 payloadHash, uint256 index, uint64 issuedAt)`
*   `CredentialRevoked(address studentAddress, uint256 index, address revoker)`

---

## 📝 10. Credential Payload Schemas

When drafting credentials (`POST /api/credentials`), the request body must match the specific Joi validator schemas defined in [credential.validator.js](file:///home/santetu/S2dent/api/src/modules/credential/credential.validator.js#L64):

### 1. Enrollment Credentials
*   `course_name` (String): Title of the course.
*   `course_code` (String): Unique course registration code.
*   `academic_year` (String): Year range format (e.g., `2025-2026`).
*   `semester` (Enum: `fall`, `spring`, `summer`).
*   `enrollment_date` (Date): Program start date.

### 2. Degree Credentials
*   `degree_title` (String): Title of degree awarded.
*   `degree_level` (Enum: `bachelor`, `master`, `phd`).
*   `major` (String): Academic field.
*   `program_code` (String): Institutional degree code.
*   `faculty`, `department` (String): Internal program origin.
*   `graduation_date` (Date): Program completion date.
*   `gpa` (Number): Graduation CGPA.
*   `gpa_scale` (Enum: `4.0`, `5.0`, `100`): Maximum GPA score.
*   `class_rank`, `class_size` (Integer): Student ranking indices.
*   `honors` (Enum: `with_honors`, `great_honors`, `highest_honors`, Nullable).
*   `total_credits_earned`, `required_credits` (Integer): Program credit weights.

### 3. Attendance Credentials
*   `course_code`, `course_name` (String): Target class.
*   `academic_year` (String): Year range format.
*   `semester` (Enum: `fall`, `spring`, `summer`).
*   `total_sessions` (Integer): Total classes scheduled.
*   `attended_sessions` (Integer): Total classes attended.
*   `excused_absences` (Integer): Excused absences.
*   `period_from`, `period_to` (Date): Range parameters.

---

## 🛠️ 11. Core Configuration & External Integrations

### Environment Variables (.env)

The API configures its settings using environment variables, parsed inside [env.js](file:///home/santetu/S2dent/api/src/config/env.js).

| Variable | Type | Description |
| :--- | :--- | :--- |
| **`NODE_ENV`** | String | Application environment (`development`, `production`, `test`). |
| **`PORT`** | Integer | Port the server listens on (default: `3000`). |
| **`DB_HOST`** | String | PostgreSQL host address. |
| **`DB_USER`** | String | PostgreSQL database username. |
| **`DB_PASSWORD`** | String | PostgreSQL database password. |
| **`DB_NAME`** | String | PostgreSQL database name. |
| **`DB_PORT`** | Integer | PostgreSQL database port (default: `5432`). |
| **`DB_SSL`** | Boolean | Set to `true` to force SSL/TLS database connections. |
| **`REDIS_HOST`** | String | Redis server host address. |
| **`REDIS_PORT`** | Integer | Redis server port. |
| **`REDIS_PASSWORD`** | String | Redis password challenge. |
| **`REDIS_URL`** | String | Combined Redis URL (takes precedence over host/port if set). |
| **`BLOCKCHAIN_RPC_URL`** | String | JSON-RPC endpoint for the Ethereum node. |
| **`BLOCKCHAIN_PLATFORM_PRIVATE_KEY`** | String | Private key of the system operator wallet used to sign transactions. |
| **`BLOCKCHAIN_DEPLOYED_CONTRACT_ADDRESS`** | String | Contract address of S2dent on the network. |
| **`JWT_ACCESS_SECRET`** | String | Secret key used to sign access tokens. |
| **`JWT_REFRESH_SECRET`** | String | Secret key used to sign refresh tokens. |
| **`JWT_ENCRYPTION_SECRET`** | String | 32-byte hexadecimal key used to encrypt/decrypt tokens via AES-GCM. |
| **`SMTP_HOST`** | String | SMTP host for sending emails. |
| **`SMTP_PORT`** | Integer | SMTP port (e.g. `587` or `465`). |
| **`SMTP_USER`** | String | SMTP credentials username. |
| **`SMTP_PASS`** | String | SMTP credentials password. |
| **`EMAIL_FROM`** | String | Sender address for system emails. |
| **`CLOUDINARY_CLOUD_NAME`** | String | Cloudinary cloud namespace. |
| **`CLOUDINARY_API_KEY`** | String | Cloudinary API access key. |
| **`CLOUDINARY_API_SECRET`** | String | Cloudinary API access secret. |

---

## 💻 12. Local Development & Testing Specifications

For local development setup and verification, the following deterministic resources are predefined:

### Testing Wallet Keys
For local development, the system interfaces with local EVM chains (e.g. Hardhat node) utilizing the default seed accounts:

| Identity Profile | Public Wallet Address | Private Key |
| :--- | :--- | :--- |
| **`system_admin` (Admin)** | `0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266` | `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80` |
| **`academy` (Institution)** | `0x70997970c51812dc3a010c7d01b50e0d17dc79c8` | `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d` |
| **`professor` (Faculty)** | `0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc` | `0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a` |
| **`student` (Learner)** | `0x90f79bf6eb2c4f870365e785982e1f101e93b906` | `0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6` |

### Database Seeding Cycle (`npm run seed`)
Executing `node seeds/seed.js` executes an end-to-end data population orchestrator:
1.  **Admin Login:** Authenticates system admin wallet address via nonce request/response signature flow.
2.  **Academy Setup:** Registers a university profile, adds an academy address, and issues a blockchain identity.
3.  **Faculty Pairing:** Registers a base user profile, creates a department (e.g. CSE), creates a professor account, submits a professor identity request, and authorizes professor identity on the blockchain.
4.  **Student Pairing:** Registers a student base profile, enrolls the student under the professor as advisor, requests student identity, and authorizes the student identity on the blockchain.
5.  **Credential Issuance:** Academy issues an *Enrollment Credential* draft to the student. Professor issues an *Attendance Credential* draft. Both are signed via EIP-712 and validated on-chain.

### Test Environment overrides
Mocha test files configure `NODE_ENV=test` and load parameters from `.env.test`, executing query operations inside the dedicated `s2dent_test` schema. Standard dependency structures are mocked out in testing environments using the `esmock` package.

---

## 🔄 13. Request Lifecycle (Example: Issue Student Identity)

To illustrate how all layers and integrations connect, here is the complete journey of a request calling `POST /api/identity/students/issue`:

### Step 1: Routing & Middlewares
1.  **Request Reception:** The client posts a payload containing `wallet_address` and `signature` to `/api/identity/students/issue`.
2.  **Rate Limiter:** The request goes through [globalLimiter](file:///home/santetu/S2dent/api/src/middlewares/rateLimit.middleware.js#L32) to prevent denial of service attacks.
3.  **Authentication:** The [authenticate](file:///home/santetu/S2dent/api/src/middlewares/auth.middleware.js#L3) middleware extracts the bearer access token, decrypts it using the `JWT_ENCRYPTION_SECRET`, validates its signature, and binds the user object `req.user` to the request context.
4.  **Authorization:** The [requireRole('academy')](file:///home/santetu/S2dent/api/src/middlewares/role.middleware.js#L1) check confirms the logged-in user is an authorized Academy.
5.  **Validation:** The [validate(issueIdentitySchema)](file:///home/santetu/S2dent/api/src/middlewares/validate.middleware.js#L1) middleware validates the request body against the Joi student issuance schema.

### Step 2: Controller & Service Processing
6.  **Controller Action:** The request reaches `issueIdentityController` inside [student.identity.controller.js](file:///home/santetu/S2dent/api/src/modules/identity/student/student.identity.controller.js), which calls `issueStudentIdentityService` with the payload.
7.  **Profile Checks:** The service queries PostgreSQL to fetch the student profile, checking that the student exists and is active.
8.  **X.509 Certificate Generation:** The service calls [buildIdentityCertificate](file:///home/santetu/S2dent/api/src/ca/ca.identity.js#L51). The PKI CA uses the student's name, student number, and department to generate a unique RSA certificate. The certificate PEM and trust chain are generated, and the SHA-256 fingerprint is calculated.
9.  **On-Chain Broadcast:** The service estimates gas and calls `issueStudentIdentity` on the Ethereum contract using [student.identity.blockchain.js](file:///home/santetu/S2dent/api/src/blockchain/identity/student.identity.blockchain.js#L37). It submits the student address, certificate fingerprint, public key, and signature. This returns a blockchain transaction object `tx` containing the hash.
10. **Off-Chain Queueing:** The service stores the pending transaction details inside PostgreSQL using `saveTransaction`.
11. **Listener Initialization:** The service calls [listenOnTransaction(tx)](file:///home/santetu/S2dent/api/src/blockchain/listener.js#L124) to track confirmation, then returns immediately.
12. **Response return:** The controller replies with an HTTP `200 OK` status and the transaction hash.

### Step 3: Background Listener & Synchronization
13. **Block Confirmation:** The Ethereum provider confirms the transaction after 10-15 seconds.
14. **State Update:** The listener receives the block receipt, marks `pending_transactions` as `verified`, and triggers `performAction`.
15. **Off-Chain Persistence:** The identity record status inside the `identities` table is updated to `issued`, and the PEM certificate is saved in the `identity_certificates` table.
16. **Notifications:** Sockets push a real-time notification to the student's app showing that their identity is ready, and a welcome email is sent to their registered inbox.
