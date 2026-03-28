// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./S2dent.sol";

contract AcademyIdentity is S2dent {

    // Errors
    error InvalidWalletAddress(string reason);
    error InvalidAcademyId(string reason);
    error InvalidName(string reason);
    error InvalidCode(string reason);
    error InvalidCountry(string reason);
    error InvalidFingerprint(string reason);
    error InvalidValidityWindow(string reason);

    // Constants
    uint256 private constant MAX_STRING_LENGTH = 256;
    uint256 private constant MIN_STRING_LENGTH = 3;

    uint256 private constant MAX_ID_LENGTH = 20;
    uint256 private constant MIN_ID_LENGTH = 3;

    // Structs
    struct Academy {
        bytes32 academyIdHash;
        string name;
        string code;
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
    mapping(address => Academy) public academies;

    // Modifiers
    modifier onlyAcademy(address _caller) {
        require(
            academies[_caller].isNotRevoked,
            "Not authorized: Only a registered academy can perform this operation."
        );
        _;
    }

    // Validations
    function _validateAcademyIdentityArgs(
        address _walletAddress,
        string  memory _academyId,
        string  memory _name,
        string  memory _code,
        string  memory _country,
        bytes32 _fingerprint,
        uint256 _notBefore,
        uint256 _notAfter
    ) internal view {

        if (_walletAddress == address(0)) revert InvalidWalletAddress("Wallet address must not be zero.");

        uint256 idLen = bytes(_academyId).length;
        if (idLen == 0) revert InvalidAcademyId("Academy ID must not be empty.");
        if (idLen < MIN_ID_LENGTH) revert InvalidAcademyId("Academy ID is too short.");
        if (idLen > MAX_ID_LENGTH) revert InvalidAcademyId("Academy ID exceeds maximum length.");

        uint256 nameLen = bytes(_name).length;
        if (nameLen == 0) revert InvalidName("Academy name must not be empty.");
        if (nameLen > MAX_STRING_LENGTH) revert InvalidName("Academy name exceeds maximum length.");

        uint256 codeLen = bytes(_code).length;
        if (codeLen == 0) revert InvalidCode("Code must not be empty.");
        if (codeLen < MIN_STRING_LENGTH) revert InvalidCode("Code is too short.");
        if (codeLen > 5) revert InvalidCode("Code exceeds maximum length.");

        uint256 countryLen = bytes(_country).length;
        if (countryLen == 0) revert InvalidCountry("Country must not be empty.");
        if (countryLen > MAX_STRING_LENGTH) revert InvalidCountry("Country exceeds maximum length.");

        if (_fingerprint == bytes32(0)) revert InvalidFingerprint("Fingerprint must not be zero.");

        if (_notBefore == 0) revert InvalidValidityWindow("notBefore must be a non-zero timestamp.");
        if (_notAfter <= _notBefore) revert InvalidValidityWindow("notAfter must be greater than notBefore.");
        if (_notAfter <= block.timestamp) revert InvalidValidityWindow("notAfter must be in the future.");
    }

    // External / Public Functions
    function issueAcademyIdentity(
        address _walletAddress,
        string  memory _academyId,
        string  memory _name,
        string  memory _code,
        string  memory _country,
        bytes32 _fingerprint,
        uint256 _notBefore,
        uint256 _notAfter
    ) public onlyOwner {

        _validateAcademyIdentityArgs(
            _walletAddress,
            _academyId,
            _name,
            _code,
            _country,
            _fingerprint,
            _notBefore,
            _notAfter
        );

        bytes32 academyIdHash = keccak256(abi.encodePacked(_academyId));

        academies[_walletAddress] = Academy(
            academyIdHash,
            _name,
            _code,
            _country,
            _fingerprint,
            _notBefore,
            _notAfter,
            true,
            block.timestamp,
            0,
            msg.sender,
            address(0)
        );
    }
}
