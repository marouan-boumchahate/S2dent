// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./StudentIdentity.sol";

contract Credential is StudentIdentity {
    // Constants
    uint256 private constant MAX_STRING_LENGTH = 256;
    uint256 private constant MIN_STRING_LENGTH = 3;
    uint256 private constant MAX_DESCRIPTION_LENGTH = 1024;

    // Enums
    enum CredentialType {
        attendance,
        enrollment,
        degree,
        achievement,
        certificate,
        transcript
    }

    // Request Args
    struct CredentialInfosArgs {
        string title;
        string code;
        uint8 credentialType;
        string description;
    }
    struct CredentialPayloadArgs {
        bytes32 payloadHash;
        bytes payloadSignature;
        string encryptedPayload;
    }
    struct CredentialIssueArgs {
        CredentialInfosArgs infos;
        CredentialPayloadArgs payload;
    }

    // Stored Data Structs
    struct CredentialIdentityData {
        string title;
        string code;
        CredentialType credentialType;
        string description;
        string academyName;
    }
    struct CredentialPayloadData {
        bytes32 payloadHash;
        bytes payloadSignature;
        string encryptedPayload;
    }
    struct CredentialStatusData {
        bool isNotRevoked;
        uint64 issuedAt;
        uint64 revokedAt;
        address academy;
        address issuer;
        address revoker;
        string revocationReason;
    }
    struct CredentialData {
        CredentialIdentityData identity;
        CredentialPayloadData payload;
        CredentialStatusData status;
    }

    // Errors
    error InvalidCredentialType();
    error InvalidPayloadHash();
    error InvalidPayloadSignature();
    error InvalidEncryptedPayload();
    error CredentialPayloadAlreadyUsed();
    error CredentialIndexOutOfRange();
    error CredentialAlreadyRevoked();

    // Mappings
    mapping(address => CredentialData[]) public credentials;

    // Uniqueness indexes
    mapping(bytes32 => bool) private credentialIssuedForPayloadHash;

    // Events
    event CredentialIssued(
        address indexed studentAddress,
        address indexed issuerAddress,
        bytes32 payloadHash,
        uint256 index,
        uint64 issuedAt
    );
    event CredentialRevoked(
        address indexed studentAddress,
        address indexed revokerAddress,
        uint256 index,
        uint64 revokedAt
    );

    // Validations
    function _validateCredentialInfos(CredentialInfosArgs calldata i) internal pure {
        _validateStringIsNotShort(i.title, MIN_STRING_LENGTH, "Invalid credential: title is too short.");
        _validateStringIsNotLong(i.title, MAX_STRING_LENGTH, "Invalid credential: title is too long.");

        _validateStringIsNotEmpty(i.code, "Invalid credential: code is required.");
        _validateStringIsNotLong(i.code, MAX_STRING_LENGTH, "Invalid credential: code is too long.");

        _validateStringIsNotLong(i.description, MAX_DESCRIPTION_LENGTH, "Invalid credential: description is too long.");

        if (i.credentialType > uint8(CredentialType.transcript)) revert InvalidCredentialType();
    }
    function _validateCredentialPayload(CredentialPayloadArgs calldata p) internal pure {
        if (p.payloadHash == bytes32(0)) revert InvalidPayloadHash();
        if (p.payloadSignature.length == 0) revert InvalidPayloadSignature();
        if (bytes(p.encryptedPayload).length == 0) revert InvalidEncryptedPayload();
    }
    function _validateCredentialAuthorities(
        address _studentAddress,
        address _issuerAddress,
        address _academyAddress
    ) internal view {
        _validateAddressSet(_studentAddress);
        _validateAddressSet(_issuerAddress);
        _validateAddressSet(_academyAddress);

        if (academies[_academyAddress].status.issuer == address(0)) revert AcademyIdentityNotIssued();
        if (!academies[_academyAddress].status.isNotRevoked) revert AcademyIdentityAlreadyRevoked();

        if (students[_studentAddress].status.issuer == address(0)) revert StudentIdentityNotIssued();
        if (!students[_studentAddress].status.isNotRevoked) revert StudentIdentityAlreadyRevoked();
        require(
            students[_studentAddress].status.issuer == _academyAddress,
            "Invalid credential: student does not belong to the credentialing academy."
        );

        if (_issuerAddress != _academyAddress) {
            if (professors[_issuerAddress].status.issuer == address(0)) revert ProfessorIdentityNotIssued();
            if (!professors[_issuerAddress].status.isNotRevoked) revert ProfessorIdentityAlreadyRevoked();
            require(
                professors[_issuerAddress].status.issuer == _academyAddress,
                "Invalid credential: professor does not belong to the credentialing academy."
            );
        }
    }

    // External Functions
    function issueCredential(
        address _studentAddress,
        address _issuerAddress,
        address _academyAddress,
        CredentialIssueArgs calldata args
    ) external onlyOwner {
        _validateCredentialAuthorities(_studentAddress, _issuerAddress, _academyAddress);
        _validateCredentialInfos(args.infos);
        _validateCredentialPayload(args.payload);

        if (credentialIssuedForPayloadHash[args.payload.payloadHash]) {
            revert CredentialPayloadAlreadyUsed();
        }

        string memory academyName = academies[_academyAddress].identity.name;

        credentials[_studentAddress].push(
            CredentialData({
                identity: CredentialIdentityData({
                    title: args.infos.title,
                    code: args.infos.code,
                    credentialType: CredentialType(args.infos.credentialType),
                    description: args.infos.description,
                    academyName: academyName
                }),
                payload: CredentialPayloadData({
                    payloadHash: args.payload.payloadHash,
                    payloadSignature: args.payload.payloadSignature,
                    encryptedPayload: args.payload.encryptedPayload
                }),
                status: CredentialStatusData({
                    isNotRevoked: true,
                    issuedAt: uint64(block.timestamp),
                    revokedAt: 0,
                    academy: _academyAddress,
                    issuer: _issuerAddress,
                    revoker: address(0),
                    revocationReason: ""
                })
            })
        );

        credentialIssuedForPayloadHash[args.payload.payloadHash] = true;

        uint256 index = credentials[_studentAddress].length - 1;
        emit CredentialIssued(
            _studentAddress,
            _issuerAddress,
            args.payload.payloadHash,
            index,
            uint64(block.timestamp)
        );
    }

    function revokeCredential(
        address _studentAddress,
        uint256 _index,
        address _revokerAddress,
        string calldata _reason
    ) external onlyOwner onlyAcademy(_revokerAddress) {
        _validateAddressSet(_studentAddress);

        CredentialData[] storage list = credentials[_studentAddress];
        if (_index >= list.length) revert CredentialIndexOutOfRange();

        CredentialStatusData storage s = list[_index].status;
        if (!s.isNotRevoked) revert CredentialAlreadyRevoked();

        require(
            _revokerAddress == s.academy,
            "Invalid revoker: must be the issuing academy."
        );

        s.isNotRevoked = false;
        s.revokedAt = uint64(block.timestamp);
        s.revoker = _revokerAddress;
        s.revocationReason = _reason;

        emit CredentialRevoked(_studentAddress, _revokerAddress, _index, s.revokedAt);
    }

    // View Functions
    function getCredentialCount(address _studentAddress) external view returns (uint256) {
        return credentials[_studentAddress].length;
    }

    function getCredential(
        address _studentAddress,
        uint256 _index
    ) external view returns (CredentialData memory) {
        _validateAddressSet(_studentAddress);

        CredentialData[] storage list = credentials[_studentAddress];
        if (_index >= list.length) revert CredentialIndexOutOfRange();

        return list[_index];
    }
}
