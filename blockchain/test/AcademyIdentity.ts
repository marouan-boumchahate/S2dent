import { expect } from "chai";
import hre from "hardhat";

describe("AcademyIdentity", () => {
    const ACADEMY_ID = "ACD_0000161";
    const ACADEMY_NAME = "Fenerbahçe University";
    const SHORT_NAME = "FBU";
    const ACADEMY_TYPE = 0;

    const LEGAL_NAME = "Fenerbahçe University Foundation";
    const REGISTRATION_NUMBER = "REG-12345";
    const TAX_ID = "TAX-67890";
    const BILLING_EMAIL = "billing@example.edu";

    const FINGERPRINT =
        "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
    const CERTIFICATE_PEM =
        "-----BEGIN CERTIFICATE-----\nMIIBsample\n-----END CERTIFICATE-----\n";
    const CHAIN_PEM =
        "-----BEGIN CERTIFICATE-----\nMIIBchain\n-----END CERTIFICATE-----\n";

    const ACADEMY_ID_2 = "ACD_0000162";
    const ACADEMY_NAME_2 = "Second Test University";
    const SHORT_NAME_2 = "STU";
    const LEGAL_NAME_2 = "Second Legal Entity";
    const REGISTRATION_NUMBER_2 = "REG-SECOND";
    const TAX_ID_2 = "TAX-SECOND";
    const BILLING_EMAIL_2 = "billing2@example.edu";

    const ONE_DAY_SECS = 86_400;
    const ONE_YEAR_SECS = 365 * ONE_DAY_SECS;

    // Public keys (65 bytes hex strings) for entity identification
    const ACADEMY_PK = "0x04" + "a1".repeat(64);
    const SECOND_ACADEMY_PK = "0x04" + "a2".repeat(64);
    const EMPTY_PK = "0x04";

    async function deployFixture() {
        const { ethers } = await hre.network.connect();

        const [owner, fakeOwner, academy, secondAcademy] = await ethers.getSigners();

        const latestBlock = await ethers.provider.getBlock("latest");
        if (!latestBlock) throw new Error("Failed to fetch latest block");

        const now = latestBlock.timestamp;
        const notBefore = now - ONE_DAY_SECS;
        const notAfter = now + ONE_YEAR_SECS;

        const AcademyIdentity = await ethers.getContractFactory("AcademyIdentity");
        const instance = await AcademyIdentity.deploy();
        await instance.waitForDeployment();

        return { instance, owner, fakeOwner, academy, secondAcademy, notBefore, notAfter, now };
    }

    async function issueArgs(
        publicKey: string,
        notBefore: bigint | number,
        notAfter: bigint | number,
        overrides?: Partial<{
            academyId: string;
            name: string;
            shortName: string;
            academyType: number;
            legalName: string;
            registrationNumber: string;
            taxId: string;
            billingEmail: string;
            fingerprint: string;
            certificatePem: string;
            chainPem: string;
        }>
    ) {
        const { ethers } = await hre.network.connect();

        const o = {
            academyId: ACADEMY_ID,
            name: ACADEMY_NAME,
            shortName: SHORT_NAME,
            academyType: ACADEMY_TYPE,
            legalName: LEGAL_NAME,
            registrationNumber: REGISTRATION_NUMBER,
            taxId: TAX_ID,
            billingEmail: BILLING_EMAIL,
            fingerprint: FINGERPRINT,
            certificatePem: CERTIFICATE_PEM,
            chainPem: CHAIN_PEM,
            ...overrides,
        };

        const academyIdHash = ethers.solidityPackedKeccak256(["string"], [o.academyId]);

        return [
            publicKey,
            {
                infos: {
                    academyId: o.academyId,
                    name: o.name,
                    shortName: o.shortName,
                    academyType: o.academyType,
                },
                proofs: {
                    legalName: o.legalName,
                    registrationNumber: o.registrationNumber,
                    taxId: o.taxId,
                    billingEmail: o.billingEmail,
                },
                cert: {
                    fingerprint: o.fingerprint,
                    certificate: o.certificatePem,
                    chain: o.chainPem,
                    notBefore: BigInt(notBefore),
                    notAfter: BigInt(notAfter),
                },
            },
        ] as const;
    }

    async function deployWithAcademyFixture() {
        const { networkHelpers } = await hre.network.connect();
        const base = await networkHelpers.loadFixture(deployFixture);
        const { instance, academy, notBefore, notAfter } = base;

        await instance.issueAcademyIdentity(...(await issueArgs(ACADEMY_PK, notBefore, notAfter)));

        return base;
    }

    async function issueArgs2(
        publicKey: string,
        notBefore: bigint | number,
        notAfter: bigint | number,
        overrides?: Parameters<typeof issueArgs>[3]
    ) {
        return issueArgs(publicKey, notBefore, notAfter, {
            academyId: ACADEMY_ID_2,
            name: ACADEMY_NAME_2,
            shortName: SHORT_NAME_2,
            academyType: ACADEMY_TYPE,
            legalName: LEGAL_NAME_2,
            registrationNumber: REGISTRATION_NUMBER_2,
            taxId: TAX_ID_2,
            billingEmail: BILLING_EMAIL_2,
            ...overrides,
        });
    }

    describe("issueAcademyIdentity", () => {
        it("Should store all fields correctly after a valid issuance", async () => {
            const { networkHelpers, ethers } = await hre.network.connect();
            const { instance, owner, academy, notBefore, notAfter } =
                await networkHelpers.loadFixture(deployFixture);

            const [publicKey, args] = await issueArgs(ACADEMY_PK, notBefore, notAfter);
            await instance.issueAcademyIdentity(publicKey, args);

            const record = await instance.academies(ACADEMY_PK);

            expect(record.identity.academyIdHash).to.equal(ethers.solidityPackedKeccak256(["string"], [args.infos.academyId]));
            expect(record.identity.name).to.equal(ACADEMY_NAME);
            expect(record.identity.shortName).to.equal(SHORT_NAME);
            expect(record.identity.academyType).to.equal(BigInt(ACADEMY_TYPE));

            expect(record.proofs.legalName).to.equal(LEGAL_NAME);
            expect(record.proofs.registrationNumber).to.equal(REGISTRATION_NUMBER);
            expect(record.proofs.taxId).to.equal(TAX_ID);
            expect(record.proofs.billingEmail).to.equal(BILLING_EMAIL);

            expect(record.cert.fingerprint).to.equal(FINGERPRINT);
            expect(record.cert.certificate).to.equal(CERTIFICATE_PEM);
            expect(record.cert.chain).to.equal(CHAIN_PEM);
            expect(record.cert.notBefore).to.equal(notBefore);
            expect(record.cert.notAfter).to.equal(notAfter);

            expect(record.status.isNotRevoked).to.equal(true);
            expect(record.status.revokedAt).to.equal(0);
            expect(record.status.issuer).to.equal(owner.address);
            expect(record.status.revoker).to.equal(ethers.ZeroAddress);
            expect(record.status.issuedAt).to.be.gt(0);
            expect(record.status.revocationReason).to.equal("");
        });

        it("Should persist academyIdHash as provided", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, academy, notBefore, notAfter } =
                await networkHelpers.loadFixture(deployFixture);

            const customId = "ACADEMY00002";
            const [publicKey, args] = await issueArgs(ACADEMY_PK, notBefore, notAfter, { academyId: customId });
            await instance.issueAcademyIdentity(publicKey, args);

            const record = await instance.academies(ACADEMY_PK);
            const { ethers } = await hre.network.connect();
            const expectedHash = ethers.solidityPackedKeccak256(["string"], [customId]);
            expect(record.identity.academyIdHash).to.equal(expectedHash);
        });

        it("Should revert when called by a non-owner", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, fakeOwner, academy, notBefore, notAfter } =
                await networkHelpers.loadFixture(deployFixture);

            await expect(
                instance.connect(fakeOwner).issueAcademyIdentity(
                    ...(await issueArgs(ACADEMY_PK, notBefore, notAfter))
                )
            ).to.be.revertedWith("Not authorized: Only owner can perform this operation.");
        });

        it("Should revert on re-issuance (prevent overwrite)", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, academy, notBefore, notAfter } =
                await networkHelpers.loadFixture(deployWithAcademyFixture);

            await expect(
                instance.issueAcademyIdentity(
                    ...(await issueArgs(ACADEMY_PK, notBefore, notAfter, {
                        name: "Renamed University",
                        shortName: "RNU",
                    }))
                )
            ).to.be.revertedWithCustomError(instance, "AcademyIdentityAlreadyIssued");
        });

        it("Should allow issuing a second academy when all unique fields are different", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, secondAcademy, notBefore, notAfter } =
                await networkHelpers.loadFixture(deployWithAcademyFixture);

            await instance.issueAcademyIdentity(
                ...(await issueArgs2(SECOND_ACADEMY_PK, notBefore, notAfter))
            );

            const record = await instance.academies(SECOND_ACADEMY_PK);
            expect(record.identity.name).to.equal(ACADEMY_NAME_2);
            expect(record.identity.shortName).to.equal(SHORT_NAME_2);
        });

        it("Should revert when academyIdHash is already used", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, secondAcademy, notBefore, notAfter } =
                await networkHelpers.loadFixture(deployWithAcademyFixture);

            await expect(
                instance.issueAcademyIdentity(
                    ...(await issueArgs2(SECOND_ACADEMY_PK, notBefore, notAfter, { academyId: ACADEMY_ID }))
                )
            ).to.be.revertedWithCustomError(instance, "AcademyIdAlreadyUsed");
        });

        it("Should allow issuing when only name is reused (shortName differs)", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, secondAcademy, notBefore, notAfter } =
                await networkHelpers.loadFixture(deployWithAcademyFixture);

            await instance.issueAcademyIdentity(
                ...(await issueArgs2(SECOND_ACADEMY_PK, notBefore, notAfter, {
                    name: ACADEMY_NAME,
                    shortName: SHORT_NAME_2,
                }))
            );

            const record = await instance.academies(SECOND_ACADEMY_PK);
            expect(record.identity.name).to.equal(ACADEMY_NAME);
            expect(record.identity.shortName).to.equal(SHORT_NAME_2);
        });

        it("Should revert when name+shortName pair is already used", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, secondAcademy, notBefore, notAfter } =
                await networkHelpers.loadFixture(deployWithAcademyFixture);

            await expect(
                instance.issueAcademyIdentity(
                    ...(await issueArgs2(SECOND_ACADEMY_PK, notBefore, notAfter, {
                        name: ACADEMY_NAME,
                        shortName: SHORT_NAME,
                    }))
                )
            ).to.be.revertedWithCustomError(instance, "AcademyNameShortNameAlreadyUsed");
        });

        it("Should allow issuing when only taxId is reused (other legal fields differ)", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, secondAcademy, notBefore, notAfter } =
                await networkHelpers.loadFixture(deployWithAcademyFixture);

            await instance.issueAcademyIdentity(
                ...(await issueArgs2(SECOND_ACADEMY_PK, notBefore, notAfter, {
                    taxId: TAX_ID,
                    registrationNumber: REGISTRATION_NUMBER_2,
                    legalName: LEGAL_NAME_2,
                    billingEmail: BILLING_EMAIL_2,
                }))
            );

            const record = await instance.academies(SECOND_ACADEMY_PK);
            expect(record.proofs.taxId).to.equal(TAX_ID);
        });

        it("Should revert when legal bundle is already used", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, secondAcademy, notBefore, notAfter } =
                await networkHelpers.loadFixture(deployWithAcademyFixture);

            await expect(
                instance.issueAcademyIdentity(
                    ...(await issueArgs2(SECOND_ACADEMY_PK, notBefore, notAfter, {
                        legalName: LEGAL_NAME,
                        registrationNumber: REGISTRATION_NUMBER,
                        taxId: TAX_ID,
                        billingEmail: BILLING_EMAIL,
                    }))
                )
            ).to.be.revertedWithCustomError(instance, "AcademyLegalBundleAlreadyUsed");
        });
    });

    describe("Input validation", () => {
        it("Should revert on zero academy public key", async () => {
            const { networkHelpers, ethers } = await hre.network.connect();
            const { instance, academy, notBefore, notAfter } =
                await networkHelpers.loadFixture(deployFixture);

            const [, args] = await issueArgs(ACADEMY_PK, notBefore, notAfter);

            await expect(
                instance.issueAcademyIdentity(EMPTY_PK, args)
            ).to.be.revertedWithCustomError(instance, "InvalidPublicKey");
        });

        it("Should revert on empty academyId", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, academy, notBefore, notAfter } =
                await networkHelpers.loadFixture(deployFixture);

            const [publicKey, args] = await issueArgs(ACADEMY_PK, notBefore, notAfter, { academyId: "" });

            await expect(instance.issueAcademyIdentity(publicKey, args)).to.be.revertedWith(
                "Invalid: academyId is required."
            );
        });

        it("Should revert on empty name", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, academy, notBefore, notAfter } =
                await networkHelpers.loadFixture(deployFixture);

            const [publicKey, args] = await issueArgs(ACADEMY_PK, notBefore, notAfter, { name: "" });

            await expect(instance.issueAcademyIdentity(publicKey, args)).to.be.revertedWith(
                "Invalid: name is empty."
            );
        });

        it("Should revert when name exceeds maximum length", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, academy, notBefore, notAfter } =
                await networkHelpers.loadFixture(deployFixture);

            const tooLongName = "A".repeat(257);
            const [publicKey, args] = await issueArgs(ACADEMY_PK, notBefore, notAfter, { name: tooLongName });

            await expect(instance.issueAcademyIdentity(publicKey, args)).to.be.revertedWith(
                "Invalid: name too long."
            );
        });

        it("Should revert on empty shortName", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, academy, notBefore, notAfter } =
                await networkHelpers.loadFixture(deployFixture);

            const [publicKey, args] = await issueArgs(ACADEMY_PK, notBefore, notAfter, { shortName: "" });

            await expect(instance.issueAcademyIdentity(publicKey, args)).to.be.revertedWith(
                "Invalid: shortName is empty."
            );
        });

        it("Should revert when shortName exceeds maximum length", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, academy, notBefore, notAfter } =
                await networkHelpers.loadFixture(deployFixture);

            const tooLongShort = "S".repeat(257);
            const [publicKey, args] = await issueArgs(ACADEMY_PK, notBefore, notAfter, { shortName: tooLongShort });

            await expect(instance.issueAcademyIdentity(publicKey, args)).to.be.revertedWith(
                "Invalid: shortName too long."
            );
        });

        it("Should revert when academyType is out of range", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, academy, notBefore, notAfter } =
                await networkHelpers.loadFixture(deployFixture);

            const [publicKey, args] = await issueArgs(ACADEMY_PK, notBefore, notAfter, { academyType: 99 });

            await expect(instance.issueAcademyIdentity(publicKey, args)).to.be.revertedWith(
                "Invalid: unknown academyType."
            );
        });

        it("Should revert when proofs.legalName is empty", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, academy, notBefore, notAfter } =
                await networkHelpers.loadFixture(deployFixture);

            const [publicKey, args] = await issueArgs(ACADEMY_PK, notBefore, notAfter, { legalName: "" });

            await expect(instance.issueAcademyIdentity(publicKey, args)).to.be.revertedWith(
                "Invalid proofs: legalName is required."
            );
        });

        it("Should revert when certificate fingerprint is zero", async () => {
            const { networkHelpers, ethers } = await hre.network.connect();
            const { instance, academy, notBefore, notAfter } =
                await networkHelpers.loadFixture(deployFixture);

            const [publicKey, args] = await issueArgs(ACADEMY_PK, notBefore, notAfter, {
                fingerprint: ethers.ZeroHash,
            });

            await expect(instance.issueAcademyIdentity(publicKey, args)).to.be.revertedWith(
                "Invalid certificate: fingerprint is required."
            );
        });

        it("Should revert when certificate is empty", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, academy, notBefore, notAfter } =
                await networkHelpers.loadFixture(deployFixture);

            const [publicKey, args] = await issueArgs(ACADEMY_PK, notBefore, notAfter, { certificatePem: "" });

            await expect(instance.issueAcademyIdentity(publicKey, args)).to.be.revertedWith(
                "Invalid certificate: certificate is empty."
            );
        });

        it("Should revert when notBefore is not set", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, academy, notAfter } =
                await networkHelpers.loadFixture(deployFixture);

            const [publicKey, args] = await issueArgs(ACADEMY_PK, 0, notAfter);

            await expect(instance.issueAcademyIdentity(publicKey, args)).to.be.revertedWith(
                "Invalid certificate: notBefore must be set."
            );
        });

        it("Should revert when notAfter is not greater than notBefore", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, academy } = await networkHelpers.loadFixture(deployFixture);

            const [publicKey, args] = await issueArgs(ACADEMY_PK, 100, 100);

            await expect(instance.issueAcademyIdentity(publicKey, args)).to.be.revertedWith(
                "Invalid certificate: notAfter must be greater than notBefore."
            );
        });
    });

    describe("revokeAcademyIdentity", () => {
        it("Should flip status fields and set revoker to owner after a valid revoke", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, owner, academy } =
                await networkHelpers.loadFixture(deployWithAcademyFixture);

            await instance.connect(owner).revokeAcademyIdentity(ACADEMY_PK, "Reason");

            const record = await instance.academies(ACADEMY_PK);
            expect(record.status.isNotRevoked).to.equal(false);
            expect(record.status.revokedAt).to.be.gt(0);
            expect(record.status.revoker).to.equal(owner.address);
            expect(record.status.issuer).to.equal(owner.address);
            expect(record.status.issuedAt).to.be.gt(0);
            expect(record.status.revocationReason).to.equal("Reason");
        });

        it("Should revert when called by a non-owner", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, fakeOwner, academy } =
                await networkHelpers.loadFixture(deployWithAcademyFixture);

            await expect(
                instance.connect(fakeOwner).revokeAcademyIdentity(ACADEMY_PK, "Reason")
            ).to.be.revertedWith("Not authorized: Only owner can perform this operation.");
        });

        it("Should revert on zero academy public key", async () => {
            const { networkHelpers, ethers } = await hre.network.connect();
            const { instance } = await networkHelpers.loadFixture(deployWithAcademyFixture);

            await expect(
                instance.revokeAcademyIdentity(EMPTY_PK, "Reason")
            ).to.be.revertedWithCustomError(instance, "InvalidPublicKey");
        });

        it("Should revert when the academy was never issued", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, secondAcademy } = await networkHelpers.loadFixture(deployFixture);

            await expect(
                instance.revokeAcademyIdentity(SECOND_ACADEMY_PK, "Reason")
            ).to.be.revertedWithCustomError(instance, "AcademyIdentityNotIssued");
        });

        it("Should revert when called twice on the same academy", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, academy } =
                await networkHelpers.loadFixture(deployWithAcademyFixture);

            await instance.revokeAcademyIdentity(ACADEMY_PK, "Reason");

            await expect(
                instance.revokeAcademyIdentity(ACADEMY_PK, "Reason")
            ).to.be.revertedWithCustomError(instance, "AcademyIdentityAlreadyRevoked");
        });

        it("Should keep the academyId locked after revoke (no reissue with a new public key)", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, academy, secondAcademy, notBefore, notAfter } =
                await networkHelpers.loadFixture(deployWithAcademyFixture);

            await instance.revokeAcademyIdentity(ACADEMY_PK, "Reason");

            await expect(
                instance.issueAcademyIdentity(
                    ...(await issueArgs2(SECOND_ACADEMY_PK, notBefore, notAfter, { academyId: ACADEMY_ID }))
                )
            ).to.be.revertedWithCustomError(instance, "AcademyIdAlreadyUsed");
        });
    });
});
