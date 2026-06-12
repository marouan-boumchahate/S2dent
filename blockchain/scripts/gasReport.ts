import hre from "hardhat";

async function main() {
    const { ethers } = await hre.network.connect();
    const [owner, academy, professor, student] = await ethers.getSigners();

    const Credential = await ethers.getContractFactory("Credential");
    const instance = await Credential.deploy();
    await instance.waitForDeployment();
    const deployTx = instance.deploymentTransaction();
    const deployReceipt = await deployTx?.wait();
    console.log(`Deploy: ${deployReceipt?.gasUsed.toString()} gas`);

    // 1. issueAcademyIdentity
    const academyTx = await instance.connect(owner).issueAcademyIdentity(academy.address, {
        infos: {
            publicKey: "0x04" + "a1".repeat(64),
            academyId: "ACADEMY001",
            name: "FBU",
            shortName: "FBU",
            academyType: 0,
        },
        proofs: {
            legalName: "FBU Legal",
            registrationNumber: "REG-1",
            taxId: "TAX-1",
            billingEmail: "billing@fbu.edu.tr",
        },
        cert: {
            fingerprint: "0x" + "aa".repeat(32),
            certificate: "CERT",
            chain: "CHAIN",
            notBefore: Math.floor(Date.now() / 1000) - 86400,
            notAfter: Math.floor(Date.now() / 1000) + 31536000,
        },
    });
    const academyReceipt = await academyTx.wait();
    console.log(`issueAcademyIdentity: ${academyReceipt?.gasUsed.toString()} gas`);

    // 2. issueProfessorIdentity
    const professorTx = await instance.connect(owner).issueProfessorIdentity(
        professor.address,
        academy.address,
        {
            publicKey: "0x04" + "b1".repeat(64),
            signature: "0x" + "11".repeat(65),
            employeeId: "PROF-1",
            nationalId: "NAT-PROF-1",
            fullName: "Ada Lovelace",
            rank: 1,
            employmentType: 0,
            hireDate: Math.floor(Date.now() / 1000) - 86400,
        }
    );
    const professorReceipt = await professorTx.wait();
    console.log(`issueProfessorIdentity: ${professorReceipt?.gasUsed.toString()} gas`);

    // 3. issueStudentIdentity
    const studentTx = await instance.connect(owner).issueStudentIdentity(
        student.address,
        academy.address,
        {
            publicKey: "0x04" + "c1".repeat(64),
            signature: "0x" + "51".repeat(65),
            studentId: "STD-1",
            fullName: "Marouan B",
            nationality: "Moroccan",
            department: "Computer Science",
            country: "Turkey",
            nationalId: "NAT-STD-1",
            enrollmentDate: Math.floor(Date.now() / 1000) - 30 * 86400,
        }
    );
    const studentReceipt = await studentTx.wait();
    console.log(`issueStudentIdentity: ${studentReceipt?.gasUsed.toString()} gas`);

    // 4. issueCredential
    const credentialTx = await instance.connect(owner).issueCredential(
        student.address,
        academy.address,
        academy.address,
        {
            infos: {
                title: "BSc Computer Science",
                code: "CS-101",
                credentialType: 2, // degree
                description: "Computer Science Degree",
            },
            payload: {
                payloadHash: "0x" + "dd".repeat(32),
                encryptedPayload: "ENCRYPTED_PAYLOAD",
            },
            signature: "0x" + "71".repeat(65),
        }
    );
    const credentialReceipt = await credentialTx.wait();
    console.log(`issueCredential: ${credentialReceipt?.gasUsed.toString()} gas`);

    // 5. revokeCredential
    const revokeCredentialTx = await instance.connect(owner).revokeCredential(
        student.address,
        0,
        academy.address,
        "Revocation Reason"
    );
    const revokeCredentialReceipt = await revokeCredentialTx.wait();
    console.log(`revokeCredential: ${revokeCredentialReceipt?.gasUsed.toString()} gas`);

    // 6. revokeStudentIdentity
    const revokeStudentTx = await instance.connect(owner).revokeStudentIdentity(
        student.address,
        academy.address,
        "Revocation Reason"
    );
    const revokeStudentReceipt = await revokeStudentTx.wait();
    console.log(`revokeStudentIdentity: ${revokeStudentReceipt?.gasUsed.toString()} gas`);

    // 7. revokeProfessorIdentity
    const revokeProfTx = await instance.connect(owner).revokeProfessorIdentity(
        professor.address,
        academy.address,
        "Revocation Reason"
    );
    const revokeProfReceipt = await revokeProfTx.wait();
    console.log(`revokeProfessorIdentity: ${revokeProfReceipt?.gasUsed.toString()} gas`);

    // 8. revokeAcademyIdentity
    const revokeAcademyTx = await instance.connect(owner).revokeAcademyIdentity(
        academy.address,
        "Revocation Reason"
    );
    const revokeAcademyReceipt = await revokeAcademyTx.wait();
    console.log(`revokeAcademyIdentity: ${revokeAcademyReceipt?.gasUsed.toString()} gas`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
