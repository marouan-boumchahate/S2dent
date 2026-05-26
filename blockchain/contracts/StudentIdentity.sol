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
        bytes publicKey;
        bytes signature;
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
        bytes publicKey;
        bytes signature;
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
        address issuer;
        address revoker;
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
        address indexed studentAddress,
        address indexed issuerAddress, // => academy address <=
        bytes32 studentIdHash,
        uint64 issuedAt
    );
    event StudentRevoked(
        address indexed studentAddress,
        address indexed revokerAddress, // => academy address <=
        uint64 revokedAt
    );

    // Mappers
    mapping(address => Student) public students;

    // Uniqueness indexes
    mapping(bytes32 => address) private studentByIdInAcademyHash;
    mapping(bytes32 => address) private studentByNationalIdHash;
    
    // Validations
    function _validateStudentInfos(StudentIssueArgs calldata i, uint256 _currentTime) internal pure {
        _validatePublicKeySet(i.publicKey);
        _validateSignatureSet(i.signature);

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
        address _studentAddress,
        address _academyAddress,
        StudentIssueArgs calldata args,
        uint256 _currentTime
    ) internal pure {
        _validateAddressSet(_studentAddress);
        _validateAddressSet(_academyAddress);

        _validateStudentInfos(args, _currentTime);
    }

    // External / Public Functions
    function issueStudentIdentity(
        address _studentAddress,
        address _academyAddress,
        StudentIssueArgs calldata args
    ) public onlyOwner onlyAcademy(_academyAddress) {
        _validateStudentIssue(_studentAddress, _academyAddress, args, block.timestamp);

        // Student Uniqueness checks
        if (students[_studentAddress].status.issuer != address(0)) {
            revert StudentIdentityAlreadyIssued();
        }

        bytes32 studentIdHash = keccak256(abi.encodePacked(args.studentId));
        bytes32 nationalIdHash = keccak256(abi.encodePacked(args.nationalId));
        bytes32 studentInAcademyHash = keccak256(abi.encodePacked(_academyAddress, studentIdHash));

        if (studentByIdInAcademyHash[studentInAcademyHash] != address(0)) {
            revert StudentIdAlreadyUsed();
        }
        if (studentByNationalIdHash[nationalIdHash] != address(0)) {
            revert StudentNationalIdAlreadyUsed();
        }

        string memory academyName = academies[_academyAddress].identity.name;

        students[_studentAddress] = Student({
            identity: StudentIdentityData({
                studentIdHash: studentIdHash,
                nationalIdHash: nationalIdHash,
                publicKey: args.publicKey,
                signature: args.signature,
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
                issuer: _academyAddress,
                revoker: address(0),
                revocationReason: ""
            })
        });

        studentByIdInAcademyHash[studentInAcademyHash] = _studentAddress;
        studentByNationalIdHash[nationalIdHash] = _studentAddress;

        emit StudentIssued(_studentAddress, _academyAddress, studentIdHash, uint64(block.timestamp));
    }

    function revokeStudentIdentity(
        address _studentAddress,
        address _revokerAddress,
        string calldata _reason
    ) public onlyOwner onlyAcademy(_revokerAddress) {
        _validateAddressSet(_studentAddress);

        StudentStatusData storage s = students[_studentAddress].status;
        if (s.issuer == address(0)) revert StudentIdentityNotIssued();
        if (!s.isNotRevoked) revert StudentIdentityAlreadyRevoked();

        require(
            _revokerAddress == s.issuer,
            "Invalid revoker: must be the issuing academy."
        );

        s.isNotRevoked = false;
        s.revokedAt = uint64(block.timestamp);
        s.revoker = _revokerAddress;
        s.revocationReason = _reason;

        emit StudentRevoked(_studentAddress, _revokerAddress, s.revokedAt);
    }
}
