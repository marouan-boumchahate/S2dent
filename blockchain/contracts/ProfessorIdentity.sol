// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./AcademyIdentity.sol";

contract ProfessorIdentity is AcademyIdentity{

    // Errors
    error InvalidProfessorId(string reason);
    error InvalidTitle(string reason);
    error InvalidDepartment(string reason);

    // Constants
    uint256 private constant MAX_STRING_LENGTH = 256;
    uint256 private constant MIN_STRING_LENGTH = 3;

    uint256 private constant MAX_ID_LENGTH = 20;
    uint256 private constant MIN_ID_LENGTH = 3;

    // Structs
    struct Professor {
        bytes32 professorIdHash;
        string name;
        string title;
        string department;
        string country;

        bytes32 fingerprint;
        uint256 notBefore;
        uint256 notAfter;

        bool isNotRevoked;
        uint256 issuedAt;
        uint256 revokedAt;
        address issuedBy;
        address revokedBy;
    }

    // Mappers
    mapping ( address => Professor) public professors;

    // Validations
    function _validateProfessorIdentityArgs(
        address _walletAddress,
        address _academyAddress,
        string  memory _professorId,
        string  memory _name,
        string  memory _title,
        string  memory _department,
        string  memory _country,
        bytes32 _fingerprint,
        uint256 _notBefore,
        uint256 _notAfter
    ) internal view {

        if (_walletAddress == address(0)) revert InvalidWalletAddress("Wallet address must not be zero.");

        if (_academyAddress == address(0)) revert InvalidWalletAddress("Academy address must not be zero.");

        uint256 idLen = bytes(_professorId).length;
        if (idLen == 0) revert InvalidProfessorId("Professor ID must not be empty.");
        if (idLen < MIN_ID_LENGTH) revert InvalidProfessorId("Professor ID is too short.");
        if (idLen > MAX_ID_LENGTH) revert InvalidProfessorId("Professor ID exceeds maximum length.");

        uint256 nameLen = bytes(_name).length;
        if (nameLen == 0) revert InvalidName("Name must not be empty.");
        if (nameLen > MAX_STRING_LENGTH) revert InvalidName("Name exceeds maximum length.");

        uint256 titleLen = bytes(_title).length;
        if (titleLen == 0) revert InvalidTitle("Title must not be empty.");
        if (titleLen > MAX_STRING_LENGTH) revert InvalidTitle("Title exceeds maximum length.");

        uint256 deptLen = bytes(_department).length;
        if (deptLen == 0) revert InvalidDepartment("Department must not be empty.");
        if (deptLen > MAX_STRING_LENGTH) revert InvalidDepartment("Department exceeds maximum length.");

        uint256 countryLen = bytes(_country).length;
        if (countryLen == 0) revert InvalidCountry("Country must not be empty.");
        if (countryLen > MAX_STRING_LENGTH) revert InvalidCountry("Country exceeds maximum length.");

        if (_fingerprint == bytes32(0)) revert InvalidFingerprint("Fingerprint must not be zero.");

        if (_notBefore == 0) revert InvalidValidityWindow("notBefore must be a non-zero timestamp.");
        if (_notAfter <= _notBefore) revert InvalidValidityWindow("notAfter must be greater than notBefore.");
        if (_notAfter <= block.timestamp) revert InvalidValidityWindow("notAfter must be in the future.");
    }

    // External / Public Functions
    function issueProfessorIdentity
    (
        address _walletAddress,
        address _academyAddress,
        string  memory _professorId,
        string  memory _name,
        string  memory _title,
        string  memory _department,
        string  memory _country,
        bytes32 _fingerprint,
        uint256 _notBefore,
        uint256 _notAfter

    ) public onlyOwner onlyAcademy(_academyAddress) {

        _validateProfessorIdentityArgs(
            _walletAddress,
            _academyAddress,
            _professorId,
            _name,
            _title,
            _department,
            _country,
            _fingerprint,
            _notBefore,
            _notAfter
        );

        bytes32 employeeIdHash = keccak256(abi.encodePacked(_professorId));

        professors[_walletAddress] = Professor(
            employeeIdHash,
            _name,
            _title,
            _department,
            _country,
            _fingerprint,
            _notBefore,
            _notAfter,
            true,
            block.timestamp,
            0,
            _academyAddress,
            address(0)
        );
    }
}