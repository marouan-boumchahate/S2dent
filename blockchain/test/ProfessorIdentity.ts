import { expect } from "chai";
import hre from "hardhat";

describe("ProfessorIdentity", () => {

    // Academy details
    const ACADEMY_ID = "ACADEMY001";
    const ACADEMY_NAME = "Fenerbahçe University";
    const ACADEMY_CODE = "FBU";
    const ACADEMY_COUNTRY = "Turkey";
    const ACADEMY_FP = "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";

    // Professor details
    const PROFESSOR_ID = "PROF001";
    const PROFESSOR_NAME = "Osman SELVI";
    const PROFESSOR_TITLE = "Associate Professor";
    const PROFESSOR_DEPARTMENT = "Computer Science";
    const PROFESSOR_COUNTRY = "Turkey";
    const FINGERPRINT = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

    const ONE_DAY_SECS = 86_400;
    const ONE_YEAR_SECS = 365 * ONE_DAY_SECS;

    async function deployFixture() {
        const { ethers } = await hre.network.connect();
        const [owner, fakeAcademy, academy, professor, secondProfessor] =
            await ethers.getSigners();

        const latestBlock = await ethers.provider.getBlock("latest");
        if (!latestBlock) throw new Error("Failed to fetch latest block");

        const now = latestBlock.timestamp;
        const notBefore = now - ONE_DAY_SECS;
        const notAfter = now + ONE_YEAR_SECS;

        const ProfessorIdentity = await ethers.getContractFactory("ProfessorIdentity");
        const instance = await ProfessorIdentity.deploy();
        await instance.waitForDeployment();

        await instance.issueAcademyIdentity(
            academy.address,
            ACADEMY_ID,
            ACADEMY_NAME,
            ACADEMY_CODE,
            ACADEMY_COUNTRY,
            ACADEMY_FP,
            notBefore,
            notAfter
        );

        return {
            instance,
            owner,
            fakeAcademy,
            academy,
            professor,
            secondProfessor,
            notBefore,
            notAfter,
            now,
        };
    }

    async function deployWithProfessorFixture() {
        const { networkHelpers } = await hre.network.connect();
        const base = await networkHelpers.loadFixture(deployFixture);
        const { instance, owner, academy, professor, notBefore, notAfter } = base;

        await instance.connect(owner).issueProfessorIdentity(
            professor.address,
            academy.address,
            PROFESSOR_ID,
            PROFESSOR_NAME,
            PROFESSOR_TITLE,
            PROFESSOR_DEPARTMENT,
            PROFESSOR_COUNTRY,
            FINGERPRINT,
            notBefore,
            notAfter
        );

        return base;
    }

    describe("issueProfessorIdentity", () => {

        it("Should store all fields correctly after a valid issuance", async () => {
            const { networkHelpers, ethers } = await hre.network.connect();
            const { instance, owner, academy, professor, notBefore, notAfter } =
                await networkHelpers.loadFixture(deployFixture);

            await instance.connect(owner).issueProfessorIdentity(
                professor.address,
                academy.address,
                PROFESSOR_ID,
                PROFESSOR_NAME,
                PROFESSOR_TITLE,
                PROFESSOR_DEPARTMENT,
                PROFESSOR_COUNTRY,
                FINGERPRINT,
                notBefore,
                notAfter
            );

            const record = await instance.professors(professor.address);

            expect(record.name).to.equal(PROFESSOR_NAME);
            expect(record.title).to.equal(PROFESSOR_TITLE);
            expect(record.department).to.equal(PROFESSOR_DEPARTMENT);
            expect(record.country).to.equal(PROFESSOR_COUNTRY);
            expect(record.fingerprint).to.equal(FINGERPRINT);
            expect(record.notBefore).to.equal(notBefore);
            expect(record.notAfter).to.equal(notAfter);

            expect(record.isNotRevoked).to.equal(true);
            expect(record.revokedAt).to.equal(0);
            expect(record.issuedBy).to.equal(academy.address);
            expect(record.issuedAt).to.be.gt(0);
            expect(record.revokedBy).to.equal(ethers.ZeroAddress);
        });

        it("Should store employeeIdHash as keccak256 of the provided professor ID", async () => {
            const { networkHelpers, ethers } = await hre.network.connect();
            const { instance, owner, academy, professor, notBefore, notAfter } =
                await networkHelpers.loadFixture(deployFixture);

            await instance.connect(owner).issueProfessorIdentity(
                professor.address,
                academy.address,
                PROFESSOR_ID,
                PROFESSOR_NAME,
                PROFESSOR_TITLE,
                PROFESSOR_DEPARTMENT,
                PROFESSOR_COUNTRY,
                FINGERPRINT,
                notBefore,
                notAfter
            );

            const record = await instance.professors(professor.address);
            const expectedHash = ethers.keccak256(ethers.toUtf8Bytes(PROFESSOR_ID));

            expect(record.professorIdHash).to.equal(expectedHash);
        });

        it("Should revert when called by an unregistered (non-academy) address", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, fakeAcademy, professor, notBefore, notAfter } =
                await networkHelpers.loadFixture(deployFixture);

            await expect(
                instance.connect(owner).issueProfessorIdentity(
                    professor.address,
                    fakeAcademy.address,
                    PROFESSOR_ID,
                    PROFESSOR_NAME,
                    PROFESSOR_TITLE,
                    PROFESSOR_DEPARTMENT,
                    PROFESSOR_COUNTRY,
                    FINGERPRINT,
                    notBefore,
                    notAfter
                )
            ).to.be.revertedWith(
                "Not authorized: Only a registered academy can perform this operation."
            );
        });

        it("Should revert when called by a non-owner account", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, academy, professor, notBefore, notAfter } =
                await networkHelpers.loadFixture(deployFixture);

            await expect(
                instance.connect(academy).issueProfessorIdentity(
                    professor.address,
                    academy.address,
                    PROFESSOR_ID,
                    PROFESSOR_NAME,
                    PROFESSOR_TITLE,
                    PROFESSOR_DEPARTMENT,
                    PROFESSOR_COUNTRY,
                    FINGERPRINT,
                    notBefore,
                    notAfter
                )
            ).to.be.revertedWith(
                "Not authorized: Only owner can perform this operation."
            );
        });

        it("Should overwrite an existing record on re-issuance by the same academy", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, professor, notBefore, notAfter } =
                await networkHelpers.loadFixture(deployWithProfessorFixture);

            await instance.connect(owner).issueProfessorIdentity(
                professor.address,
                academy.address,
                PROFESSOR_ID,
                "Renamed Professor",
                "Full Professor",
                "Mathematics",
                PROFESSOR_COUNTRY,
                FINGERPRINT,
                notBefore,
                notAfter
            );

            const record = await instance.professors(professor.address);
            expect(record.name).to.equal("Renamed Professor");
            expect(record.title).to.equal("Full Professor");
            expect(record.department).to.equal("Mathematics");
        });
    });

    describe("Input validation", () => {

        it("Should revert on zero professor wallet address", async () => {
            const { networkHelpers, ethers } = await hre.network.connect();
            const { instance, owner, academy, notBefore, notAfter } =
                await networkHelpers.loadFixture(deployFixture);

            await expect(
                instance.connect(owner).issueProfessorIdentity(
                    ethers.ZeroAddress,
                    academy.address,
                    PROFESSOR_ID,
                    PROFESSOR_NAME,
                    PROFESSOR_TITLE,
                    PROFESSOR_DEPARTMENT,
                    PROFESSOR_COUNTRY,
                    FINGERPRINT,
                    notBefore,
                    notAfter
                )
            ).to.be.revertedWithCustomError(instance, "InvalidWalletAddress");
        });

        it("Should revert on empty professor ID", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, professor, notBefore, notAfter } =
                await networkHelpers.loadFixture(deployFixture);

            await expect(
                instance.connect(owner).issueProfessorIdentity(
                    professor.address,
                    academy.address,
                    "",
                    PROFESSOR_NAME,
                    PROFESSOR_TITLE,
                    PROFESSOR_DEPARTMENT,
                    PROFESSOR_COUNTRY,
                    FINGERPRINT,
                    notBefore,
                    notAfter
                )
            ).to.be.revertedWithCustomError(instance, "InvalidProfessorId");
        });

        it("Should revert on professor ID shorter than minimum length (< 3 chars)", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, professor, notBefore, notAfter } =
                await networkHelpers.loadFixture(deployFixture);

            await expect(
                instance.connect(owner).issueProfessorIdentity(
                    professor.address,
                    academy.address,
                    "AB",  // 2 chars only
                    PROFESSOR_NAME,
                    PROFESSOR_TITLE,
                    PROFESSOR_DEPARTMENT,
                    PROFESSOR_COUNTRY,
                    FINGERPRINT,
                    notBefore,
                    notAfter
                )
            ).to.be.revertedWithCustomError(instance, "InvalidProfessorId");
        });

        it("Should revert on professor ID longer than maximum length (> 20 chars)", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, professor, notBefore, notAfter } =
                await networkHelpers.loadFixture(deployFixture);

            await expect(
                instance.connect(owner).issueProfessorIdentity(
                    professor.address,
                    academy.address,
                    "PROF_ID_THAT_IS_TOO_LONG_123",   // MAX_ID_LENGTH of 20
                    PROFESSOR_NAME,
                    PROFESSOR_TITLE,
                    PROFESSOR_DEPARTMENT,
                    PROFESSOR_COUNTRY,
                    FINGERPRINT,
                    notBefore,
                    notAfter
                )
            ).to.be.revertedWithCustomError(instance, "InvalidProfessorId");
        });

        it("Should revert on empty name", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, professor, notBefore, notAfter } =
                await networkHelpers.loadFixture(deployFixture);

            await expect(
                instance.connect(owner).issueProfessorIdentity(
                    professor.address,
                    academy.address,
                    PROFESSOR_ID,
                    "",
                    PROFESSOR_TITLE,
                    PROFESSOR_DEPARTMENT,
                    PROFESSOR_COUNTRY,
                    FINGERPRINT,
                    notBefore,
                    notAfter
                )
            ).to.be.revertedWithCustomError(instance, "InvalidName");
        });

        it("Should revert on empty title", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, professor, notBefore, notAfter } =
                await networkHelpers.loadFixture(deployFixture);

            await expect(
                instance.connect(owner).issueProfessorIdentity(
                    professor.address,
                    academy.address,
                    PROFESSOR_ID,
                    PROFESSOR_NAME,
                    "",
                    PROFESSOR_DEPARTMENT,
                    PROFESSOR_COUNTRY,
                    FINGERPRINT,
                    notBefore,
                    notAfter
                )
            ).to.be.revertedWithCustomError(instance, "InvalidTitle");
        });

        it("Should revert on empty department", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, professor, notBefore, notAfter } =
                await networkHelpers.loadFixture(deployFixture);

            await expect(
                instance.connect(owner).issueProfessorIdentity(
                    professor.address,
                    academy.address,
                    PROFESSOR_ID,
                    PROFESSOR_NAME,
                    PROFESSOR_TITLE,
                    "",
                    PROFESSOR_COUNTRY,
                    FINGERPRINT,
                    notBefore,
                    notAfter
                )
            ).to.be.revertedWithCustomError(instance, "InvalidDepartment");
        });

        it("Should revert on empty country", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, professor, notBefore, notAfter } =
                await networkHelpers.loadFixture(deployFixture);

            await expect(
                instance.connect(owner).issueProfessorIdentity(
                    professor.address,
                    academy.address,
                    PROFESSOR_ID,
                    PROFESSOR_NAME,
                    PROFESSOR_TITLE,
                    PROFESSOR_DEPARTMENT,
                    "",
                    FINGERPRINT,
                    notBefore,
                    notAfter
                )
            ).to.be.revertedWithCustomError(instance, "InvalidCountry");
        });

        it("Should revert on zero fingerprint", async () => {
            const { networkHelpers, ethers } = await hre.network.connect();
            const { instance, owner, academy, professor, notBefore, notAfter } =
                await networkHelpers.loadFixture(deployFixture);

            await expect(
                instance.connect(owner).issueProfessorIdentity(
                    professor.address,
                    academy.address,
                    PROFESSOR_ID,
                    PROFESSOR_NAME,
                    PROFESSOR_TITLE,
                    PROFESSOR_DEPARTMENT,
                    PROFESSOR_COUNTRY,
                    ethers.ZeroHash,
                    notBefore,
                    notAfter
                )
            ).to.be.revertedWithCustomError(instance, "InvalidFingerprint");
        });

        it("Should revert when notAfter <= notBefore", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, professor, notBefore } =
                await networkHelpers.loadFixture(deployFixture);

            await expect(
                instance.connect(owner).issueProfessorIdentity(
                    professor.address,
                    academy.address,
                    PROFESSOR_ID,
                    PROFESSOR_NAME,
                    PROFESSOR_TITLE,
                    PROFESSOR_DEPARTMENT,
                    PROFESSOR_COUNTRY,
                    FINGERPRINT,
                    notBefore,
                    notBefore   // notAfter === notBefore
                )
            ).to.be.revertedWithCustomError(instance, "InvalidValidityWindow");
        });

        it("Should revert when notAfter is in the past", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, professor, now } =
                await networkHelpers.loadFixture(deployFixture);

            await expect(
                instance.connect(owner).issueProfessorIdentity(
                    professor.address,
                    academy.address,
                    PROFESSOR_ID,
                    PROFESSOR_NAME,
                    PROFESSOR_TITLE,
                    PROFESSOR_DEPARTMENT,
                    PROFESSOR_COUNTRY,
                    FINGERPRINT,
                    now - ONE_YEAR_SECS,  // notBefore: 1 year ago
                    now - ONE_DAY_SECS    // notAfter:  yesterday (past)
                )
            ).to.be.revertedWithCustomError(instance, "InvalidValidityWindow");
        });

        it("Should revert when notBefore is zero", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, professor, notAfter } =
                await networkHelpers.loadFixture(deployFixture);

            await expect(
                instance.connect(owner).issueProfessorIdentity(
                    professor.address,
                    academy.address,
                    PROFESSOR_ID,
                    PROFESSOR_NAME,
                    PROFESSOR_TITLE,
                    PROFESSOR_DEPARTMENT,
                    PROFESSOR_COUNTRY,
                    FINGERPRINT,
                    0,
                    notAfter
                )
            ).to.be.revertedWithCustomError(instance, "InvalidValidityWindow");
        });
    });
});