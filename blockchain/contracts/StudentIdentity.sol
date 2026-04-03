// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./ProfessorIdentity.sol";

contract StudentIdentity is ProfessorIdentity {
    uint256 private constant MAX_STRING_LENGTH = 256;
    uint256 private constant MIN_STRING_LENGTH = 3;
    uint256 private constant MIN_STUDENT_ID_LENGTH = 3;
    uint256 private constant MAX_STUDENT_ID_LENGTH = 20;

    // Structs
    struct StudentIssueArgs {
        string studentId;
        string fullName;
        string nationality;
        string department;
        string country;
    }

    struct StudentIdentityData {
        bytes32 studentIdHash;
        string fullName;
        string nationality;
        string academyName;
        string department;
        string country;
    }
    struct StudentStatusData {
        bool isNotRevoked;
        uint64 issuedAt;
        uint64 revokedAt;
        address issuer;
        address revoker;
    }
    struct Student {
        StudentIdentityData identity;
        StudentStatusData status;
    }

    // Errors
    error StudentIdentityAlreadyIssued();
    error StudentIdAlreadyUsed();

    // Mappers
    mapping(address => Student) public students;

    // Uniqueness indexes
    mapping(bytes32 => address) private studentByIdInAcademyHash;

    // Validations
    function _validateStudentInfos(StudentIssueArgs calldata i) internal pure {
        _validateStringIsNotShort(i.studentId, MIN_STUDENT_ID_LENGTH, "Invalid student: studentId is too short.");
        _validateStringIsNotLong(i.studentId, MAX_STUDENT_ID_LENGTH, "Invalid student: studentId is too long.");

        _validateStringIsNotEmpty(i.fullName, "Invalid student: fullName is required.");
        _validateStringIsNotLong(i.fullName, MAX_STRING_LENGTH, "Invalid student: fullName is too long.");

        _validateStringIsNotShort(i.nationality, MIN_STRING_LENGTH, "Invalid student: nationality is too short.");
        _validateStringIsNotLong(i.nationality, MAX_STRING_LENGTH, "Invalid student: nationality is too long.");

        _validateStringIsNotEmpty(i.department, "Invalid student: department is required.");
        _validateStringIsNotLong(i.department, MAX_STRING_LENGTH, "Invalid student: department is too long.");

        _validateStringIsNotEmpty(i.country, "Invalid student: country is required.");
        _validateStringIsNotLong(i.country, MAX_STRING_LENGTH, "Invalid student: country is too long.");
    }
    function _validateStudentIssue(
        address _walletAddress,
        address _academyAddress,
        StudentIssueArgs calldata args
    ) internal pure {
        _validateWalletAddressSet(_walletAddress);
        _validateWalletAddressSet(_academyAddress);

        _validateStudentInfos(args);
    }

    // External / Public Functions
    function issueStudentIdentity(
        address _walletAddress,
        address _academyAddress,
        StudentIssueArgs calldata args
    ) public onlyOwner onlyAcademy(_academyAddress) {
        _validateStudentIssue(_walletAddress, _academyAddress, args);

        if (students[_walletAddress].status.issuer != address(0)) {
            revert StudentIdentityAlreadyIssued();
        }

        bytes32 studentIdHash = keccak256(abi.encodePacked(args.studentId));
        bytes32 studentInAcademyHash = keccak256(abi.encodePacked(_academyAddress, studentIdHash));

        if (studentByIdInAcademyHash[studentInAcademyHash] != address(0)) {
            revert StudentIdAlreadyUsed();
        }

        string memory academyName = academies[_academyAddress].identity.name;

        students[_walletAddress] = Student({
            identity: StudentIdentityData({
                studentIdHash: studentIdHash,
                fullName: args.fullName,
                nationality: args.nationality,
                academyName: academyName,
                department: args.department,
                country: args.country
            }),
            status: StudentStatusData({
                isNotRevoked: true,
                issuedAt: uint64(block.timestamp),
                revokedAt: 0,
                issuer: _academyAddress,
                revoker: address(0)
            })
        });

        studentByIdInAcademyHash[studentInAcademyHash] = _walletAddress;
    }
}