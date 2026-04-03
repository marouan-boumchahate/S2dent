// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./AcademyIdentity.sol";

contract ProfessorIdentity is AcademyIdentity {
    uint256 private constant MAX_STRING_LENGTH = 256;
    uint256 private constant MIN_EMPLOYEE_ID_LENGTH = 3;
    uint256 private constant MAX_EMPLOYEE_ID_LENGTH = 50;

    // Enums
    enum Gender {
        male,
        female
    }
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
        string full_name;
        uint8 rank;
        uint8 employmentType;
    }

    // Stored Data Structs
    struct ProfessorIdentityData {
        bytes32 employeeIdHash;
        bytes32 nationalIdHash;
        string fullName;
        ProfessorRank rank;
        EmploymentType employmentType;
    }
    struct ProfessorStatusData {
        bool isNotRevoked;
        uint64 issuedAt;
        uint64 revokedAt;
        address issuer;
        address revoker;
    }
    struct Professor {
        ProfessorIdentityData identity;
        ProfessorStatusData status;
    }

    // Errors
    error ProfessorIdentityAlreadyIssued();
    error ProfessorEmployeeIdAlreadyUsed();
    error ProfessorNationalIdAlreadyUsed();

    // Mappers
    mapping(address => Professor) public professors;

    // Uniqueness indexes
    mapping(bytes32 => address) private professorByEmployeeInAcademyHash;
    mapping(bytes32 => address) private professorByNationalIdHash;

    // Validations
    function _validateProfessorInfos(ProfessorIssueArgs calldata i) internal pure {
        _validateStringIsNotShort(i.employeeId, MIN_EMPLOYEE_ID_LENGTH, "Invalid professor: employeeId is too short.");
        _validateStringIsNotLong(i.employeeId, MAX_EMPLOYEE_ID_LENGTH, "Invalid professor: employeeId is too long.");

        _validateStringIsNotEmpty(i.nationalId, "Invalid professor: nationalId is required.");

        _validateStringIsNotEmpty(i.full_name, "Invalid professor: full_name is required.");

        require(i.rank <= uint8(ProfessorRank.Instructor), "Invalid professor: rank out of range.");
        require(
            i.employmentType <= uint8(EmploymentType.employment_contract),
            "Invalid professor: employmentType out of range."
        );
    }
    function _validateProfessorIssue(
        address _walletAddress,
        address _academyAddress,
        ProfessorIssueArgs calldata args
    ) internal pure {
        _validateWalletAddressSet(_walletAddress);
        _validateWalletAddressSet(_academyAddress);

        _validateProfessorInfos(args);
    }

    // External Functions
    function issueProfessorIdentity(
        address _walletAddress,
        address _academyAddress,
        ProfessorIssueArgs calldata args
    ) public onlyOwner onlyAcademy(_academyAddress) {
        _validateProfessorIssue(_walletAddress, _academyAddress, args);

        if (professors[_walletAddress].status.issuer != address(0)) {
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

        professors[_walletAddress] = Professor({
            identity: ProfessorIdentityData({
                employeeIdHash: employeeIdHash,
                nationalIdHash: nationalIdHash,
                fullName: args.full_name,
                rank: ProfessorRank(args.rank),
                employmentType: EmploymentType(args.employmentType)
            }),
            status: ProfessorStatusData({
                isNotRevoked: true,
                issuedAt: uint64(block.timestamp),
                revokedAt: 0,
                issuer: _academyAddress,
                revoker: address(0)
            })
        });

        professorByEmployeeInAcademyHash[employeeInAcademyHash] = _walletAddress;
        professorByNationalIdHash[nationalIdHash] = _walletAddress;
    }
}