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
        bytes publicKey;
        bytes signature;
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
        bytes publicKey;
        bytes signature;
        string fullName;
        ProfessorRank rank;
        EmploymentType employmentType;
        uint256 hireDate;
    }
    struct ProfessorStatusData {
        bool isNotRevoked;
        uint64 issuedAt;
        uint64 revokedAt;
        address issuer;
        address revoker;
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
        address indexed professorAddress,
        address indexed issuerAddress,
        bytes32 employeeIdHash,
        uint64 issuedAt
    );
    event ProfessorRevoked(
        address indexed professorAddress,
        address indexed revokerAddress,
        uint64 revokedAt
    );

    // Mappers
    mapping(address => Professor) public professors;

    // Uniqueness indexes
    mapping(bytes32 => address) private professorByEmployeeInAcademyHash;
    mapping(bytes32 => address) private professorByNationalIdHash;

    // Validations
    function _validateProfessorInfos(ProfessorIssueArgs calldata i, uint256 currentTime) internal pure {
        _validatePublicKeySet(i.publicKey);
        _validateSignatureSet(i.signature);

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
        address _professorAddress,
        address _academyAddress,
        ProfessorIssueArgs calldata args,
        uint256 currentTime
    ) internal pure {
        _validateAddressSet(_professorAddress);
        _validateAddressSet(_academyAddress);

        _validateProfessorInfos(args, currentTime);
    }

    // External Functions
    function issueProfessorIdentity(
        address _professorAddress,
        address _academyAddress,
        ProfessorIssueArgs calldata args
    ) public onlyOwner onlyAcademy(_academyAddress) {
        _validateProfessorIssue(_professorAddress, _academyAddress, args, block.timestamp);

        if (professors[_professorAddress].status.issuer != address(0)) {
            revert ProfessorIdentityAlreadyIssued();
        }

        bytes32 employeeIdHash = keccak256(abi.encodePacked(args.employeeId));
        bytes32 nationalIdHash = keccak256(abi.encodePacked(args.nationalId));
        bytes32 employeeInAcademyHash = keccak256(abi.encodePacked(_academyAddress, employeeIdHash));

        if (professorByEmployeeInAcademyHash[employeeInAcademyHash] != address(0)) {
            revert ProfessorEmployeeIdAlreadyUsed();
        }
        if (professorByNationalIdHash[nationalIdHash] != address(0)) {
            revert ProfessorNationalIdAlreadyUsed();
        }

        professors[_professorAddress] = Professor({
            identity: ProfessorIdentityData({
                employeeIdHash: employeeIdHash,
                nationalIdHash: nationalIdHash,
                publicKey: args.publicKey,
                signature: args.signature,
                fullName: args.fullName,
                rank: ProfessorRank(args.rank),
                employmentType: EmploymentType(args.employmentType),
                hireDate: args.hireDate
            }),
            status: ProfessorStatusData({
                isNotRevoked: true,
                issuedAt: uint64(block.timestamp),
                revokedAt: 0,
                issuer: _academyAddress,
                revoker: address(0),
                revocationReason: ""
            })
        });

        professorByEmployeeInAcademyHash[employeeInAcademyHash] = _professorAddress;
        professorByNationalIdHash[nationalIdHash] = _professorAddress;

        emit ProfessorIssued(_professorAddress, _academyAddress, employeeIdHash, uint64(block.timestamp));
    }

    function revokeProfessorIdentity(
        address _professorAddress,
        address _revokerAddress,
        string calldata _reason
    ) public onlyOwner onlyAcademy(_revokerAddress) {
        _validateAddressSet(_professorAddress);

        ProfessorStatusData storage s = professors[_professorAddress].status;
        if (s.issuer == address(0)) revert ProfessorIdentityNotIssued();
        if (!s.isNotRevoked) revert ProfessorIdentityAlreadyRevoked();

        require(
            _revokerAddress == s.issuer,
            "Invalid revoker: must be the issuing academy."
        );

        s.isNotRevoked = false;
        s.revokedAt = uint64(block.timestamp);
        s.revoker = _revokerAddress;
        s.revocationReason = _reason;

        emit ProfessorRevoked(_professorAddress, _revokerAddress, s.revokedAt);
    }
}
