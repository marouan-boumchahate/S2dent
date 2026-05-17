import { expect } from "chai";
import hre from "hardhat";

describe("ProfessorIdentity", () => {
    const ACADEMY_NUMBER = "ACD_PROF_TST01";
    const ACADEMY_NAME = "Fenerbahçe University";
    const ACADEMY_SHORT = "FBU";
    const ACADEMY_FP = "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";

    const ONE_DAY_SECS = 86_400;
    const ONE_YEAR_SECS = 365 * ONE_DAY_SECS;

    // Public keys (65 bytes hex strings) stored as identity data on-chain
    const ACADEMY_PK = "0x04" + "a1".repeat(64);
    const SECOND_ACADEMY_PK = "0x04" + "a2".repeat(64);
    const PROFESSOR_PK = "0x04" + "b1".repeat(64);
    const PROFESSOR2_PK = "0x04" + "b2".repeat(64);
    const SHORT_PK = "0x04"; // Invalid public-key length

    function academyIssueArgs() {
        return {
            legalName: "Fenerbahçe University A.Ş.",
            registrationNumber: "REG-FBU-001",
            taxId: "TAX-FBU-001",
            billingEmail: "billing@fbu.edu.tr",
            certificatePem: "-----BEGIN CERTIFICATE-----\nACADEMY\n-----END CERTIFICATE-----",
            chainPem: "-----BEGIN CERTIFICATE-----\nCHAIN\n-----END CERTIFICATE-----",
        };
    }

    function professorIssueArgs(overrides: any = {}) {
        const base = {
            publicKey: PROFESSOR_PK,
            employeeId: "EMP_20240315001",
            nationalId: "TR-12345678901",
            fullName: "Ada Lovelace",
            rank: 1,
            employmentType: 0,
            hireDate: Math.floor(Date.now() / 1000) - ONE_DAY_SECS, // Hired 1 day ago
        };

        return { ...base, ...overrides };
    }

    async function deployFixture() {
        const { ethers } = await hre.network.connect();
        const [owner, fakeAcademy, academy, professor, professor2] = await ethers.getSigners();

        const latestBlock = await ethers.provider.getBlock("latest");
        if (!latestBlock) throw new Error("Failed to fetch latest block");

        const now = latestBlock.timestamp;
        const notBefore = now - ONE_DAY_SECS;
        const notAfter = now + ONE_YEAR_SECS;

        const ProfessorIdentity = await ethers.getContractFactory("ProfessorIdentity");
        const instance = await ProfessorIdentity.deploy();
        await instance.waitForDeployment();

        const a = academyIssueArgs();

        await instance.connect(owner).issueAcademyIdentity(academy.address, {
            infos: {
                publicKey: ACADEMY_PK,
                academyId: ACADEMY_NUMBER,
                name: ACADEMY_NAME,
                shortName: ACADEMY_SHORT,
                academyType: 0,
            },
            proofs: {
                legalName: a.legalName,
                registrationNumber: a.registrationNumber,
                taxId: a.taxId,
                billingEmail: a.billingEmail,
            },
            cert: {
                fingerprint: ACADEMY_FP,
                certificate: a.certificatePem,
                chain: a.chainPem,
                notBefore: BigInt(notBefore),
                notAfter: BigInt(notAfter),
            },
        });

        return {
            instance,
            owner,
            fakeAcademy,
            academy,
            professor,
            professor2,
            notBefore,
            notAfter,
            now,
        };
    }

    async function deployWithProfessorFixture() {
        const { networkHelpers } = await hre.network.connect();
        const base = await networkHelpers.loadFixture(deployFixture);
        const { instance, owner, academy, professor } = base;

        await instance.connect(owner).issueProfessorIdentity(
            professor.address,
            academy.address,
            professorIssueArgs(),
        );

        return base;
    }

    describe("issueProfessorIdentity", () => {
        it("stores professor identity data and sets issuer to academy", async () => {
            const { networkHelpers, ethers } = await hre.network.connect();
            const { instance, owner, academy, professor } =
                await networkHelpers.loadFixture(deployFixture);

            const args = professorIssueArgs();
            await instance.connect(owner).issueProfessorIdentity(professor.address, academy.address, args);

            const record = await instance.professors(professor.address);

            expect(record.identity.employeeIdHash).to.equal(
                ethers.keccak256(ethers.toUtf8Bytes(args.employeeId)),
            );
            expect(record.identity.nationalIdHash).to.equal(
                ethers.keccak256(ethers.toUtf8Bytes(args.nationalId)),
            );
            expect(record.identity.publicKey).to.equal(PROFESSOR_PK);
            expect(record.identity.fullName).to.equal(args.fullName);
            expect(record.identity.rank).to.equal(BigInt(args.rank));
            expect(record.identity.employmentType).to.equal(BigInt(args.employmentType));
            expect(record.identity.hireDate).to.equal(BigInt(args.hireDate));
            expect(record.status.isNotRevoked).to.equal(true);
            expect(record.status.revokedAt).to.equal(0);
            expect(record.status.issuer).to.equal(academy.address);
            expect(record.status.issuedAt).to.be.gt(0);
            expect(record.status.revoker).to.equal(ethers.ZeroAddress);
            expect(record.status.revocationReason).to.equal("");
        });

        it("reverts when the academy is not registered", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, fakeAcademy, professor } =
                await networkHelpers.loadFixture(deployFixture);

            await expect(
                instance.connect(owner).issueProfessorIdentity(
                    professor.address,
                    fakeAcademy.address,
                    professorIssueArgs(),
                ),
            ).to.be.revertedWith("Not authorized: Only a registered academy can perform this operation.");
        });

        it("reverts when called by a non-owner", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, academy, professor } =
                await networkHelpers.loadFixture(deployFixture);

            await expect(
                instance.connect(academy).issueProfessorIdentity(
                    professor.address,
                    academy.address,
                    professorIssueArgs(),
                ),
            ).to.be.revertedWith("Not authorized: Only owner can perform this operation.");
        });

        it("reverts on re-issuance (no overwrite)", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, professor } =
                await networkHelpers.loadFixture(deployWithProfessorFixture);

            await expect(
                instance.connect(owner).issueProfessorIdentity(
                    professor.address,
                    academy.address,
                    professorIssueArgs(),
                ),
            ).to.be.revertedWithCustomError(instance, "ProfessorIdentityAlreadyIssued");
        });

        it("enforces unique employeeId per academy", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, professor, professor2 } =
                await networkHelpers.loadFixture(deployFixture);

            await instance.connect(owner).issueProfessorIdentity(
                professor.address,
                academy.address,
                professorIssueArgs(),
            );

            const args2 = professorIssueArgs({ publicKey: PROFESSOR2_PK, nationalId: "TR-999" });

            await expect(
                instance.connect(owner).issueProfessorIdentity(
                    professor2.address,
                    academy.address,
                    args2,
                ),
            ).to.be.revertedWithCustomError(instance, "ProfessorEmployeeIdAlreadyUsed");
        });

        it("enforces unique nationalIdHash globally", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, professor, professor2 } =
                await networkHelpers.loadFixture(deployFixture);

            await instance.connect(owner).issueProfessorIdentity(
                professor.address,
                academy.address,
                professorIssueArgs(),
            );

            const args2 = professorIssueArgs({ publicKey: PROFESSOR2_PK, employeeId: "EMP_20240315002" });

            await expect(
                instance.connect(owner).issueProfessorIdentity(
                    professor2.address,
                    academy.address,
                    args2,
                ),
            ).to.be.revertedWithCustomError(instance, "ProfessorNationalIdAlreadyUsed");
        });
    });

    describe("Input validation", () => {
        it("reverts on zero professor address", async () => {
            const { networkHelpers, ethers } = await hre.network.connect();
            const { instance, owner, academy } =
                await networkHelpers.loadFixture(deployFixture);

            await expect(
                instance.connect(owner).issueProfessorIdentity(
                    ethers.ZeroAddress,
                    academy.address,
                    professorIssueArgs(),
                ),
            )
                .to.be.revertedWithCustomError(instance, "InvalidAddress")
                .withArgs("Address must not be the zero address.");
        });

        it("reverts on invalid public key length", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, professor } =
                await networkHelpers.loadFixture(deployFixture);

            const args = professorIssueArgs({ publicKey: SHORT_PK });

            await expect(
                instance.connect(owner).issueProfessorIdentity(professor.address, academy.address, args),
            )
                .to.be.revertedWithCustomError(instance, "InvalidPublicKey")
                .withArgs("Public key must be 65 bytes.");
        });

        it("reverts when employeeId is too short", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, professor } =
                await networkHelpers.loadFixture(deployFixture);

            const args = professorIssueArgs({ employeeId: "AB" });

            await expect(
                instance.connect(owner).issueProfessorIdentity(professor.address, academy.address, args),
            ).to.be.revertedWith("Invalid professor: employeeId is too short.");
        });

        it("reverts when rank is out of range", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, professor } =
                await networkHelpers.loadFixture(deployFixture);

            const args = professorIssueArgs({ rank: 9 });

            await expect(
                instance.connect(owner).issueProfessorIdentity(professor.address, academy.address, args),
            ).to.be.revertedWith("Invalid professor: rank out of range.");
        });

        it("reverts when employmentType is out of range", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, professor } =
                await networkHelpers.loadFixture(deployFixture);

            const args = professorIssueArgs({ employmentType: 99 });

            await expect(
                instance.connect(owner).issueProfessorIdentity(professor.address, academy.address, args),
            ).to.be.revertedWith("Invalid professor: employmentType out of range.");
        });

        it("reverts when nationalId is missing", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, professor } =
                await networkHelpers.loadFixture(deployFixture);

            const args = professorIssueArgs({ nationalId: "" });

            await expect(
                instance.connect(owner).issueProfessorIdentity(professor.address, academy.address, args),
            ).to.be.revertedWith("Invalid professor: nationalId is required.");
        });

        it("reverts when fullName is missing", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, professor } =
                await networkHelpers.loadFixture(deployFixture);

            const args = professorIssueArgs({ fullName: "" });

            await expect(
                instance.connect(owner).issueProfessorIdentity(professor.address, academy.address, args),
            ).to.be.revertedWith("Invalid professor: fullName is required.");
        });

        it("reverts when hireDate is in the future", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, professor } =
                await networkHelpers.loadFixture(deployFixture);

            const futureHireDate = Math.floor(Date.now() / 1000) + ONE_DAY_SECS;
            const args = professorIssueArgs({ hireDate: futureHireDate });

            await expect(
                instance.connect(owner).issueProfessorIdentity(professor.address, academy.address, args),
            ).to.be.revertedWith("Invalid professor: hireDate is in the future.");
        });
    });

    describe("revokeProfessorIdentity", () => {
        async function issueSecondAcademy(instance: any, owner: any, academyAddress: string, notBefore: number, notAfter: number) {
            const a = academyIssueArgs();
            await instance.connect(owner).issueAcademyIdentity(academyAddress, {
                infos: {
                    publicKey: SECOND_ACADEMY_PK,
                    academyId: "ACD_PROF_TST02",
                    name: "Second University",
                    shortName: "SU",
                    academyType: 0,
                },
                proofs: {
                    legalName: "Second University A.Ş.",
                    registrationNumber: "REG-SU-001",
                    taxId: "TAX-SU-001",
                    billingEmail: "billing@su.edu.tr",
                },
                cert: {
                    fingerprint: ACADEMY_FP,
                    certificate: a.certificatePem,
                    chain: a.chainPem,
                    notBefore: BigInt(notBefore),
                    notAfter: BigInt(notAfter),
                },
            });
        }

        it("flips status fields and sets revoker to the issuing academy", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, professor } =
                await networkHelpers.loadFixture(deployWithProfessorFixture);

            await instance.connect(owner).revokeProfessorIdentity(professor.address, academy.address, "Reason");

            const record = await instance.professors(professor.address);
            expect(record.status.isNotRevoked).to.equal(false);
            expect(record.status.revokedAt).to.be.gt(0);
            expect(record.status.revoker).to.equal(academy.address);
            expect(record.status.issuer).to.equal(academy.address);
            expect(record.status.issuedAt).to.be.gt(0);
            expect(record.status.revocationReason).to.equal("Reason");
        });

        it("reverts when called by a non-owner", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, academy, professor } =
                await networkHelpers.loadFixture(deployWithProfessorFixture);

            await expect(
                instance.connect(academy).revokeProfessorIdentity(professor.address, academy.address, "Reason"),
            ).to.be.revertedWith("Not authorized: Only owner can perform this operation.");
        });

        it("reverts when _revokerAddress is not a registered academy", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, fakeAcademy, professor } =
                await networkHelpers.loadFixture(deployWithProfessorFixture);

            await expect(
                instance.connect(owner).revokeProfessorIdentity(professor.address, fakeAcademy.address, "Reason"),
            ).to.be.revertedWith("Not authorized: Only a registered academy can perform this operation.");
        });

        it("reverts when _revokerAddress is a different registered academy", async () => {
            const { networkHelpers, ethers } = await hre.network.connect();
            const { instance, owner, professor, notBefore, notAfter } =
                await networkHelpers.loadFixture(deployWithProfessorFixture);

            const secondAcademy = ethers.Wallet.createRandom().address;
            await issueSecondAcademy(instance, owner, secondAcademy, notBefore, notAfter);

            await expect(
                instance.connect(owner).revokeProfessorIdentity(professor.address, secondAcademy, "Reason"),
            ).to.be.revertedWith("Invalid revoker: must be the issuing academy.");
        });

        it("reverts when the issuing academy has itself been revoked", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, professor } =
                await networkHelpers.loadFixture(deployWithProfessorFixture);

            await instance.connect(owner).revokeAcademyIdentity(academy.address, "Reason");

            await expect(
                instance.connect(owner).revokeProfessorIdentity(professor.address, academy.address, "Reason"),
            ).to.be.revertedWith("Not authorized: Only a registered academy can perform this operation.");
        });

        it("reverts on zero professor address", async () => {
            const { networkHelpers, ethers } = await hre.network.connect();
            const { instance, owner, academy } =
                await networkHelpers.loadFixture(deployWithProfessorFixture);

            await expect(
                instance.connect(owner).revokeProfessorIdentity(ethers.ZeroAddress, academy.address, "Reason"),
            )
                .to.be.revertedWithCustomError(instance, "InvalidAddress")
                .withArgs("Address must not be the zero address.");
        });

        it("reverts when the professor was never issued", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, professor } =
                await networkHelpers.loadFixture(deployFixture);

            await expect(
                instance.connect(owner).revokeProfessorIdentity(professor.address, academy.address, "Reason"),
            ).to.be.revertedWithCustomError(instance, "ProfessorIdentityNotIssued");
        });

        it("reverts when called twice on the same professor", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy, professor } =
                await networkHelpers.loadFixture(deployWithProfessorFixture);

            await instance.connect(owner).revokeProfessorIdentity(professor.address, academy.address, "Reason");

            await expect(
                instance.connect(owner).revokeProfessorIdentity(professor.address, academy.address, "Reason"),
            ).to.be.revertedWithCustomError(instance, "ProfessorIdentityAlreadyRevoked");
        });
    });
});
