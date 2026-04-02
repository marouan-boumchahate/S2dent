import { expect } from "chai";
import hre from "hardhat";

describe("AcademyIdentity", () => {
    const ACADEMY_ID = "ACD_0000161";
    const ACADEMY_NAME = "Fenerbahçe University";
    const SHORT_NAME = "FBU";
    const ACADEMY_TYPE = 0;
    const DESCRIPTION = "A sample academy for tests.";
    const WEBSITE = "https://example.edu";
    const LOGO_URL = "https://example.edu/logo.png";
    const EMAIL = "contact@example.edu";
    const PHONE = "+90 212 000 0000";
    const LEGAL_NAME = "Fenerbahçe University Foundation";
    const REGISTRATION_NUMBER = "REG-12345";
    const TAX_ID = "TAX-67890";
    const BILLING_EMAIL = "billing@example.edu";

    const ADDRESS_LINE1 = "Building A";
    const ADDRESS_LINE2 = "Campus North";
    const STREET = "Test Street 1";
    const DISTRICT = "Kadıköy";
    const STATE = "Istanbul";
    const POSTAL_CODE = "34710";
    const CITY = "Istanbul";
    const COUNTRY = "Turkey";
    const LATITUDE = "41.0082";
    const LONGITUDE = "28.9784";

    const FINGERPRINT =
        "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
    const CERTIFICATE_PEM =
        "-----BEGIN CERTIFICATE-----\nMIIBsample\n-----END CERTIFICATE-----\n";
    const CHAIN_PEM =
        "-----BEGIN CERTIFICATE-----\nMIIBchain\n-----END CERTIFICATE-----\n";

    const ONE_DAY_SECS = 86_400;
    const ONE_YEAR_SECS = 365 * ONE_DAY_SECS;

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

    function issueArgs(
        wallet: string,
        notBefore: bigint | number,
        notAfter: bigint | number,
        overrides?: Partial<{
            academyId: string;
            name: string;
            shortName: string;
            academyType: number;
            description: string;
            website: string;
            logoUrl: string;
            email: string;
            phone: string;
            legalName: string;
            registrationNumber: string;
            taxId: string;
            billingEmail: string;
            addressLine1: string;
            addressLine2: string;
            street: string;
            district: string;
            state: string;
            postalCode: string;
            city: string;
            country: string;
            latitude: string;
            longitude: string;
            fingerprint: string;
            certificatePem: string;
            chainPem: string;
        }>
    ) {
        const o = {
            academyId: ACADEMY_ID,
            name: ACADEMY_NAME,
            shortName: SHORT_NAME,
            academyType: ACADEMY_TYPE,
            description: DESCRIPTION,
            website: WEBSITE,
            logoUrl: LOGO_URL,
            email: EMAIL,
            phone: PHONE,
            legalName: LEGAL_NAME,
            registrationNumber: REGISTRATION_NUMBER,
            taxId: TAX_ID,
            billingEmail: BILLING_EMAIL,
            addressLine1: ADDRESS_LINE1,
            addressLine2: ADDRESS_LINE2,
            street: STREET,
            district: DISTRICT,
            state: STATE,
            postalCode: POSTAL_CODE,
            city: CITY,
            country: COUNTRY,
            latitude: LATITUDE,
            longitude: LONGITUDE,
            fingerprint: FINGERPRINT,
            certificatePem: CERTIFICATE_PEM,
            chainPem: CHAIN_PEM,
            ...overrides,
        };

        return [
            wallet,
            o.academyId,
            o.name,
            o.shortName,
            o.academyType,
            o.description,
            o.website,
            o.logoUrl,
            o.email,
            o.phone,
            o.legalName,
            o.registrationNumber,
            o.taxId,
            o.billingEmail,
            o.addressLine1,
            o.addressLine2,
            o.street,
            o.district,
            o.state,
            o.postalCode,
            o.city,
            o.country,
            o.latitude,
            o.longitude,
            o.fingerprint,
            o.certificatePem,
            o.chainPem,
            BigInt(notBefore),
            BigInt(notAfter),
        ] as const;
    }

    async function deployWithAcademyFixture() {
        const { networkHelpers } = await hre.network.connect();
        const base = await networkHelpers.loadFixture(deployFixture);
        const { instance, academy, notBefore, notAfter } = base;

        await instance.issueAcademyIdentity(...issueArgs(academy.address, notBefore, notAfter));

        return base;
    }

    describe("issueAcademyIdentity", () => {
        it("Should store all fields correctly after a valid issuance", async () => {
            const { networkHelpers, ethers } = await hre.network.connect();
            const { instance, owner, academy, notBefore, notAfter } =
                await networkHelpers.loadFixture(deployFixture);

            await instance.issueAcademyIdentity(...issueArgs(academy.address, notBefore, notAfter));

            const record = await instance.academies(academy.address);

            expect(record.academyId).to.equal(ACADEMY_ID);
            expect(record.name).to.equal(ACADEMY_NAME);
            expect(record.shortName).to.equal(SHORT_NAME);
            expect(record.academyType).to.equal(BigInt(ACADEMY_TYPE));
            expect(record.description).to.equal(DESCRIPTION);
            expect(record.website).to.equal(WEBSITE);
            expect(record.logoUrl).to.equal(LOGO_URL);
            expect(record.email).to.equal(EMAIL);
            expect(record.phone).to.equal(PHONE);
            expect(record.legalName).to.equal(LEGAL_NAME);
            expect(record.registrationNumber).to.equal(REGISTRATION_NUMBER);
            expect(record.taxId).to.equal(TAX_ID);
            expect(record.billingEmail).to.equal(BILLING_EMAIL);
            expect(record.addressLine1).to.equal(ADDRESS_LINE1);
            expect(record.addressLine2).to.equal(ADDRESS_LINE2);
            expect(record.street).to.equal(STREET);
            expect(record.district).to.equal(DISTRICT);
            expect(record.state).to.equal(STATE);
            expect(record.postalCode).to.equal(POSTAL_CODE);
            expect(record.city).to.equal(CITY);
            expect(record.country).to.equal(COUNTRY);
            expect(record.latitude).to.equal(LATITUDE);
            expect(record.longitude).to.equal(LONGITUDE);
            expect(record.fingerprint).to.equal(FINGERPRINT);
            expect(record.certificatePem).to.equal(CERTIFICATE_PEM);
            expect(record.chainPem).to.equal(CHAIN_PEM);
            expect(record.notBefore).to.equal(notBefore);
            expect(record.notAfter).to.equal(notAfter);
            expect(record.isNotRevoked).to.equal(true);
            expect(record.revokedAt).to.equal(0);
            expect(record.issuer).to.equal(owner.address);
            expect(record.revoker).to.equal(ethers.ZeroAddress);
            expect(record.issuedAt).to.be.gt(0);
        });

        it("Should persist academyId string as provided", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, academy, notBefore, notAfter } =
                await networkHelpers.loadFixture(deployFixture);

            const customId = "ACADEMY00002";
            await instance.issueAcademyIdentity(
                ...issueArgs(academy.address, notBefore, notAfter, { academyId: customId })
            );

            const record = await instance.academies(academy.address);
            expect(record.academyId).to.equal(customId);
        });

        it("Should revert when called by a non-owner", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, fakeOwner, academy, notBefore, notAfter } =
                await networkHelpers.loadFixture(deployFixture);

            await expect(
                instance.connect(fakeOwner).issueAcademyIdentity(
                    ...issueArgs(academy.address, notBefore, notAfter)
                )
            ).to.be.revertedWith("Not authorized: Only owner can perform this operation.");
        });

        it("Should overwrite an existing record on re-issuance", async () => {
            const { networkHelpers } = await hre.network.connect();
            const { instance, academy, notBefore, notAfter } =
                await networkHelpers.loadFixture(deployWithAcademyFixture);

            await instance.issueAcademyIdentity(
                ...issueArgs(academy.address, notBefore, notAfter, {
                    name: "Renamed University",
                    shortName: "RNU",
                })
            );

            const record = await instance.academies(academy.address);
            expect(record.name).to.equal("Renamed University");
            expect(record.shortName).to.equal("RNU");
        });
    });
});
