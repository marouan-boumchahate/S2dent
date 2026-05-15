import { expect } from "chai";
import hre from "hardhat";

describe("Credential", () => {

    // ─── Academy details ──────────────────────────────────────────────────────
    const ACADEMY_ID      = "ACADEMY_CRED_001";
    const ACADEMY_NAME    = "Fenerbahçe University";
    const ACADEMY_CODE    = "FBU";
    const ACADEMY_FP      = "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";

    const SECOND_ACADEMY_ID   = "ACADEMY_CRED_002";
    const SECOND_ACADEMY_NAME = "Second University";
    const SECOND_ACADEMY_CODE = "SCU";

    // ─── Professor details ────────────────────────────────────────────────────
    const PROFESSOR_EMPLOYEE_ID = "EMP_CRED_001";
    const PROFESSOR_NATIONAL_ID = "TR-CRED-PROF-01";
    const PROFESSOR_NAME        = "Alan Turing";

    // ─── Student details ──────────────────────────────────────────────────────
    const STUDENT_ID           = "STD-CRED-001";
    const STUDENT_NATIONAL_ID  = "NAT-CRED-001";
    const STUDENT_NAME         = "Marouan Boumchahate";
    const STUDENT_NATIONALITY  = "Moroccan";
    const STUDENT_DEPARTMENT   = "Computer Science";
    const STUDENT_COUNTRY      = "Turkey";

    // ─── Credential details ───────────────────────────────────────────────────
    const CRED_TITLE        = "Bachelor of Computer Science";
    const CRED_CODE         = "BSC-CS-2024";
    const CRED_DESCRIPTION  = "Awarded for the completion of the 4-year Computer Science program.";
    const CRED_TYPE_DEGREE  = 2; // enum CredentialType.degree
    const CRED_PAYLOAD_HASH =
        "0x1111111111111111111111111111111111111111111111111111111111111111";
    const CRED_PAYLOAD_SIG  =
        "0x2222222222222222222222222222222222222222222222222222222222222222";
    const CRED_ENCRYPTED    = "eyJhbGciOiJBMjU2R0NNS1ciLCJlbmMiOiJBMjU2R0NNIn0.encrypted_payload";

    const ONE_DAY_SECS  = 86_400;
    const ONE_YEAR_SECS = 365 * ONE_DAY_SECS;

    // Public keys (64 bytes hex strings) for entity identification
    const ACADEMY_PK = "0x" + "a1".repeat(64);
    const SECOND_ACADEMY_PK = "0x" + "a2".repeat(64);
    const FAKE_ACADEMY_PK = "0x" + "ff".repeat(64);
    const PROFESSOR_PK = "0x" + "b1".repeat(64);
    const OTHER_PROFESSOR_PK = "0x" + "b2".repeat(64);
    const STUDENT_PK = "0x" + "c1".repeat(64);
    const SECOND_STUDENT_PK = "0x" + "c2".repeat(64);
    const OUTSIDE_STUDENT_PK = "0x" + "c3".repeat(64);
    const EMPTY_PK = "0x";


    function defaultIssueArgs(overrides: Partial<{
        title: string;
        code: string;
        credentialType: number;
        description: string;
        payloadHash: string;
        payloadSignature: string;
        encryptedPayload: string;
    }> = {}) {
        const o = {
            title: CRED_TITLE,
            code: CRED_CODE,
            credentialType: CRED_TYPE_DEGREE,
            description: CRED_DESCRIPTION,
            payloadHash: CRED_PAYLOAD_HASH,
            payloadSignature: CRED_PAYLOAD_SIG,
            encryptedPayload: CRED_ENCRYPTED,
            ...overrides,
        };
        return {
            infos: {
                title: o.title,
                code: o.code,
                credentialType: o.credentialType,
                description: o.description,
            },
            payload: {
                payloadHash: o.payloadHash,
                payloadSignature: o.payloadSignature,
                encryptedPayload: o.encryptedPayload,
            },
        };
    }

    async function deployFixture() {
        const { ethers } = await hre.network.connect();
        const [
            owner,
            fakeAcademy,
            academy,
            secondAcademy,
            professor,
            otherProfessor,
            student,
            secondStudent,
            outsideStudent,
        ] = await ethers.getSigners();

        const latestBlock = await ethers.provider.getBlock("latest");
        if (!latestBlock) throw new Error("Failed to fetch latest block");

        const now = latestBlock.timestamp;
        const studentEnrollment = now - 30 * ONE_DAY_SECS;
        const professorHireDate = now - 365 * ONE_DAY_SECS;

        const Credential = await ethers.getContractFactory("Credential");
        const instance = await Credential.deploy();
        await instance.waitForDeployment();

        // Register the primary academy
        await instance.connect(owner).issueAcademyIdentity(ACADEMY_PK, {
            infos: {
                academyId: ACADEMY_ID,
                name: ACADEMY_NAME,
                shortName: ACADEMY_CODE,
                academyType: 0,
            },
            proofs: {
                legalName: ACADEMY_NAME,
                registrationNumber: "REG-CRED-TST",
                taxId: "TAX-CRED-TST",
                billingEmail: "billing@cred-test.edu",
            },
            cert: {
                fingerprint: ACADEMY_FP,
                certificate: "ACADEMY_CERT",
                chain: "ACADEMY_CHAIN",
                notBefore: BigInt(now - ONE_DAY_SECS),
                notAfter: BigInt(now + ONE_YEAR_SECS),
            },
        });

        // Register a professor under the primary academy
        await instance.connect(owner).issueProfessorIdentity(
            PROFESSOR_PK,
            ACADEMY_PK,
            {
                employeeId: PROFESSOR_EMPLOYEE_ID,
                nationalId: PROFESSOR_NATIONAL_ID,
                fullName: PROFESSOR_NAME,
                rank: 1,
                employmentType: 0,
                hireDate: professorHireDate,
            },
        );

        // Register the student under the primary academy
        await instance.connect(owner).issueStudentIdentity(
            STUDENT_PK,
            ACADEMY_PK,
            {
                studentId: STUDENT_ID,
                fullName: STUDENT_NAME,
                nationality: STUDENT_NATIONALITY,
                department: STUDENT_DEPARTMENT,
                country: STUDENT_COUNTRY,
                nationalId: STUDENT_NATIONAL_ID,
                enrollmentDate: studentEnrollment,
            },
        );

        return {
            instance,
            owner,
            fakeAcademy,
            academy,
            secondAcademy,
            professor,
            otherProfessor,
            student,
            secondStudent,
            outsideStudent,
            now,
            studentEnrollment,
            professorHireDate,
        };
    }

    async function registerSecondAcademy(instance: any, owner: any, publicKey: string, now: number) {
        await instance.connect(owner).issueAcademyIdentity(publicKey, {
            infos: {
                academyId: SECOND_ACADEMY_ID,
                name: SECOND_ACADEMY_NAME,
                shortName: SECOND_ACADEMY_CODE,
                academyType: 0,
            },
            proofs: {
                legalName: SECOND_ACADEMY_NAME,
                registrationNumber: "REG-CRED-SECOND",
                taxId: "TAX-CRED-SECOND",
                billingEmail: "billing@second-cred.edu",
            },
            cert: {
                fingerprint: ACADEMY_FP,
                certificate: "SECOND_CERT",
                chain: "SECOND_CHAIN",
                notBefore: BigInt(now - ONE_DAY_SECS),
                notAfter: BigInt(now + ONE_YEAR_SECS),
            },
        });
    }

    async function deployWithCredentialFixture() {
        const { networkHelpers } = await hre.network.connect();
        const base = await networkHelpers.loadFixture(deployFixture);
        const { instance, owner, academy, student } = base;

        await instance.connect(owner).issueCredential(
            STUDENT_PK,
            ACADEMY_PK,
            ACADEMY_PK,
            defaultIssueArgs(),
        );

        return base;
    }

    describe("issueCredential (academy as issuer)", () => {

        it("Should store all fields correctly after a valid issuance", async () => {
            const { networkHelpers, ethers } = await hre.network.connect();
            const { instance, owner, academy, student } =
                await networkHelpers.loadFixture(deployFixture);

            await instance.connect(owner).issueCredential(
                STUDENT_PK,
                ACADEMY_PK,
                ACADEMY_PK,
                defaultIssueArgs(),
            );

            const record = await instance.credentials(STUDENT_PK, 0);

            expect(record.identity.title).to.equal(CRED_TITLE);
            expect(record.identity.code).to.equal(CRED_CODE);
            expect(record.identity.credentialType).to.equal(CRED_TYPE_DEGREE);
            expect(record.identity.description).to.equal(CRED_DESCRIPTION);
            expect(record.identity.academyName).to.equal(ACADEMY_NAME);

            expect(record.payload.payloadHash).to.equal(CRED_PAYLOAD_HASH);
            expect(record.payload.payloadSignature).to.equal(CRED_PAYLOAD_SIG);
            expect(record.payload.encryptedPayload).to.equal(CRED_ENCRYPTED);

            expect(record.status.isNotRevoked).to.equal(true);
            expect(record.status.issuedAt).to.be.gt(0);
            expect(record.status.revokedAt).to.equal(0);
            expect(record.status.academy).to.equal(ACADEMY_PK);
            expect(record.status.issuer).to.equal(ACADEMY_PK);
            expect(record.status.revoker).to.equal("0x");
            expect(record.status.revocationReason).to.equal("");
        });

        it("Should populate academyName from the on-chain academy registry", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, student } =
                await networkHelpers.loadFixture(deployFixture);

            await instance.connect(owner).issueCredential(
                STUDENT_PK,
                ACADEMY_PK,
                ACADEMY_PK,
                defaultIssueArgs(),
            );

            const record = await instance.credentials(STUDENT_PK, 0);
            expect(record.identity.academyName).to.equal(ACADEMY_NAME);
        });

        it("Should increment getCredentialCount and append to the array on subsequent issues", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, student } =
                await networkHelpers.loadFixture(deployFixture);

            expect(await instance.getCredentialCount(STUDENT_PK)).to.equal(0);

            await instance.connect(owner).issueCredential(
                STUDENT_PK,
                ACADEMY_PK,
                ACADEMY_PK,
                defaultIssueArgs(),
            );
            expect(await instance.getCredentialCount(STUDENT_PK)).to.equal(1);

            await instance.connect(owner).issueCredential(
                STUDENT_PK,
                ACADEMY_PK,
                ACADEMY_PK,
                defaultIssueArgs({
                    payloadHash:
                        "0x3333333333333333333333333333333333333333333333333333333333333333",
                    title: "Master of Computer Science",
                    code: "MSC-CS-2026",
                }),
            );
            expect(await instance.getCredentialCount(STUDENT_PK)).to.equal(2);

            const second = await instance.credentials(STUDENT_PK, 1);
            expect(second.identity.title).to.equal("Master of Computer Science");
            expect(second.identity.code).to.equal("MSC-CS-2026");
        });

        it("Should emit CredentialIssued with the correct args", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, student } =
                await networkHelpers.loadFixture(deployFixture);

            await expect(
                instance.connect(owner).issueCredential(
                    STUDENT_PK,
                    ACADEMY_PK,
                    ACADEMY_PK,
                    defaultIssueArgs(),
                ),
            )
                .to.emit(instance, "CredentialIssued")
                .withArgs(
                    STUDENT_PK,
                    ACADEMY_PK,
                    CRED_PAYLOAD_HASH,
                    0n,
                    (ts: bigint) => ts > 0n,
                );
        });

        it("Should revert when called by a non-owner account", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, academy, student } =
                await networkHelpers.loadFixture(deployFixture);

            await expect(
                instance.connect(academy).issueCredential(
                    STUDENT_PK,
                    ACADEMY_PK,
                    ACADEMY_PK,
                    defaultIssueArgs(),
                ),
            ).to.be.revertedWith(
                "Not authorized: Only owner can perform this operation.",
            );
        });

        it("Should revert when the same payloadHash is reused for any student", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, student, secondStudent } =
                await networkHelpers.loadFixture(deployWithCredentialFixture);

            // Register a second student so we can target a different recipient
            await instance.connect(owner).issueStudentIdentity(
                SECOND_STUDENT_PK,
                ACADEMY_PK,
                {
                    studentId: "STD-CRED-002",
                    fullName: "Second Student",
                    nationality: "Turkish",
                    department: STUDENT_DEPARTMENT,
                    country: STUDENT_COUNTRY,
                    nationalId: "NAT-CRED-002",
                    enrollmentDate: Math.floor(Date.now() / 1000) - ONE_DAY_SECS,
                },
            );

            await expect(
                instance.connect(owner).issueCredential(
                    SECOND_STUDENT_PK,
                    ACADEMY_PK,
                    ACADEMY_PK,
                    defaultIssueArgs(), // same payloadHash as in fixture
                ),
            ).to.be.revertedWithCustomError(instance, "CredentialPayloadAlreadyUsed");

            // Sanity: also forbidden to re-issue the same payloadHash to the same student
            await expect(
                instance.connect(owner).issueCredential(
                    STUDENT_PK,
                    ACADEMY_PK,
                    ACADEMY_PK,
                    defaultIssueArgs(),
                ),
            ).to.be.revertedWithCustomError(instance, "CredentialPayloadAlreadyUsed");
        });
    });

    describe("issueCredential (professor as issuer)", () => {

        it("Should issue when issuer is a registered professor of the same academy", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, professor, student } =
                await networkHelpers.loadFixture(deployFixture);

            await instance.connect(owner).issueCredential(
                STUDENT_PK,
                PROFESSOR_PK,
                ACADEMY_PK,
                defaultIssueArgs(),
            );

            const record = await instance.credentials(STUDENT_PK, 0);
            expect(record.status.issuer).to.equal(PROFESSOR_PK);
            expect(record.status.academy).to.equal(ACADEMY_PK);
        });

        it("Should revert when issuer is not a registered professor", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, otherProfessor, student } =
                await networkHelpers.loadFixture(deployFixture);

            await expect(
                instance.connect(owner).issueCredential(
                    STUDENT_PK,
                    OTHER_PROFESSOR_PK,
                    ACADEMY_PK,
                    defaultIssueArgs(),
                ),
            ).to.be.revertedWithCustomError(instance, "ProfessorIdentityNotIssued");
        });

        it("Should revert when the issuing professor has been revoked", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, professor, student } =
                await networkHelpers.loadFixture(deployFixture);

            await instance.connect(owner).revokeProfessorIdentity(PROFESSOR_PK, ACADEMY_PK, "Reason");

            await expect(
                instance.connect(owner).issueCredential(
                    STUDENT_PK,
                    PROFESSOR_PK,
                    ACADEMY_PK,
                    defaultIssueArgs(),
                ),
            ).to.be.revertedWithCustomError(instance, "ProfessorIdentityAlreadyRevoked");
        });

        it("Should revert when the professor belongs to a different academy than the credentialing one", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, secondAcademy, otherProfessor, student, now } =
                await networkHelpers.loadFixture(deployFixture);

            await registerSecondAcademy(instance, owner, SECOND_ACADEMY_PK, now);
            await instance.connect(owner).issueProfessorIdentity(
                OTHER_PROFESSOR_PK,
                SECOND_ACADEMY_PK,
                {
                    employeeId: "EMP_OTHER_001",
                    nationalId: "TR-OTHER-PROF-01",
                    fullName: "Grace Hopper",
                    rank: 1,
                    employmentType: 0,
                    hireDate: now - ONE_DAY_SECS,
                },
            );

            await expect(
                instance.connect(owner).issueCredential(
                    STUDENT_PK,
                    OTHER_PROFESSOR_PK,
                    ACADEMY_PK,
                    defaultIssueArgs(),
                ),
            ).to.be.revertedWith(
                "Invalid credential: professor does not belong to the credentialing academy.",
            );
        });
    });

    describe("issueCredential — academy / student integrity", () => {

        it("Should revert when academy is not registered", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, fakeAcademy, student } =
                await networkHelpers.loadFixture(deployFixture);

            await expect(
                instance.connect(owner).issueCredential(
                    STUDENT_PK,
                    FAKE_ACADEMY_PK,
                    FAKE_ACADEMY_PK,
                    defaultIssueArgs(),
                ),
            ).to.be.revertedWithCustomError(instance, "AcademyIdentityNotIssued");
        });

        it("Should revert when academy has been revoked", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, student } =
                await networkHelpers.loadFixture(deployFixture);

            await instance.connect(owner).revokeAcademyIdentity(ACADEMY_PK, "Reason");

            await expect(
                instance.connect(owner).issueCredential(
                    STUDENT_PK,
                    ACADEMY_PK,
                    ACADEMY_PK,
                    defaultIssueArgs(),
                ),
            ).to.be.revertedWithCustomError(instance, "AcademyIdentityAlreadyRevoked");
        });

        it("Should revert when student is not registered", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, outsideStudent } =
                await networkHelpers.loadFixture(deployFixture);

            await expect(
                instance.connect(owner).issueCredential(
                    OUTSIDE_STUDENT_PK,
                    ACADEMY_PK,
                    ACADEMY_PK,
                    defaultIssueArgs(),
                ),
            ).to.be.revertedWithCustomError(instance, "StudentIdentityNotIssued");
        });

        it("Should revert when student identity has been revoked", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, student } =
                await networkHelpers.loadFixture(deployFixture);

            await instance.connect(owner).revokeStudentIdentity(STUDENT_PK, ACADEMY_PK, "Reason");

            await expect(
                instance.connect(owner).issueCredential(
                    STUDENT_PK,
                    ACADEMY_PK,
                    ACADEMY_PK,
                    defaultIssueArgs(),
                ),
            ).to.be.revertedWithCustomError(instance, "StudentIdentityAlreadyRevoked");
        });

        it("Should revert when student belongs to a different academy than the credentialing one", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, secondAcademy, secondStudent, now } =
                await networkHelpers.loadFixture(deployFixture);

            await registerSecondAcademy(instance, owner, SECOND_ACADEMY_PK, now);
            await instance.connect(owner).issueStudentIdentity(
                SECOND_STUDENT_PK,
                SECOND_ACADEMY_PK,
                {
                    studentId: "STD-CRED-OTHER",
                    fullName: "Outsider Student",
                    nationality: "Turkish",
                    department: STUDENT_DEPARTMENT,
                    country: STUDENT_COUNTRY,
                    nationalId: "NAT-CRED-OTHER",
                    enrollmentDate: now - ONE_DAY_SECS,
                },
            );

            await expect(
                instance.connect(owner).issueCredential(
                    SECOND_STUDENT_PK,
                    ACADEMY_PK,
                    ACADEMY_PK,
                    defaultIssueArgs(),
                ),
            ).to.be.revertedWith(
                "Invalid credential: student does not belong to the credentialing academy.",
            );
        });
    });

    describe("issueCredential — address validation", () => {

        it("Should revert on zero student address", async () => {
            const { networkHelpers, ethers } = await hre.network.connect();
            const { instance, owner, academy } =
                await networkHelpers.loadFixture(deployFixture);

            await expect(
                instance.connect(owner).issueCredential(
                    EMPTY_PK,
                    ACADEMY_PK,
                    ACADEMY_PK,
                    defaultIssueArgs(),
                ),
            )
                .to.be.revertedWithCustomError(instance, "InvalidPublicKey")
                .withArgs("Public key must be 64 bytes.");
        });

        it("Should revert on zero issuer address", async () => {
            const { networkHelpers, ethers } = await hre.network.connect();
            const { instance, owner, academy, student } =
                await networkHelpers.loadFixture(deployFixture);

            await expect(
                instance.connect(owner).issueCredential(
                    STUDENT_PK,
                    EMPTY_PK,
                    ACADEMY_PK,
                    defaultIssueArgs(),
                ),
            )
                .to.be.revertedWithCustomError(instance, "InvalidPublicKey")
                .withArgs("Public key must be 64 bytes.");
        });

        it("Should revert on zero academy address", async () => {
            const { networkHelpers, ethers } = await hre.network.connect();
            const { instance, owner, academy, student } =
                await networkHelpers.loadFixture(deployFixture);

            await expect(
                instance.connect(owner).issueCredential(
                    STUDENT_PK,
                    ACADEMY_PK,
                    EMPTY_PK,
                    defaultIssueArgs(),
                ),
            )
                .to.be.revertedWithCustomError(instance, "InvalidPublicKey")
                .withArgs("Public key must be 64 bytes.");
        });
    });

    describe("issueCredential — infos validation", () => {

        it("Should revert on title shorter than minimum length (< 3 chars)", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, student } =
                await networkHelpers.loadFixture(deployFixture);

            await expect(
                instance.connect(owner).issueCredential(
                    STUDENT_PK,
                    ACADEMY_PK,
                    ACADEMY_PK,
                    defaultIssueArgs({ title: "AB" }),
                ),
            ).to.be.revertedWith("Invalid credential: title is too short.");
        });

        it("Should revert on title exceeding maximum length (> 256 chars)", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, student } =
                await networkHelpers.loadFixture(deployFixture);

            await expect(
                instance.connect(owner).issueCredential(
                    STUDENT_PK,
                    ACADEMY_PK,
                    ACADEMY_PK,
                    defaultIssueArgs({ title: "T".repeat(257) }),
                ),
            ).to.be.revertedWith("Invalid credential: title is too long.");
        });

        it("Should revert on empty code", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, student } =
                await networkHelpers.loadFixture(deployFixture);

            await expect(
                instance.connect(owner).issueCredential(
                    STUDENT_PK,
                    ACADEMY_PK,
                    ACADEMY_PK,
                    defaultIssueArgs({ code: "" }),
                ),
            ).to.be.revertedWith("Invalid credential: code is required.");
        });

        it("Should revert on code exceeding maximum length (> 256 chars)", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, student } =
                await networkHelpers.loadFixture(deployFixture);

            await expect(
                instance.connect(owner).issueCredential(
                    STUDENT_PK,
                    ACADEMY_PK,
                    ACADEMY_PK,
                    defaultIssueArgs({ code: "C".repeat(257) }),
                ),
            ).to.be.revertedWith("Invalid credential: code is too long.");
        });

        it("Should accept an empty description", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, student } =
                await networkHelpers.loadFixture(deployFixture);

            await instance.connect(owner).issueCredential(
                STUDENT_PK,
                ACADEMY_PK,
                ACADEMY_PK,
                defaultIssueArgs({ description: "" }),
            );

            const record = await instance.credentials(STUDENT_PK, 0);
            expect(record.identity.description).to.equal("");
        });

        it("Should revert on description exceeding maximum length (> 1024 chars)", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, student } =
                await networkHelpers.loadFixture(deployFixture);

            await expect(
                instance.connect(owner).issueCredential(
                    STUDENT_PK,
                    ACADEMY_PK,
                    ACADEMY_PK,
                    defaultIssueArgs({ description: "D".repeat(1025) }),
                ),
            ).to.be.revertedWith("Invalid credential: description is too long.");
        });

        it("Should revert on credentialType out of range", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, student } =
                await networkHelpers.loadFixture(deployFixture);

            await expect(
                instance.connect(owner).issueCredential(
                    STUDENT_PK,
                    ACADEMY_PK,
                    ACADEMY_PK,
                    defaultIssueArgs({ credentialType: 99 }),
                ),
            ).to.be.revertedWithCustomError(instance, "InvalidCredentialType");
        });

        it("Should accept every valid credentialType (0..5)", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, student } =
                await networkHelpers.loadFixture(deployFixture);

            for (let t = 0; t <= 5; t++) {
                await instance.connect(owner).issueCredential(
                    STUDENT_PK,
                    ACADEMY_PK,
                    ACADEMY_PK,
                    defaultIssueArgs({
                        credentialType: t,
                        payloadHash:
                            "0x" + (t + 1).toString().padStart(64, "0"),
                    }),
                );
            }

            expect(await instance.getCredentialCount(STUDENT_PK)).to.equal(6);

            for (let t = 0; t <= 5; t++) {
                const record = await instance.credentials(STUDENT_PK, t);
                expect(record.identity.credentialType).to.equal(t);
            }
        });
    });

    describe("issueCredential — payload validation", () => {

        it("Should revert on zero payloadHash", async () => {
            const { networkHelpers, ethers } = await hre.network.connect();
            const { instance, owner, academy, student } =
                await networkHelpers.loadFixture(deployFixture);

            await expect(
                instance.connect(owner).issueCredential(
                    STUDENT_PK,
                    ACADEMY_PK,
                    ACADEMY_PK,
                    defaultIssueArgs({ payloadHash: ethers.ZeroHash }),
                ),
            ).to.be.revertedWithCustomError(instance, "InvalidPayloadHash");
        });

        it("Should revert on zero payloadSignature", async () => {
            const { networkHelpers, ethers } = await hre.network.connect();
            const { instance, owner, academy, student } =
                await networkHelpers.loadFixture(deployFixture);

            await expect(
                instance.connect(owner).issueCredential(
                    STUDENT_PK,
                    ACADEMY_PK,
                    ACADEMY_PK,
                    defaultIssueArgs({ payloadSignature: ethers.ZeroHash }),
                ),
            ).to.be.revertedWithCustomError(instance, "InvalidPayloadSignature");
        });

        it("Should revert on empty encryptedPayload", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, student } =
                await networkHelpers.loadFixture(deployFixture);

            await expect(
                instance.connect(owner).issueCredential(
                    STUDENT_PK,
                    ACADEMY_PK,
                    ACADEMY_PK,
                    defaultIssueArgs({ encryptedPayload: "" }),
                ),
            ).to.be.revertedWithCustomError(instance, "InvalidEncryptedPayload");
        });
    });

    describe("revokeCredential", () => {

        it("Should flip status fields and set revoker, revokedAt and revocationReason", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, student } =
                await networkHelpers.loadFixture(deployWithCredentialFixture);

            await instance.connect(owner).revokeCredential(
                STUDENT_PK,
                0,
                ACADEMY_PK,
                "Academic misconduct",
            );

            const record = await instance.credentials(STUDENT_PK, 0);
            expect(record.status.isNotRevoked).to.equal(false);
            expect(record.status.revokedAt).to.be.gt(0);
            expect(record.status.revoker).to.equal(ACADEMY_PK);
            expect(record.status.revocationReason).to.equal("Academic misconduct");
            // Issuance metadata must remain intact
            expect(record.status.academy).to.equal(ACADEMY_PK);
            expect(record.status.issuer).to.equal(ACADEMY_PK);
            expect(record.status.issuedAt).to.be.gt(0);
        });

        it("Should emit CredentialRevoked with the correct args", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, student } =
                await networkHelpers.loadFixture(deployWithCredentialFixture);

            await expect(
                instance.connect(owner).revokeCredential(
                    STUDENT_PK,
                    0,
                    ACADEMY_PK,
                    "Reason",
                ),
            )
                .to.emit(instance, "CredentialRevoked")
                .withArgs(
                    STUDENT_PK,
                    ACADEMY_PK,
                    0n,
                    (ts: bigint) => ts > 0n,
                );
        });

        it("Should revert when called by a non-owner account", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, academy, student } =
                await networkHelpers.loadFixture(deployWithCredentialFixture);

            await expect(
                instance.connect(academy).revokeCredential(
                    STUDENT_PK,
                    0,
                    ACADEMY_PK,
                    "Reason",
                ),
            ).to.be.revertedWith(
                "Not authorized: Only owner can perform this operation.",
            );
        });

        it("Should revert when _revokerPublicKey is not a registered academy", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, fakeAcademy, student } =
                await networkHelpers.loadFixture(deployWithCredentialFixture);

            await expect(
                instance.connect(owner).revokeCredential(
                    STUDENT_PK,
                    0,
                    FAKE_ACADEMY_PK,
                    "Reason",
                ),
            ).to.be.revertedWith(
                "Not authorized: Only a registered academy can perform this operation.",
            );
        });

        it("Should revert when _revokerPublicKey is a different registered academy", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, secondAcademy, student, now } =
                await networkHelpers.loadFixture(deployWithCredentialFixture);

            await registerSecondAcademy(instance, owner, SECOND_ACADEMY_PK, now);

            await expect(
                instance.connect(owner).revokeCredential(
                    STUDENT_PK,
                    0,
                    SECOND_ACADEMY_PK,
                    "Reason",
                ),
            ).to.be.revertedWith("Invalid revoker: must be the issuing academy.");
        });

        it("Should revert when the issuing academy has itself been revoked", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, student } =
                await networkHelpers.loadFixture(deployWithCredentialFixture);

            await instance.connect(owner).revokeAcademyIdentity(ACADEMY_PK, "Reason");

            await expect(
                instance.connect(owner).revokeCredential(
                    STUDENT_PK,
                    0,
                    ACADEMY_PK,
                    "Reason",
                ),
            ).to.be.revertedWith(
                "Not authorized: Only a registered academy can perform this operation.",
            );
        });

        it("Should revert on zero student public key", async () => {
            const { networkHelpers, ethers } = await hre.network.connect();
            const { instance, owner, academy } =
                await networkHelpers.loadFixture(deployWithCredentialFixture);

            await expect(
                instance.connect(owner).revokeCredential(
                    EMPTY_PK,
                    0,
                    ACADEMY_PK,
                    "Reason",
                ),
            )
                .to.be.revertedWithCustomError(instance, "InvalidPublicKey")
                .withArgs("Public key must be 64 bytes.");
        });

        it("Should revert when the index is out of range", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, student } =
                await networkHelpers.loadFixture(deployWithCredentialFixture);

            await expect(
                instance.connect(owner).revokeCredential(
                    STUDENT_PK,
                    5,
                    ACADEMY_PK,
                    "Reason",
                ),
            ).to.be.revertedWithCustomError(instance, "CredentialIndexOutOfRange");
        });

        it("Should revert when the student has no credentials at all", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, secondStudent, now } =
                await networkHelpers.loadFixture(deployFixture);

            // secondStudent is a signer but has no credentials issued
            await instance.connect(owner).issueStudentIdentity(
                SECOND_STUDENT_PK,
                ACADEMY_PK,
                {
                    studentId: "STD-CRED-NONE",
                    fullName: "No Cred Student",
                    nationality: "Turkish",
                    department: STUDENT_DEPARTMENT,
                    country: STUDENT_COUNTRY,
                    nationalId: "NAT-CRED-NONE",
                    enrollmentDate: now - ONE_DAY_SECS,
                },
            );

            await expect(
                instance.connect(owner).revokeCredential(
                    SECOND_STUDENT_PK,
                    0,
                    ACADEMY_PK,
                    "Reason",
                ),
            ).to.be.revertedWithCustomError(instance, "CredentialIndexOutOfRange");
        });

        it("Should revert when called twice on the same credential", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, student } =
                await networkHelpers.loadFixture(deployWithCredentialFixture);

            await instance.connect(owner).revokeCredential(
                STUDENT_PK,
                0,
                ACADEMY_PK,
                "Reason",
            );

            await expect(
                instance.connect(owner).revokeCredential(
                    STUDENT_PK,
                    0,
                    ACADEMY_PK,
                    "Reason again",
                ),
            ).to.be.revertedWithCustomError(instance, "CredentialAlreadyRevoked");
        });

        it("Should only revoke the targeted credential and leave siblings intact", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, student } =
                await networkHelpers.loadFixture(deployWithCredentialFixture);

            // Issue a second credential
            await instance.connect(owner).issueCredential(
                STUDENT_PK,
                ACADEMY_PK,
                ACADEMY_PK,
                defaultIssueArgs({
                    payloadHash:
                        "0x4444444444444444444444444444444444444444444444444444444444444444",
                    title: "Master Degree",
                    code: "MSC-CS-2026",
                }),
            );

            await instance.connect(owner).revokeCredential(
                STUDENT_PK,
                0,
                ACADEMY_PK,
                "Reason",
            );

            const first  = await instance.credentials(STUDENT_PK, 0);
            const second = await instance.credentials(STUDENT_PK, 1);

            expect(first.status.isNotRevoked).to.equal(false);
            expect(second.status.isNotRevoked).to.equal(true);
            expect(second.status.revokedAt).to.equal(0);
        });
    });

    describe("getCredentialCount", () => {

        it("Should return 0 for a student with no credentials", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, student } =
                await networkHelpers.loadFixture(deployFixture);

            expect(await instance.getCredentialCount(STUDENT_PK)).to.equal(0);
        });

        it("Should return 0 for an unknown public key", async () => {
            const { networkHelpers, ethers } = await hre.network.connect();
            const { instance } = await networkHelpers.loadFixture(deployFixture);

            const unknown = "0x" + "de".repeat(64);
            expect(await instance.getCredentialCount(unknown)).to.equal(0);
        });
    });

    describe("getCredential", () => {

        it("Should return the full credential record at the given index", async () => {
            const { networkHelpers, ethers } = await hre.network.connect();
            const { instance, academy, student } =
                await networkHelpers.loadFixture(deployWithCredentialFixture);

            const record = await instance.getCredential(STUDENT_PK, 0);

            expect(record.identity.title).to.equal(CRED_TITLE);
            expect(record.identity.code).to.equal(CRED_CODE);
            expect(record.identity.credentialType).to.equal(CRED_TYPE_DEGREE);
            expect(record.identity.description).to.equal(CRED_DESCRIPTION);
            expect(record.identity.academyName).to.equal(ACADEMY_NAME);

            expect(record.payload.payloadHash).to.equal(CRED_PAYLOAD_HASH);
            expect(record.payload.payloadSignature).to.equal(CRED_PAYLOAD_SIG);
            expect(record.payload.encryptedPayload).to.equal(CRED_ENCRYPTED);

            expect(record.status.isNotRevoked).to.equal(true);
            expect(record.status.issuedAt).to.be.gt(0);
            expect(record.status.revokedAt).to.equal(0);
            expect(record.status.academy).to.equal(ACADEMY_PK);
            expect(record.status.issuer).to.equal(ACADEMY_PK);
            expect(record.status.revoker).to.equal("0x");
            expect(record.status.revocationReason).to.equal("");
        });

        it("Should return matching data for the public credentials() getter", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, student } =
                await networkHelpers.loadFixture(deployWithCredentialFixture);

            const viaGetter = await instance.getCredential(STUDENT_PK, 0);
            const viaMapping = await instance.credentials(STUDENT_PK, 0);

            expect(viaGetter.identity.title).to.equal(viaMapping.identity.title);
            expect(viaGetter.payload.payloadHash).to.equal(viaMapping.payload.payloadHash);
            expect(viaGetter.status.issuedAt).to.equal(viaMapping.status.issuedAt);
            expect(viaGetter.status.issuer).to.equal(viaMapping.status.issuer);
            expect(viaGetter.status.academy).to.equal(viaMapping.status.academy);
        });

        it("Should reflect updates after a revocation", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, student } =
                await networkHelpers.loadFixture(deployWithCredentialFixture);

            await instance.connect(owner).revokeCredential(
                STUDENT_PK,
                0,
                ACADEMY_PK,
                "Academic misconduct",
            );

            const record = await instance.getCredential(STUDENT_PK, 0);
            expect(record.status.isNotRevoked).to.equal(false);
            expect(record.status.revokedAt).to.be.gt(0);
            expect(record.status.revoker).to.equal(ACADEMY_PK);
            expect(record.status.revocationReason).to.equal("Academic misconduct");
        });

        it("Should return the correct record when the student has multiple credentials", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, student } =
                await networkHelpers.loadFixture(deployWithCredentialFixture);

            await instance.connect(owner).issueCredential(
                STUDENT_PK,
                ACADEMY_PK,
                ACADEMY_PK,
                defaultIssueArgs({
                    payloadHash:
                        "0x5555555555555555555555555555555555555555555555555555555555555555",
                    title: "Master Degree",
                    code: "MSC-CS-2026",
                    credentialType: 4, // certificate
                }),
            );

            const first  = await instance.getCredential(STUDENT_PK, 0);
            const second = await instance.getCredential(STUDENT_PK, 1);

            expect(first.identity.title).to.equal(CRED_TITLE);
            expect(first.identity.credentialType).to.equal(CRED_TYPE_DEGREE);

            expect(second.identity.title).to.equal("Master Degree");
            expect(second.identity.code).to.equal("MSC-CS-2026");
            expect(second.identity.credentialType).to.equal(4);
        });

        it("Should revert on zero student public key", async () => {
            const { networkHelpers, ethers } = await hre.network.connect();
            const { instance } =
                await networkHelpers.loadFixture(deployWithCredentialFixture);

            await expect(
                instance.getCredential(EMPTY_PK, 0),
            )
                .to.be.revertedWithCustomError(instance, "InvalidPublicKey")
                .withArgs("Public key must be 64 bytes.");
        });

        it("Should revert when the index is out of range", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, student } =
                await networkHelpers.loadFixture(deployWithCredentialFixture);

            await expect(
                instance.getCredential(STUDENT_PK, 5),
            ).to.be.revertedWithCustomError(instance, "CredentialIndexOutOfRange");
        });

        it("Should revert when the student has no credentials", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, student } =
                await networkHelpers.loadFixture(deployFixture);

            await expect(
                instance.getCredential(STUDENT_PK, 0),
            ).to.be.revertedWithCustomError(instance, "CredentialIndexOutOfRange");
        });

        it("Should be callable by any account (no authorization required)", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, fakeAcademy, student } =
                await networkHelpers.loadFixture(deployWithCredentialFixture);

            // A non-owner, non-academy account should still be able to read
            const record = await instance.connect(fakeAcademy).getCredential(STUDENT_PK, 0);
            expect(record.identity.title).to.equal(CRED_TITLE);
        });
    });
});
