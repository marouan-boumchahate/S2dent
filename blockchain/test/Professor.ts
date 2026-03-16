import { expect } from "chai";
import hre from "hardhat";

describe("Professor", () => {
    async function deployFixture() {
        const { ethers } = await hre.network.connect();

        const [ owner, admin, professor, fakeAdmin ] = await ethers.getSigners();

        const ProfessorRegistry = await ethers.getContractFactory("ProfessorRegistry");
        const instance = await ProfessorRegistry.deploy();

        await instance.waitForDeployment();

        const Role = {
            professor: 0,
            admin: 1
        }

        return { instance, owner, admin, professor, fakeAdmin, Role };
    }

    async function deployWithAdminFixture() {
        const { networkHelpers } = await hre.network.connect();
        const baseFixture = await networkHelpers.loadFixture(deployFixture);

        const { instance, admin, Role } = baseFixture;

        await instance.addMainAdmin(
            "001",
            admin.address,
            true
        );

        return baseFixture;
        
    }


    it("Should allow the owner to add the main admin", async () => {
        const { networkHelpers } = await hre.network.connect();
        const { instance, owner, admin, Role } = await networkHelpers.loadFixture(deployFixture);

        await instance.addMainAdmin(
            "001",
            admin.address,
            true
        );
        const adminData = await instance.professors(admin.address);

        expect(adminData.isActive).to.equal(true);
        expect(Number(adminData.role)).to.equal(Role.admin);
        expect(adminData.createdBy).to.equal(owner.address);
    });

    it("Should not allow non-owners to add the main admin", async () => {
        const { networkHelpers } = await hre.network.connect();
        const { instance, admin } = await networkHelpers.loadFixture(deployFixture);

        await expect(
            instance.connect(admin).addMainAdmin(
                "001",
                admin.address,
                true
            )
        ).to.be.revertedWith("Not authorized: Only owner can perform this operation.");
    });

    it("Should allow the admin to add a professor", async () => {
        const { networkHelpers } = await hre.network.connect();
        const { instance, admin, professor, Role } = await networkHelpers.loadFixture(deployWithAdminFixture);

        await instance.connect(admin)
            .addNewProfessor(
                "002",
                professor.address,
                true,
                Role.professor,
                admin.address
            );
        const professorData = await instance.professors(professor.address);

        expect(professorData.isActive).to.equal(true);
        expect(Number(professorData.role)).to.equal(Role.professor);
        expect(professorData.createdBy).to.equal(admin.address);
    });

    it("Should not allow non-admins to add a professor", async () => {
        const { networkHelpers } = await hre.network.connect();
        const { instance, fakeAdmin, professor, Role } = await networkHelpers.loadFixture(deployFixture);

        await expect(
            instance.connect(fakeAdmin)
                .addNewProfessor(
                    "003",
                    professor.address,
                    true,
                    Role.professor,
                    fakeAdmin.address
                )
        ).to.be.revertedWith("Not authorized: Only admins can perform this action.");

    });
});
