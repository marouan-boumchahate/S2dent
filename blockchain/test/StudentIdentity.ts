import { expect } from "chai";
import hre from "hardhat";

describe("StudentIdentity", () => {

    // ─── Academy details ──────────────────────────────────────────────────────
    const ACADEMY_ID      = "ACADEMY001";
    const ACADEMY_NAME    = "Fenerbahçe University";
    const ACADEMY_CODE    = "FBU";
    const ACADEMY_COUNTRY = "Turkey";
    const ACADEMY_FP      = "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";

    // ─── Student details ──────────────────────────────────────────────────────
    const STUDENT_ID          = "STD-2067612";
    const STUDENT_NATIONAL_ID = "NAT-2067612";
    const STUDENT_NAME        = "Marouan Boumchahate";
    const STUDENT_NATIONALITY = "Moroccan";
    const STUDENT_DEPARTMENT  = "Computer Science";
    const STUDENT_COUNTRY     = "Turkey";
    const STUDENT_ENROLLMENT_DATE = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60); // 30 days ago

    const ONE_DAY_SECS  = 86_400;
    const ONE_YEAR_SECS = 365 * ONE_DAY_SECS;

    // Public keys (64 bytes hex strings) for entity identification
    const ACADEMY_PK = "0x" + "a1".repeat(64);
    const SECOND_ACADEMY_PK = "0x" + "a2".repeat(64);
    const FAKE_ACADEMY_PK = "0x" + "ff".repeat(64);
    const STUDENT_PK = "0x" + "c1".repeat(64);
    const SECOND_STUDENT_PK = "0x" + "c2".repeat(64);
    const EMPTY_PK = "0x";


    async function deployFixture() {
        const { ethers } = await hre.network.connect();
        const [owner, fakeAcademy, academy, student, secondStudent] =
            await ethers.getSigners();

        const latestBlock = await ethers.provider.getBlock("latest");
        if (!latestBlock) throw new Error("Failed to fetch latest block");

        const now = latestBlock.timestamp;

        const StudentIdentity = await ethers.getContractFactory("StudentIdentity");
        const instance = await StudentIdentity.deploy();
        await instance.waitForDeployment();

        await instance.issueAcademyIdentity(ACADEMY_PK, {
            infos: {
                academyId: ACADEMY_ID,
                name: ACADEMY_NAME,
                shortName: ACADEMY_CODE,
                academyType: 0,
            },
            proofs: {
                legalName: ACADEMY_NAME,
                registrationNumber: "REG-STUDENT-TST",
                taxId: "TAX-STUDENT-TST",
                billingEmail: "billing@student-test.edu",
            },
            cert: {
                fingerprint: ACADEMY_FP,
                certificate: "ACADEMY_CERT",
                chain: "ACADEMY_CHAIN",
                notBefore: BigInt(now - ONE_DAY_SECS),
                notAfter: BigInt(now + ONE_YEAR_SECS),
            },
        });

        return {
            instance,
            owner,
            fakeAcademy,
            academy,
            student,
            secondStudent,
            now,
        };
    }

    async function deployWithStudentFixture() {
        const { networkHelpers } = await hre.network.connect();
        const base = await networkHelpers.loadFixture(deployFixture);
        const { instance, owner, academy, student } = base;

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
                enrollmentDate: STUDENT_ENROLLMENT_DATE,
            }
        );

        return base;
    }


    describe("issueStudentIdentity", () => {

        it("Should store all fields correctly after a valid issuance", async () => {
            const { networkHelpers, ethers } = await hre.network.connect();
            const { instance, owner, academy, student } =
                await networkHelpers.loadFixture(deployFixture);

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
                    enrollmentDate: STUDENT_ENROLLMENT_DATE,
                }
            );

            const record = await instance.students(STUDENT_PK);

            expect(record.identity.fullName).to.equal(STUDENT_NAME);
            expect(record.identity.nationality).to.equal(STUDENT_NATIONALITY);
            expect(record.identity.academyName).to.equal(ACADEMY_NAME);
            expect(record.identity.department).to.equal(STUDENT_DEPARTMENT);
            expect(record.identity.country).to.equal(STUDENT_COUNTRY);

            expect(record.status.isNotRevoked).to.equal(true);
            expect(record.status.revokedAt).to.equal(0);
            expect(record.status.issuer).to.equal(ACADEMY_PK);
            expect(record.status.issuedAt).to.be.gt(0);
            expect(record.status.revoker).to.equal("0x");
            expect(record.status.revocationReason).to.equal("");
        });

        it("Should store studentIdHash as keccak256 of the provided student ID", async () => {
            const { networkHelpers, ethers } = await hre.network.connect();
            const { instance, owner, academy, student } =
                await networkHelpers.loadFixture(deployFixture);

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
                    enrollmentDate: STUDENT_ENROLLMENT_DATE,
                }
            );

            const record = await instance.students(STUDENT_PK);
            const expectedHash = ethers.keccak256(ethers.toUtf8Bytes(STUDENT_ID));

            expect(record.identity.studentIdHash).to.equal(expectedHash);
        });

        it("Should populate academyName from the on-chain academy registry", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, student } =
                await networkHelpers.loadFixture(deployFixture);

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
                    enrollmentDate: STUDENT_ENROLLMENT_DATE,
                }
            );

            const record = await instance.students(STUDENT_PK);
            expect(record.identity.academyName).to.equal(ACADEMY_NAME);
        });

        it("Should revert when called by a non-owner account", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, academy, student } =
                await networkHelpers.loadFixture(deployFixture);

            await expect(
                instance.connect(academy).issueStudentIdentity(
                    STUDENT_PK,
                    ACADEMY_PK,
                    {
                        studentId: STUDENT_ID,
                        fullName: STUDENT_NAME,
                        nationality: STUDENT_NATIONALITY,
                        department: STUDENT_DEPARTMENT,
                        country: STUDENT_COUNTRY,
                        nationalId: STUDENT_NATIONAL_ID,
                        enrollmentDate: STUDENT_ENROLLMENT_DATE,
                    }
                )
            ).to.be.revertedWith(
                "Not authorized: Only owner can perform this operation."
            );
        });

        it("Should revert when called with an unregistered academy address", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, fakeAcademy, student } =
                await networkHelpers.loadFixture(deployFixture);

            await expect(
                instance.connect(owner).issueStudentIdentity(
                    STUDENT_PK,
                    FAKE_ACADEMY_PK,
                    {
                        studentId: STUDENT_ID,
                        fullName: STUDENT_NAME,
                        nationality: STUDENT_NATIONALITY,
                        department: STUDENT_DEPARTMENT,
                        country: STUDENT_COUNTRY,
                        nationalId: STUDENT_NATIONAL_ID,
                        enrollmentDate: STUDENT_ENROLLMENT_DATE,

                    }
                )
            ).to.be.revertedWith(
                "Not authorized: Only a registered academy can perform this operation."
            );
        });

        it("Should revert when re-issuing to the same student address", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, student } =
                await networkHelpers.loadFixture(deployWithStudentFixture);

            await expect(
                instance.connect(owner).issueStudentIdentity(
                    STUDENT_PK,
                    ACADEMY_PK,
                    {
                        studentId: STUDENT_ID,
                        fullName: "Renamed Student",
                        nationality: "German",
                        department: "Mathematics",
                        country: "Germany",
                        nationalId: STUDENT_NATIONAL_ID,
                        enrollmentDate: STUDENT_ENROLLMENT_DATE,
                    }
                )
            ).to.be.revertedWithCustomError(instance, "StudentIdentityAlreadyIssued");
        });

        it("Should revert when studentId is already used in the same academy", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, student, secondStudent } =
                await networkHelpers.loadFixture(deployWithStudentFixture);

            await expect(
                instance.connect(owner).issueStudentIdentity(
                    SECOND_STUDENT_PK,
                    ACADEMY_PK,
                    {
                        studentId: STUDENT_ID,
                        fullName: "Second Student",
                        nationality: "Canadian",
                        department: "Physics",
                        country: "Canada",
                        nationalId: "NAT-2067612",
                        enrollmentDate: STUDENT_ENROLLMENT_DATE,
                    }
                )
            ).to.be.revertedWithCustomError(instance, "StudentIdAlreadyUsed");
        });

        it("Should revert when nationalId is already used", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, student, secondStudent } =
                await networkHelpers.loadFixture(deployWithStudentFixture);

            await expect(
                instance.connect(owner).issueStudentIdentity(
                    SECOND_STUDENT_PK,
                    ACADEMY_PK,
                    {
                        studentId: "STD-2067613",
                        fullName: "Second Student",
                        nationality: "Canadian",
                        department: "Physics",
                        country: "Canada",
                        nationalId: STUDENT_NATIONAL_ID,
                        enrollmentDate: STUDENT_ENROLLMENT_DATE,
                    }
                )
            ).to.be.revertedWithCustomError(instance, "StudentNationalIdAlreadyUsed");
        });
    });

    describe("Input validation", () => {

        it("Should revert on zero student public key", async () => {
            const { networkHelpers, ethers } = await hre.network.connect();
            const { instance, owner, academy } =
                await networkHelpers.loadFixture(deployFixture);

            await expect(
                instance.connect(owner).issueStudentIdentity(
                    EMPTY_PK,
                    ACADEMY_PK,
                    {
                        studentId: STUDENT_ID,
                        fullName: STUDENT_NAME,
                        nationality: STUDENT_NATIONALITY,
                        department: STUDENT_DEPARTMENT,
                        country: STUDENT_COUNTRY,
                        nationalId: STUDENT_NATIONAL_ID,
                        enrollmentDate: STUDENT_ENROLLMENT_DATE,
                    }
                )
            ).to.be.revertedWithCustomError(instance, "InvalidPublicKey").withArgs("Public key must be 64 bytes.");
        });

        it("Should revert on empty student ID", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, student } =
                await networkHelpers.loadFixture(deployFixture);

            await expect(
                instance.connect(owner).issueStudentIdentity(
                    STUDENT_PK,
                    ACADEMY_PK,
                    {
                        studentId: "",
                        fullName: STUDENT_NAME,
                        nationality: STUDENT_NATIONALITY,
                        department: STUDENT_DEPARTMENT,
                        country: STUDENT_COUNTRY,
                        nationalId: STUDENT_NATIONAL_ID,
                        enrollmentDate: STUDENT_ENROLLMENT_DATE,
                    }
                )
            ).to.be.revertedWith("Invalid student: studentId is too short.");
        });

        it("Should revert on student ID shorter than minimum length (< 3 chars)", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, student } =
                await networkHelpers.loadFixture(deployFixture);

            await expect(
                instance.connect(owner).issueStudentIdentity(
                    STUDENT_PK,
                    ACADEMY_PK,
                    {
                        studentId: "AB",
                        fullName: STUDENT_NAME,
                        nationality: STUDENT_NATIONALITY,
                        department: STUDENT_DEPARTMENT,
                        country: STUDENT_COUNTRY,
                        nationalId: STUDENT_NATIONAL_ID,
                        enrollmentDate: STUDENT_ENROLLMENT_DATE,
                    }
                )
            ).to.be.revertedWith("Invalid student: studentId is too short.");
        });

        it("Should revert on student ID longer than maximum length (> 20 chars)", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, student } =
                await networkHelpers.loadFixture(deployFixture);

            await expect(
                instance.connect(owner).issueStudentIdentity(
                    STUDENT_PK,
                    ACADEMY_PK,
                    {
                        studentId: "STU_ID_THAT_IS_TOO_LONG_456",
                        fullName: STUDENT_NAME,
                        nationality: STUDENT_NATIONALITY,
                        department: STUDENT_DEPARTMENT,
                        country: STUDENT_COUNTRY,
                        nationalId: STUDENT_NATIONAL_ID,
                        enrollmentDate: STUDENT_ENROLLMENT_DATE,
                    }
                )
            ).to.be.revertedWith("Invalid student: studentId is too long.");
        });

        it("Should revert on empty name", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, student } =
                await networkHelpers.loadFixture(deployFixture);

            await expect(
                instance.connect(owner).issueStudentIdentity(
                    STUDENT_PK,
                    ACADEMY_PK,
                    {
                        studentId: STUDENT_ID,
                        fullName: "",
                        nationality: STUDENT_NATIONALITY,
                        department: STUDENT_DEPARTMENT,
                        country: STUDENT_COUNTRY,
                        nationalId: STUDENT_NATIONAL_ID,
                        enrollmentDate: STUDENT_ENROLLMENT_DATE,
                    }
                )
            ).to.be.revertedWith("Invalid student: fullName is required.");
        });

        it("Should revert on name exceeding maximum length (> 256 chars)", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, student } =
                await networkHelpers.loadFixture(deployFixture);

            const tooLongName = "A".repeat(257);   // MAX_STRING_LENGTH is 256

            await expect(
                instance.connect(owner).issueStudentIdentity(
                    STUDENT_PK,
                    ACADEMY_PK,
                    {
                        studentId: STUDENT_ID,
                        fullName: tooLongName,
                        nationality: STUDENT_NATIONALITY,
                        department: STUDENT_DEPARTMENT,
                        country: STUDENT_COUNTRY,
                        nationalId: STUDENT_NATIONAL_ID,
                        enrollmentDate: STUDENT_ENROLLMENT_DATE,
                    }
                )
            ).to.be.revertedWith("Invalid student: fullName is too long.");
        });

        it("Should revert on empty nationality", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, student } =
                await networkHelpers.loadFixture(deployFixture);

            await expect(
                instance.connect(owner).issueStudentIdentity(
                    STUDENT_PK,
                    ACADEMY_PK,
                    {
                        studentId: STUDENT_ID,
                        fullName: STUDENT_NAME,
                        nationality: "",
                        department: STUDENT_DEPARTMENT,
                        country: STUDENT_COUNTRY,
                        nationalId: STUDENT_NATIONAL_ID,
                        enrollmentDate: STUDENT_ENROLLMENT_DATE,
                    }
                )
            ).to.be.revertedWith("Invalid student: nationality is too short.");
        });

        it("Should revert on nationality shorter than minimum length (< 3 chars)", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, student } =
                await networkHelpers.loadFixture(deployFixture);

            await expect(
                instance.connect(owner).issueStudentIdentity(
                    STUDENT_PK,
                    ACADEMY_PK,
                    {
                        studentId: STUDENT_ID,
                        fullName: STUDENT_NAME,
                        nationality: "US",
                        department: STUDENT_DEPARTMENT,
                        country: STUDENT_COUNTRY,
                        nationalId: STUDENT_NATIONAL_ID,
                        enrollmentDate: STUDENT_ENROLLMENT_DATE,
                    }
                )
            ).to.be.revertedWith("Invalid student: nationality is too short.");
        });

        it("Should revert on nationality exceeding maximum length (> 256 chars)", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, student } =
                await networkHelpers.loadFixture(deployFixture);

            const tooLongNationality = "N".repeat(257);

            await expect(
                instance.connect(owner).issueStudentIdentity(
                    STUDENT_PK,
                    ACADEMY_PK,
                    {
                        studentId: STUDENT_ID,
                        fullName: STUDENT_NAME,
                        nationality: tooLongNationality,
                        department: STUDENT_DEPARTMENT,
                        country: STUDENT_COUNTRY,
                        nationalId: STUDENT_NATIONAL_ID,
                        enrollmentDate: STUDENT_ENROLLMENT_DATE,
                    }
                )
            ).to.be.revertedWith("Invalid student: nationality is too long.");
        });

        it("Should revert on empty department", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, student } =
                await networkHelpers.loadFixture(deployFixture);

            await expect(
                instance.connect(owner).issueStudentIdentity(
                    STUDENT_PK,
                    ACADEMY_PK,
                    {
                        studentId: STUDENT_ID,
                        fullName: STUDENT_NAME,
                        nationality: STUDENT_NATIONALITY,
                        department: "",
                        country: STUDENT_COUNTRY,
                        nationalId: STUDENT_NATIONAL_ID,
                        enrollmentDate: STUDENT_ENROLLMENT_DATE,
                    }
                )
            ).to.be.revertedWith("Invalid student: department is required.");
        });

        it("Should revert on department exceeding maximum length (> 256 chars)", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, student } =
                await networkHelpers.loadFixture(deployFixture);

            const tooLongDept = "D".repeat(257);

            await expect(
                instance.connect(owner).issueStudentIdentity(
                    STUDENT_PK,
                    ACADEMY_PK,
                    {
                        studentId: STUDENT_ID,
                        fullName: STUDENT_NAME,
                        nationality: STUDENT_NATIONALITY,
                        department: tooLongDept,
                        country: STUDENT_COUNTRY,
                        nationalId: STUDENT_NATIONAL_ID,
                        enrollmentDate: STUDENT_ENROLLMENT_DATE,
                    }
                )
            ).to.be.revertedWith("Invalid student: department is too long.");
        });

        it("Should revert on empty country", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, student } =
                await networkHelpers.loadFixture(deployFixture);

            await expect(
                instance.connect(owner).issueStudentIdentity(
                    STUDENT_PK,
                    ACADEMY_PK,
                    {
                        studentId: STUDENT_ID,
                        fullName: STUDENT_NAME,
                        nationality: STUDENT_NATIONALITY,
                        department: STUDENT_DEPARTMENT,
                        country: "",
                        nationalId: STUDENT_NATIONAL_ID,
                        enrollmentDate: STUDENT_ENROLLMENT_DATE,
                    }
                )
            ).to.be.revertedWith("Invalid student: country is required.");
        });

        it("Should revert on country exceeding maximum length (> 256 chars)", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, student } =
                await networkHelpers.loadFixture(deployFixture);

            const tooLongCountry = "C".repeat(257);

            await expect(
                instance.connect(owner).issueStudentIdentity(
                    STUDENT_PK,
                    ACADEMY_PK,
                    {
                        studentId: STUDENT_ID,
                        fullName: STUDENT_NAME,
                        nationality: STUDENT_NATIONALITY,
                        department: STUDENT_DEPARTMENT,
                        country: tooLongCountry,
                        nationalId: STUDENT_NATIONAL_ID,
                        enrollmentDate: STUDENT_ENROLLMENT_DATE,
                    }
                )
            ).to.be.revertedWith("Invalid student: country is too long.");
        });

        it("Should revert on enrollment date in the future", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, student, now } =
                await networkHelpers.loadFixture(deployFixture);

            const futureEnrollmentDate = now + ONE_DAY_SECS;

            await expect(
                instance.connect(owner).issueStudentIdentity(
                    STUDENT_PK,
                    ACADEMY_PK,
                    {
                        studentId: STUDENT_ID,
                        fullName: STUDENT_NAME,
                        nationality: STUDENT_NATIONALITY,
                        department: STUDENT_DEPARTMENT,
                        country: STUDENT_COUNTRY,
                        nationalId: STUDENT_NATIONAL_ID,
                        enrollmentDate: futureEnrollmentDate,
                    }
                )
            ).to.be.revertedWith("Invalid student: enrollmentDate cannot be in the future.");
        });

    });

    describe("revokeStudentIdentity", () => {
        async function issueSecondAcademy(instance: any, owner: any, publicKey: string, now: number) {
            await instance.connect(owner).issueAcademyIdentity(publicKey, {
                infos: {
                    academyId: "ACADEMY002",
                    name: "Second University",
                    shortName: "SU",
                    academyType: 0,
                },
                proofs: {
                    legalName: "Second University",
                    registrationNumber: "REG-SECOND-TST",
                    taxId: "TAX-SECOND-TST",
                    billingEmail: "billing@second-test.edu",
                },
                cert: {
                    fingerprint: ACADEMY_FP,
                    certificate: "ACADEMY_CERT_2",
                    chain: "ACADEMY_CHAIN_2",
                    notBefore: BigInt(now - ONE_DAY_SECS),
                    notAfter: BigInt(now + ONE_YEAR_SECS),
                },
            });
        }

        it("Should flip status fields and set revoker to the issuing academy", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, student } =
                await networkHelpers.loadFixture(deployWithStudentFixture);

            await instance.connect(owner).revokeStudentIdentity(STUDENT_PK, ACADEMY_PK, "Reason");

            const record = await instance.students(STUDENT_PK);
            expect(record.status.isNotRevoked).to.equal(false);
            expect(record.status.revokedAt).to.be.gt(0);
            expect(record.status.revoker).to.equal(ACADEMY_PK);
            expect(record.status.issuer).to.equal(ACADEMY_PK);
            expect(record.status.issuedAt).to.be.gt(0);
            expect(record.status.revocationReason).to.equal("Reason");
        });

        it("Should revert when called by a non-owner account", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, academy, student } =
                await networkHelpers.loadFixture(deployWithStudentFixture);

            await expect(
                instance.connect(academy).revokeStudentIdentity(STUDENT_PK, ACADEMY_PK, "Reason")
            ).to.be.revertedWith("Not authorized: Only owner can perform this operation.");
        });

        it("Should revert when _revokerPublicKey is not a registered academy", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, fakeAcademy, student } =
                await networkHelpers.loadFixture(deployWithStudentFixture);

            await expect(
                instance.connect(owner).revokeStudentIdentity(STUDENT_PK, FAKE_ACADEMY_PK, "Reason")
            ).to.be.revertedWith("Not authorized: Only a registered academy can perform this operation.");
        });

        it("Should revert when _revokerPublicKey is a different registered academy", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, now } =
                await networkHelpers.loadFixture(deployWithStudentFixture);

            await issueSecondAcademy(instance, owner, SECOND_ACADEMY_PK, now);

            await expect(
                instance.connect(owner).revokeStudentIdentity(STUDENT_PK, SECOND_ACADEMY_PK, "Reason")
            ).to.be.revertedWith("Invalid revoker: must be the issuing academy.");
        });

        it("Should revert when the issuing academy has itself been revoked", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, student } =
                await networkHelpers.loadFixture(deployWithStudentFixture);

            await instance.connect(owner).revokeAcademyIdentity(ACADEMY_PK, "Reason");

            await expect(
                instance.connect(owner).revokeStudentIdentity(STUDENT_PK, ACADEMY_PK, "Reason")
            ).to.be.revertedWith("Not authorized: Only a registered academy can perform this operation.");
        });

        it("Should revert on zero student public key", async () => {
            const { networkHelpers, ethers } = await hre.network.connect();
            const { instance, owner, academy } =
                await networkHelpers.loadFixture(deployWithStudentFixture);

            await expect(
                instance.connect(owner).revokeStudentIdentity(EMPTY_PK, ACADEMY_PK, "Reason")
            )
                .to.be.revertedWithCustomError(instance, "InvalidPublicKey")
                .withArgs("Public key must be 64 bytes.");
        });

        it("Should revert when the student was never issued", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, student } =
                await networkHelpers.loadFixture(deployFixture);

            await expect(
                instance.connect(owner).revokeStudentIdentity(STUDENT_PK, ACADEMY_PK, "Reason")
            ).to.be.revertedWithCustomError(instance, "StudentIdentityNotIssued");
        });

        it("Should revert when called twice on the same student", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, student } =
                await networkHelpers.loadFixture(deployWithStudentFixture);

            await instance.connect(owner).revokeStudentIdentity(STUDENT_PK, ACADEMY_PK, "Reason");

            await expect(
                instance.connect(owner).revokeStudentIdentity(STUDENT_PK, ACADEMY_PK, "Reason")
            ).to.be.revertedWithCustomError(instance, "StudentIdentityAlreadyRevoked");
        });
    });
});