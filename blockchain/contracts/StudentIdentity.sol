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
        string nationalId;
        string nationality;

        string department;
        string country;

        uint256 enrollmentDate;
    }

    struct StudentIdentityData {
        bytes32 studentIdHash;
        bytes32 nationalIdHash;
        string fullName;

        string nationality;
        string academyName;
        string department;
        string country;
        uint256 enrollmentDate;
    }
    struct StudentStatusData {
        bool isNotRevoked;
        uint64 issuedAt;
        uint64 revokedAt;
        bytes issuer;
        bytes revoker;
        string revocationReason;
    }
    struct Student {
        StudentIdentityData identity;
        StudentStatusData status;
    }

    // Errors
    error StudentIdentityAlreadyIssued();
    error StudentIdAlreadyUsed();
    error StudentNationalIdAlreadyUsed();
    error StudentIdentityNotIssued();
    error StudentIdentityAlreadyRevoked();

    // Events
    event StudentIssued(
        bytes indexed studentPublicKey,
        bytes indexed issuerPublicKey, // => academy public key <=
        bytes32 studentIdHash,
        uint64 issuedAt
    );
    event StudentRevoked(
        bytes indexed studentPublicKey,
        bytes indexed revokerPublicKey, // => academy public key <=
        uint64 revokedAt
    );

    // Mappers
    mapping(bytes => Student) public students;

    // Uniqueness indexes
    mapping(bytes32 => bytes) private studentByIdInAcademyHash;
    mapping(bytes32 => bytes) private studentByNationalIdHash;
    
    // Validations
    function _validateStudentInfos(StudentIssueArgs calldata i, uint256 _currentTime) internal pure {
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

        _validateTime1BeforeTime2(i.enrollmentDate, _currentTime, "Invalid student: enrollmentDate cannot be in the future.");
    }
    function _validateStudentIssue(
        bytes calldata _publicKey,
        bytes calldata _academyPublicKey,
        StudentIssueArgs calldata args,
        uint256 _currentTime
    ) internal pure {
        _validatePublicKeySet(_publicKey);
        _validatePublicKeySet(_academyPublicKey);

        _validateStudentInfos(args, _currentTime);
    }

    // External / Public Functions
    function issueStudentIdentity(
        bytes calldata _publicKey,
        bytes calldata _academyPublicKey,
        StudentIssueArgs calldata args
    ) public onlyOwner onlyAcademy(_academyPublicKey) {
        _validateStudentIssue(_publicKey, _academyPublicKey, args, block.timestamp);

        // Student Uniqueness checks
        if (students[_publicKey].status.issuer.length != 0) {
            revert StudentIdentityAlreadyIssued();
        }

        bytes32 studentIdHash = keccak256(abi.encodePacked(args.studentId));
        bytes32 nationalIdHash = keccak256(abi.encodePacked(args.nationalId));
        bytes32 studentInAcademyHash = keccak256(abi.encodePacked(_academyPublicKey, studentIdHash));

        if (studentByIdInAcademyHash[studentInAcademyHash].length != 0) {
            revert StudentIdAlreadyUsed();
        }
        if (studentByNationalIdHash[nationalIdHash].length != 0) {
            revert StudentNationalIdAlreadyUsed();
        }

        string memory academyName = academies[_academyPublicKey].identity.name;

        students[_publicKey] = Student({
            identity: StudentIdentityData({
                studentIdHash: studentIdHash,
                nationalIdHash: nationalIdHash,
                fullName: args.fullName,
                nationality: args.nationality,
                academyName: academyName,
                department: args.department,
                country: args.country,
                enrollmentDate: args.enrollmentDate
            }),
            status: StudentStatusData({
                isNotRevoked: true,
                issuedAt: uint64(block.timestamp),
                revokedAt: 0,
                issuer: _academyPublicKey,
                revoker: "",
                revocationReason: ""
            })
        });

        studentByIdInAcademyHash[studentInAcademyHash] = _publicKey;
        studentByNationalIdHash[nationalIdHash] = _publicKey;

        emit StudentIssued(_publicKey, _academyPublicKey, studentIdHash, uint64(block.timestamp));
    }

    function revokeStudentIdentity(
        bytes calldata _publicKey,
        bytes calldata _revokerPublicKey,
        string calldata _reason
    ) public onlyOwner onlyAcademy(_revokerPublicKey) {
        _validatePublicKeySet(_publicKey);

        StudentStatusData storage s = students[_publicKey].status;
        if (s.issuer.length == 0) revert StudentIdentityNotIssued();
        if (!s.isNotRevoked) revert StudentIdentityAlreadyRevoked();

        require(
            _publicKeysEqual(_revokerPublicKey, s.issuer),
            "Invalid revoker: must be the issuing academy."
        );

        s.isNotRevoked = false;
        s.revokedAt = uint64(block.timestamp);
        s.revoker = _revokerPublicKey;
        s.revocationReason = _reason;

        emit StudentRevoked(_publicKey, _revokerPublicKey, s.revokedAt);
    }
}
