import { expect } from "chai";
import hre from "hardhat";

describe("Professor", () => {
    async function deployFixture() {
        const { ethers } = await hre.network.connect();

        const [ owner, fakeOwner, academy, fakeAcademy, professor ] = await ethers.getSigners();

        const ProfessorIdentity = await ethers.getContractFactory("ProfessorIdentity");
        const instance = await ProfessorIdentity.deploy();

        await instance.waitForDeployment();

        return { instance, owner, academy, professor, fakeAcademy, fakeOwner };
    }

    async function deployWithAcademyFixture() {
        const { networkHelpers } = await hre.network.connect();
        const baseFixture = await networkHelpers.loadFixture(deployFixture);

        const { instance, academy } = baseFixture;

        await instance.issueAcademyIdentity(
            academy.address,
            "ACADEMY001",
            "Fenerbahçe University",
            "FBU"
        );

        return baseFixture;
    }


    it("Should allow the owner to issue an academy identity", async () => {
        const { networkHelpers } = await hre.network.connect();
        const { instance, owner, academy } = await networkHelpers.loadFixture(deployFixture);

        await instance.issueAcademyIdentity(
            academy.address,
            "ACADEMY001",
            "Fenerbahçe University",
            "FBU"
        );
        const academyIdentity = await instance.academies(academy.address);

        expect(academyIdentity.isActive).to.equal(true);
        expect(academyIdentity.revokedAt).to.equal(0);
        expect(academyIdentity.issuedBy).to.equal(owner.address);
        expect(academyIdentity.name).to.equal("Fenerbahçe University");
        expect(academyIdentity.code).to.equal("FBU");
    });

    it("Should not allow non-owners to issue an academy identity", async () => {
        const { networkHelpers } = await hre.network.connect();
        const { instance, fakeOwner, academy } = await networkHelpers.loadFixture(deployFixture);

        await expect(
            instance.connect(fakeOwner).issueAcademyIdentity(
                academy.address,
                "ACADEMY001",
                "Fenerbahçe University",
                "FBU"
            )
        ).to.be.revertedWith(
            "Not authorized: Only owner can perform this operation."
        );
    });

    it("Should allow the academy to issue a professor identity", async () => {
        const { networkHelpers } = await hre.network.connect();
        const { instance, academy, professor } = await networkHelpers.loadFixture(deployWithAcademyFixture);

        await instance.connect(academy)
            .issueProfessorIdentity(
                professor.address,
                "PROF001",
                "Osman Selvi",
                "Dr.",
                "Computer Science",
                "Engineering",
                academy.address
            );
        const professorIdentity = await instance.professors(professor.address);

        expect(professorIdentity.isActive).to.equal(true);
        expect(professorIdentity.revokedAt).to.equal(0);
        expect(professorIdentity.issuedBy).to.equal(academy.address);
        expect(professorIdentity.fullName).to.equal("Osman Selvi");
    });

    it("Should not allow non-academies to issue a professor identity", async () => {
        const { networkHelpers } = await hre.network.connect();
        const { instance, fakeAcademy, professor } = await networkHelpers.loadFixture(deployFixture);

        await expect(
            instance.connect(fakeAcademy)
                .issueProfessorIdentity(
                    professor.address,
                    "PROF001",
                    "Osman Selvi",
                    "Dr.",
                    "Computer Science",
                    "Engineering",
                    fakeAcademy.address
                )
        ).to.be.revertedWith(
            "Not Authorized: Only active academies can perform this operation."
        );

    });
});
