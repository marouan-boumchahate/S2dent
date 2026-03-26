import { expect } from "chai";
import hre from "hardhat";

describe("AcademyIdentity", () => {

    const ACADEMY_ID = "ACADEMY001";
    const ACADEMY_NAME = "Fenerbahçe University";
    const ACADEMY_CODE = "FBU";
    const ACADEMY_COUNTRY = "Turkey";
    const FINGERPRINT = "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";

    const ONE_DAY_SECS = 86_400;
    const ONE_YEAR_SECS = 365 * ONE_DAY_SECS;

    async function deployFixture() {
        const { ethers } = await hre.network.connect();

        const [owner, fakeOwner, academy, secondAcademy] = await ethers.getSigners();

        const latestBlock = await ethers.provider.getBlock("latest");
        if(!latestBlock) throw new Error("Failed to fetch latest block");

        const now         = latestBlock.timestamp;
        const notBefore   = now - ONE_DAY_SECS;
        const notAfter    = now + ONE_YEAR_SECS;

        const AcademyIdentity = await ethers.getContractFactory("AcademyIdentity");
        const instance        = await AcademyIdentity.deploy();
        await instance.waitForDeployment();

        return { instance, owner, fakeOwner, academy, secondAcademy, notBefore, notAfter, now };
    }

    async function deployWithAcademyFixture() {
        const { networkHelpers } = await hre.network.connect();
        const base = await networkHelpers.loadFixture(deployFixture);
        const { instance, academy, notBefore, notAfter } = base;

        await instance.issueAcademyIdentity(
            academy.address,
            ACADEMY_ID,
            ACADEMY_NAME,
            ACADEMY_CODE,
            ACADEMY_COUNTRY,
            FINGERPRINT,
            notBefore,
            notAfter
        );

        return base;
    }


    describe("issueAcademyIdentity", () => {

        it("Should store all fields correctly after a valid issuance", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, notBefore, notAfter } =
                await networkHelpers.loadFixture(deployFixture);

            await instance.issueAcademyIdentity(
                academy.address,
                ACADEMY_ID,
                ACADEMY_NAME,
                ACADEMY_CODE,
                ACADEMY_COUNTRY,
                FINGERPRINT,
                notBefore,
                notAfter
            );

            const record = await instance.academies(academy.address);

            expect(record.name).to.equal(ACADEMY_NAME);
            expect(record.code).to.equal(ACADEMY_CODE);
            expect(record.country).to.equal(ACADEMY_COUNTRY);
            expect(record.fingerprint).to.equal(FINGERPRINT);
            expect(record.notBefore).to.equal(notBefore);
            expect(record.notAfter).to.equal(notAfter);
            expect(record.isRevoked).to.equal(false);
            expect(record.revokedAt).to.equal(0);
            expect(record.issuedBy).to.equal(owner.address);
            expect(record.issuedAt).to.be.gt(0);
        });

        it("Should store academyIdHash as keccak256 of the provided ID", async () => {
            const { networkHelpers, ethers } = await hre.network.connect();
            const { instance, academy, notBefore, notAfter } =
                await networkHelpers.loadFixture(deployFixture);

            await instance.issueAcademyIdentity(
                academy.address, ACADEMY_ID, ACADEMY_NAME,
                ACADEMY_CODE, ACADEMY_COUNTRY, FINGERPRINT, notBefore, notAfter
            );

            const record       = await instance.academies(academy.address);
            const expectedHash = ethers.keccak256(ethers.toUtf8Bytes(ACADEMY_ID));

            expect(record.academyIdHash).to.equal(expectedHash);
        });

        it("Should revert when called by a non-owner", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, fakeOwner, academy, notBefore, notAfter } =
                await networkHelpers.loadFixture(deployFixture);

            await expect(
                instance.connect(fakeOwner).issueAcademyIdentity(
                    academy.address, ACADEMY_ID, ACADEMY_NAME,
                    ACADEMY_CODE, ACADEMY_COUNTRY, FINGERPRINT, notBefore, notAfter
                )
            ).to.be.revertedWith(
                "Not authorized: Only owner can perform this operation."
            );
        });

        it("Should overwrite an existing record on re-issuance", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, academy, notBefore, notAfter } =
                await networkHelpers.loadFixture(deployWithAcademyFixture);

            await instance.issueAcademyIdentity(
                academy.address, ACADEMY_ID, "Renamed University",
                "RNU", ACADEMY_COUNTRY, FINGERPRINT, notBefore, notAfter
            );

            const record = await instance.academies(academy.address);
            expect(record.name).to.equal("Renamed University");
            expect(record.code).to.equal("RNU");
        });
    });

    describe("Input validation", () => {

        it("Should revert on zero wallet address", async () => {
            const { networkHelpers, ethers } = await hre.network.connect();
            const { instance, notBefore, notAfter } =
                await networkHelpers.loadFixture(deployFixture);

            await expect(
                instance.issueAcademyIdentity(
                    ethers.ZeroAddress, ACADEMY_ID, ACADEMY_NAME,
                    ACADEMY_CODE, ACADEMY_COUNTRY, FINGERPRINT, notBefore, notAfter
                )
            ).to.be.revertedWithCustomError(instance, "InvalidWalletAddress");
        });

        it("Should revert on empty academy ID", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, academy, notBefore, notAfter } =
                await networkHelpers.loadFixture(deployFixture);

            await expect(
                instance.issueAcademyIdentity(
                    academy.address, "", ACADEMY_NAME,
                    ACADEMY_CODE, ACADEMY_COUNTRY, FINGERPRINT, notBefore, notAfter
                )
            ).to.be.revertedWithCustomError(instance, "InvalidAcademyId");
        });

        it("Should revert on empty name", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, academy, notBefore, notAfter } =
                await networkHelpers.loadFixture(deployFixture);

            await expect(
                instance.issueAcademyIdentity(
                    academy.address, ACADEMY_ID, "",
                    ACADEMY_CODE, ACADEMY_COUNTRY, FINGERPRINT, notBefore, notAfter
                )
            ).to.be.revertedWithCustomError(instance, "InvalidName");
        });

        it("Should revert on empty code", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, academy, notBefore, notAfter } =
                await networkHelpers.loadFixture(deployFixture);

            await expect(
                instance.issueAcademyIdentity(
                    academy.address, ACADEMY_ID, ACADEMY_NAME,
                    "", ACADEMY_COUNTRY, FINGERPRINT, notBefore, notAfter
                )
            ).to.be.revertedWithCustomError(instance, "InvalidCode");
        });

        it("Should revert on empty country", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, academy, notBefore, notAfter } =
                await networkHelpers.loadFixture(deployFixture);

            await expect(
                instance.issueAcademyIdentity(
                    academy.address, ACADEMY_ID, ACADEMY_NAME,
                    ACADEMY_CODE, "", FINGERPRINT, notBefore, notAfter
                )
            ).to.be.revertedWithCustomError(instance, "InvalidCountry");
        });

        it("Should revert on zero fingerprint", async () => {
            const { networkHelpers, ethers } = await hre.network.connect();
            const { instance, academy, notBefore, notAfter } =
                await networkHelpers.loadFixture(deployFixture);

            await expect(
                instance.issueAcademyIdentity(
                    academy.address, ACADEMY_ID, ACADEMY_NAME,
                    ACADEMY_CODE, ACADEMY_COUNTRY, ethers.ZeroHash, notBefore, notAfter
                )
            ).to.be.revertedWithCustomError(instance, "InvalidFingerprint");
        });

        it("Should revert when notAfter <= notBefore", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, academy, notBefore } =
                await networkHelpers.loadFixture(deployFixture);

            await expect(
                instance.issueAcademyIdentity(
                    academy.address, ACADEMY_ID, ACADEMY_NAME,
                    ACADEMY_CODE, ACADEMY_COUNTRY, FINGERPRINT,
                    notBefore,
                    notBefore   // notAfter === notBefore
                )
            ).to.be.revertedWithCustomError(instance, "InvalidValidityWindow");
        });

        it("Should revert when notAfter is in the past", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, academy, now } =
                await networkHelpers.loadFixture(deployFixture);

            await expect(
                instance.issueAcademyIdentity(
                    academy.address, ACADEMY_ID, ACADEMY_NAME,
                    ACADEMY_CODE, ACADEMY_COUNTRY, FINGERPRINT,
                    now - ONE_YEAR_SECS,    // notBefore: 1 year ago
                    now - ONE_DAY_SECS      // notAfter:  yesterday (past)
                )
            ).to.be.revertedWithCustomError(instance, "InvalidValidityWindow");
        });

        it("Should revert when notBefore is zero", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, academy, notAfter } =
                await networkHelpers.loadFixture(deployFixture);

            await expect(
                instance.issueAcademyIdentity(
                    academy.address, ACADEMY_ID, ACADEMY_NAME,
                    ACADEMY_CODE, ACADEMY_COUNTRY, FINGERPRINT,
                    0,
                    notAfter
                )
            ).to.be.revertedWithCustomError(instance, "InvalidValidityWindow");
        });
    });
});