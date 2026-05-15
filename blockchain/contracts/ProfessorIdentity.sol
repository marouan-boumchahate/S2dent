// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./AcademyIdentity.sol";

contract ProfessorIdentity is AcademyIdentity {
    uint256 private constant MAX_STRING_LENGTH = 256;
    uint256 private constant MIN_EMPLOYEE_ID_LENGTH = 3;
    uint256 private constant MAX_EMPLOYEE_ID_LENGTH = 50;

    // Enums
    enum ProfessorRank {
        AssistProf,
        AssocProf,
        Prof_,
        Lecturer,
        Instructor
    }
    enum EmploymentType {
        full_time,
        part_time,
        adjunct,
        visiting,
        employment_contract
    }

    // Structs
    struct ProfessorIssueArgs {
        string employeeId;
        string nationalId;
        string fullName;
        uint8 rank;
        uint8 employmentType;
        uint256 hireDate;
    }

    // Stored Data Structs
    struct ProfessorIdentityData {
        bytes32 employeeIdHash;
        bytes32 nationalIdHash;
        string fullName;
        ProfessorRank rank;
        EmploymentType employmentType;
        uint256 hireDate;
    }
    struct ProfessorStatusData {
        bool isNotRevoked;
        uint64 issuedAt;
        uint64 revokedAt;
        bytes issuer;
        bytes revoker;
        string revocationReason;
    }
    struct Professor {
        ProfessorIdentityData identity;
        ProfessorStatusData status;
    }

    // Errors
    error ProfessorIdentityAlreadyIssued();
    error ProfessorEmployeeIdAlreadyUsed();
    error ProfessorNationalIdAlreadyUsed();
    error ProfessorIdentityNotIssued();
    error ProfessorIdentityAlreadyRevoked();

    // Events
    event ProfessorIssued(
        bytes indexed professorPublicKey,
        bytes indexed issuerPublicKey,
        bytes32 employeeIdHash,
        uint64 issuedAt
    );
    event ProfessorRevoked(
        bytes indexed professorPublicKey,
        bytes indexed revokerPublicKey,
        uint64 revokedAt
    );

    // Mappers
    mapping(bytes => Professor) public professors;

    // Uniqueness indexes
    mapping(bytes32 => bytes) private professorByEmployeeInAcademyHash;
    mapping(bytes32 => bytes) private professorByNationalIdHash;

    // Validations
    function _validateProfessorInfos(ProfessorIssueArgs calldata i, uint256 currentTime) internal pure {
        _validateStringIsNotShort(i.employeeId, MIN_EMPLOYEE_ID_LENGTH, "Invalid professor: employeeId is too short.");
        _validateStringIsNotLong(i.employeeId, MAX_EMPLOYEE_ID_LENGTH, "Invalid professor: employeeId is too long.");

        _validateStringIsNotEmpty(i.nationalId, "Invalid professor: nationalId is required.");

        _validateStringIsNotEmpty(i.fullName, "Invalid professor: fullName is required.");

        require(i.rank <= uint8(ProfessorRank.Instructor), "Invalid professor: rank out of range.");
        require(
            i.employmentType <= uint8(EmploymentType.employment_contract),
            "Invalid professor: employmentType out of range."
        );

        _validateTime1BeforeTime2(i.hireDate, currentTime, "Invalid professor: hireDate is in the future.");
    }
    function _validateProfessorIssue(
        bytes calldata _publicKey,
        bytes calldata _academyPublicKey,
        ProfessorIssueArgs calldata args,
        uint256 currentTime
    ) internal pure {
        _validatePublicKeySet(_publicKey);
        _validatePublicKeySet(_academyPublicKey);

        _validateProfessorInfos(args, currentTime);
    }

    // External Functions
    function issueProfessorIdentity(
        bytes calldata _publicKey,
        bytes calldata _academyPublicKey,
        ProfessorIssueArgs calldata args
    ) public onlyOwner onlyAcademy(_academyPublicKey) {
        _validateProfessorIssue(_publicKey, _academyPublicKey, args, block.timestamp);

        if (professors[_publicKey].status.issuer.length != 0) {
            revert ProfessorIdentityAlreadyIssued();
        }

        bytes32 employeeIdHash = keccak256(abi.encodePacked(args.employeeId));
        bytes32 nationalIdHash = keccak256(abi.encodePacked(args.nationalId));
        bytes32 employeeInAcademyHash = keccak256(abi.encodePacked(_academyPublicKey, employeeIdHash));

        if (professorByEmployeeInAcademyHash[employeeInAcademyHash].length != 0) {
            revert ProfessorEmployeeIdAlreadyUsed();
        }
        if (professorByNationalIdHash[nationalIdHash].length != 0) {
            revert ProfessorNationalIdAlreadyUsed();
        }

        professors[_publicKey] = Professor({
            identity: ProfessorIdentityData({
                employeeIdHash: employeeIdHash,
                nationalIdHash: nationalIdHash,
                fullName: args.fullName,
                rank: ProfessorRank(args.rank),
                employmentType: EmploymentType(args.employmentType),
                hireDate: args.hireDate
            }),
            status: ProfessorStatusData({
                isNotRevoked: true,
                issuedAt: uint64(block.timestamp),
                revokedAt: 0,
                issuer: _academyPublicKey,
                revoker: "",
                revocationReason: ""
            })
        });

        professorByEmployeeInAcademyHash[employeeInAcademyHash] = _publicKey;
        professorByNationalIdHash[nationalIdHash] = _publicKey;

        emit ProfessorIssued(_publicKey, _academyPublicKey, employeeIdHash, uint64(block.timestamp));
    }

    function revokeProfessorIdentity(
        bytes calldata _publicKey,
        bytes calldata _revokerPublicKey,
        string calldata _reason
    ) public onlyOwner onlyAcademy(_revokerPublicKey) {
        _validatePublicKeySet(_publicKey);

        ProfessorStatusData storage s = professors[_publicKey].status;
        if (s.issuer.length == 0) revert ProfessorIdentityNotIssued();
        if (!s.isNotRevoked) revert ProfessorIdentityAlreadyRevoked();

        require(
            _publicKeysEqual(_revokerPublicKey, s.issuer),
            "Invalid revoker: must be the issuing academy."
        );

        s.isNotRevoked = false;
        s.revokedAt = uint64(block.timestamp);
        s.revoker = _revokerPublicKey;
        s.revocationReason = _reason;

        emit ProfessorRevoked(_publicKey, _revokerPublicKey, s.revokedAt);
    }
}
