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
    const STUDENT_NAME        = "Marouan Boumchahate";
    const STUDENT_NATIONALITY = "Moroccan";
    const STUDENT_DEPARTMENT  = "Computer Science";
    const STUDENT_COUNTRY     = "Turkey";

    const ONE_DAY_SECS  = 86_400;
    const ONE_YEAR_SECS = 365 * ONE_DAY_SECS;


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

        await instance.issueAcademyIdentity(
            academy.address,
            ACADEMY_ID,
            ACADEMY_NAME,
            ACADEMY_CODE,
            ACADEMY_COUNTRY,
            ACADEMY_FP,
            now - ONE_DAY_SECS,  // notBefore
            now + ONE_YEAR_SECS  // notAfter
        );

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
            student.address,
            academy.address,
            STUDENT_ID,
            STUDENT_NAME,
            STUDENT_NATIONALITY,
            STUDENT_DEPARTMENT,
            STUDENT_COUNTRY
        );

        return base;
    }


    describe("issueStudentIdentity", () => {

        it("Should store all fields correctly after a valid issuance", async () => {
            const { networkHelpers, ethers } = await hre.network.connect();
            const { instance, owner, academy, student } =
                await networkHelpers.loadFixture(deployFixture);

            await instance.connect(owner).issueStudentIdentity(
                student.address,
                academy.address,
                STUDENT_ID,
                STUDENT_NAME,
                STUDENT_NATIONALITY,
                STUDENT_DEPARTMENT,
                STUDENT_COUNTRY
            );

            const record = await instance.students(student.address);

            expect(record.name).to.equal(STUDENT_NAME);
            expect(record.nationality).to.equal(STUDENT_NATIONALITY);
            expect(record.academyName).to.equal(ACADEMY_NAME);
            expect(record.department).to.equal(STUDENT_DEPARTMENT);
            expect(record.country).to.equal(STUDENT_COUNTRY);

            expect(record.isNotRevoked).to.equal(true);
            expect(record.revokedAt).to.equal(0);
            expect(record.issuedBy).to.equal(academy.address);
            expect(record.issuedAt).to.be.gt(0);
            expect(record.revokedBy).to.equal(ethers.ZeroAddress);
        });

        it("Should store studentIdHash as keccak256 of the provided student ID", async () => {
            const { networkHelpers, ethers } = await hre.network.connect();
            const { instance, owner, academy, student } =
                await networkHelpers.loadFixture(deployFixture);

            await instance.connect(owner).issueStudentIdentity(
                student.address,
                academy.address,
                STUDENT_ID,
                STUDENT_NAME,
                STUDENT_NATIONALITY,
                STUDENT_DEPARTMENT,
                STUDENT_COUNTRY
            );

            const record = await instance.students(student.address);
            const expectedHash = ethers.keccak256(ethers.toUtf8Bytes(STUDENT_ID));

            expect(record.studentIdHash).to.equal(expectedHash);
        });

        it("Should populate academyName from the on-chain academy registry", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, student } =
                await networkHelpers.loadFixture(deployFixture);

            await instance.connect(owner).issueStudentIdentity(
                student.address,
                academy.address,
                STUDENT_ID,
                STUDENT_NAME,
                STUDENT_NATIONALITY,
                STUDENT_DEPARTMENT,
                STUDENT_COUNTRY
            );

            const record = await instance.students(student.address);
            expect(record.academyName).to.equal(ACADEMY_NAME);
        });

        it("Should revert when called by a non-owner account", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, academy, student } =
                await networkHelpers.loadFixture(deployFixture);

            await expect(
                instance.connect(academy).issueStudentIdentity(
                    student.address,
                    academy.address,
                    STUDENT_ID,
                    STUDENT_NAME,
                    STUDENT_NATIONALITY,
                    STUDENT_DEPARTMENT,
                    STUDENT_COUNTRY
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
                    student.address,
                    fakeAcademy.address,
                    STUDENT_ID,
                    STUDENT_NAME,
                    STUDENT_NATIONALITY,
                    STUDENT_DEPARTMENT,
                    STUDENT_COUNTRY
                )
            ).to.be.revertedWith(
                "Not authorized: Only a registered academy can perform this operation."
            );
        });

        it("Should overwrite an existing record on re-issuance", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, student } =
                await networkHelpers.loadFixture(deployWithStudentFixture);

            await instance.connect(owner).issueStudentIdentity(
                student.address,
                academy.address,
                STUDENT_ID,
                "Renamed Student",
                "German",
                "Mathematics",
                "Germany"
            );

            const record = await instance.students(student.address);
            expect(record.name).to.equal("Renamed Student");
            expect(record.nationality).to.equal("German");
            expect(record.department).to.equal("Mathematics");
            expect(record.country).to.equal("Germany");
        });
    });

    describe("Input validation", () => {

        it("Should revert on zero student wallet address", async () => {
            const { networkHelpers, ethers } = await hre.network.connect();
            const { instance, owner, academy } =
                await networkHelpers.loadFixture(deployFixture);

            await expect(
                instance.connect(owner).issueStudentIdentity(
                    ethers.ZeroAddress,   // zero wallet
                    academy.address,
                    STUDENT_ID,
                    STUDENT_NAME,
                    STUDENT_NATIONALITY,
                    STUDENT_DEPARTMENT,
                    STUDENT_COUNTRY
                )
            ).to.be.revertedWithCustomError(instance, "InvalidWalletAddress");
        });

        it("Should revert on empty student ID", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, student } =
                await networkHelpers.loadFixture(deployFixture);

            await expect(
                instance.connect(owner).issueStudentIdentity(
                    student.address,
                    academy.address,
                    "",                   // empty ID
                    STUDENT_NAME,
                    STUDENT_NATIONALITY,
                    STUDENT_DEPARTMENT,
                    STUDENT_COUNTRY
                )
            ).to.be.revertedWithCustomError(instance, "InvalidStudentId");
        });

        it("Should revert on student ID shorter than minimum length (< 3 chars)", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, student } =
                await networkHelpers.loadFixture(deployFixture);

            await expect(
                instance.connect(owner).issueStudentIdentity(
                    student.address,
                    academy.address,
                    "AB",                 // 2 chars — below MIN_ID_LENGTH of 3
                    STUDENT_NAME,
                    STUDENT_NATIONALITY,
                    STUDENT_DEPARTMENT,
                    STUDENT_COUNTRY
                )
            ).to.be.revertedWithCustomError(instance, "InvalidStudentId");
        });

        it("Should revert on student ID longer than maximum length (> 20 chars)", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, student } =
                await networkHelpers.loadFixture(deployFixture);

            await expect(
                instance.connect(owner).issueStudentIdentity(
                    student.address,
                    academy.address,
                    "STU_ID_THAT_IS_TOO_LONG_456",  // > MAX_ID_LENGTH of 20
                    STUDENT_NAME,
                    STUDENT_NATIONALITY,
                    STUDENT_DEPARTMENT,
                    STUDENT_COUNTRY
                )
            ).to.be.revertedWithCustomError(instance, "InvalidStudentId");
        });

        it("Should revert on empty name", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, student } =
                await networkHelpers.loadFixture(deployFixture);

            await expect(
                instance.connect(owner).issueStudentIdentity(
                    student.address,
                    academy.address,
                    STUDENT_ID,
                    "",                   // empty name
                    STUDENT_NATIONALITY,
                    STUDENT_DEPARTMENT,
                    STUDENT_COUNTRY
                )
            ).to.be.revertedWithCustomError(instance, "InvalidName");
        });

        it("Should revert on name exceeding maximum length (> 256 chars)", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, student } =
                await networkHelpers.loadFixture(deployFixture);

            const tooLongName = "A".repeat(257);   // MAX_STRING_LENGTH is 256

            await expect(
                instance.connect(owner).issueStudentIdentity(
                    student.address,
                    academy.address,
                    STUDENT_ID,
                    tooLongName,
                    STUDENT_NATIONALITY,
                    STUDENT_DEPARTMENT,
                    STUDENT_COUNTRY
                )
            ).to.be.revertedWithCustomError(instance, "InvalidName");
        });

        it("Should revert on empty nationality", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, student } =
                await networkHelpers.loadFixture(deployFixture);

            await expect(
                instance.connect(owner).issueStudentIdentity(
                    student.address,
                    academy.address,
                    STUDENT_ID,
                    STUDENT_NAME,
                    "",                   // empty nationality
                    STUDENT_DEPARTMENT,
                    STUDENT_COUNTRY
                )
            ).to.be.revertedWithCustomError(instance, "InvalidNationality");
        });

        it("Should revert on nationality shorter than minimum length (< 3 chars)", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, student } =
                await networkHelpers.loadFixture(deployFixture);

            await expect(
                instance.connect(owner).issueStudentIdentity(
                    student.address,
                    academy.address,
                    STUDENT_ID,
                    STUDENT_NAME,
                    "US",                 // 2 chars — below MIN_STRING_LENGTH of 3
                    STUDENT_DEPARTMENT,
                    STUDENT_COUNTRY
                )
            ).to.be.revertedWithCustomError(instance, "InvalidNationality");
        });

        it("Should revert on nationality exceeding maximum length (> 256 chars)", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, student } =
                await networkHelpers.loadFixture(deployFixture);

            const tooLongNationality = "N".repeat(257);

            await expect(
                instance.connect(owner).issueStudentIdentity(
                    student.address,
                    academy.address,
                    STUDENT_ID,
                    STUDENT_NAME,
                    tooLongNationality,
                    STUDENT_DEPARTMENT,
                    STUDENT_COUNTRY
                )
            ).to.be.revertedWithCustomError(instance, "InvalidNationality");
        });

        it("Should revert on empty department", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, student } =
                await networkHelpers.loadFixture(deployFixture);

            await expect(
                instance.connect(owner).issueStudentIdentity(
                    student.address,
                    academy.address,
                    STUDENT_ID,
                    STUDENT_NAME,
                    STUDENT_NATIONALITY,
                    "",                   // empty department
                    STUDENT_COUNTRY
                )
            ).to.be.revertedWithCustomError(instance, "InvalidDepartment");
        });

        it("Should revert on department exceeding maximum length (> 256 chars)", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, student } =
                await networkHelpers.loadFixture(deployFixture);

            const tooLongDept = "D".repeat(257);

            await expect(
                instance.connect(owner).issueStudentIdentity(
                    student.address,
                    academy.address,
                    STUDENT_ID,
                    STUDENT_NAME,
                    STUDENT_NATIONALITY,
                    tooLongDept,
                    STUDENT_COUNTRY
                )
            ).to.be.revertedWithCustomError(instance, "InvalidDepartment");
        });

        it("Should revert on empty country", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, student } =
                await networkHelpers.loadFixture(deployFixture);

            await expect(
                instance.connect(owner).issueStudentIdentity(
                    student.address,
                    academy.address,
                    STUDENT_ID,
                    STUDENT_NAME,
                    STUDENT_NATIONALITY,
                    STUDENT_DEPARTMENT,
                    ""                    // empty country
                )
            ).to.be.revertedWithCustomError(instance, "InvalidCountry");
        });

        it("Should revert on country exceeding maximum length (> 256 chars)", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, student } =
                await networkHelpers.loadFixture(deployFixture);

            const tooLongCountry = "C".repeat(257);

            await expect(
                instance.connect(owner).issueStudentIdentity(
                    student.address,
                    academy.address,
                    STUDENT_ID,
                    STUDENT_NAME,
                    STUDENT_NATIONALITY,
                    STUDENT_DEPARTMENT,
                    tooLongCountry
                )
            ).to.be.revertedWithCustomError(instance, "InvalidCountry");
        });
    });
});