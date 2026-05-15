// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./S2dent.sol";

contract AcademyIdentity is S2dent {
    // Constants
    uint256 private constant MAX_STRING_LENGTH = 256;

    // Enums
    enum AcademyType {
        university,
        college,
        school,
        institute,
        online_platform,
        other
    }

    // Request Args
    struct AcademyInfosArgs {
        string academyId;
        string name;
        string shortName;
        uint8 academyType;
    }
    struct AcademyProofsArgs {
        string legalName;
        string registrationNumber;
        string taxId;
        string billingEmail;
    }
    struct AcademyCertArgs {
        bytes32 fingerprint;
        string certificate;
        string chain;
        uint64 notBefore;
        uint64 notAfter;
    }
    
    struct AcademyIssueArgs {
        AcademyInfosArgs infos;
        AcademyProofsArgs proofs;
        AcademyCertArgs cert;
    }

    // Stored Data Structs
    struct AcademyIdentityData {
        bytes32 academyIdHash;
        string name;
        string shortName;
        AcademyType academyType;
    }
    struct AcademyProofData {
        string legalName;
        string registrationNumber;
        string taxId;
        string billingEmail;
    }
    struct AcademyCertificateData {
        bytes32 fingerprint;
        string certificate;
        string chain;
        uint64 notBefore;
        uint64 notAfter;
    }
    struct AcademyStatusData {
        bool isNotRevoked;
        uint64 issuedAt;
        uint64 revokedAt;
        address issuer;
        address revoker;
        string revocationReason;
    }

    struct Academy {
        AcademyIdentityData identity;
        AcademyProofData proofs;
        AcademyCertificateData cert;
        AcademyStatusData status;
    }

    // Errors
    error AcademyIdentityAlreadyIssued();
    error AcademyIdAlreadyUsed();
    error AcademyNameShortNameAlreadyUsed();
    error AcademyLegalBundleAlreadyUsed();
    error AcademyIdentityNotIssued();
    error AcademyIdentityAlreadyRevoked();

    // Events
    event AcademyIssued(
        bytes indexed academyPublicKey,
        address indexed issuer,
        bytes32 academyIdHash,
        uint64 issuedAt
    );
    event AcademyRevoked(
        bytes indexed academyPublicKey,
        address indexed revoker,
        uint64 revokedAt
    );

    // Mappers
    mapping(bytes => Academy) public academies;

    // Uniqueness indexes (no loops)
    mapping(bytes32 => bytes) private academyByIdHash;
    mapping(bytes32 => bytes) private academyByNameShortHash;
    mapping(bytes32 => bytes) private academyByLegalBundleHash;

    // Modifiers
    modifier onlyAcademy(bytes calldata _caller) {
        AcademyStatusData memory s = academies[_caller].status;
        require(
            s.issuer != address(0) && s.isNotRevoked, 
            "Not authorized: Only a registered academy can perform this operation."
        );
        _;
    }

    // Validations
    function _validateHashIsSet(bytes32 _value, string memory _msg) internal pure {
        require(_value != bytes32(0), _msg);
    }
    function _validateCertificate(AcademyCertArgs calldata c) internal pure {
        _validateHashIsSet(c.fingerprint, "Invalid certificate: fingerprint is required.");
        
        _validateStringIsNotEmpty(c.certificate, "Invalid certificate: certificate is empty.");
        _validateStringIsNotEmpty(c.chain, "Invalid certificate: chain is empty.");

        _validateTimeSet(uint256(c.notBefore), "Invalid certificate: notBefore must be set.");
        _validateTime1BeforeTime2(uint256(c.notBefore), uint256(c.notAfter), "Invalid certificate: notAfter must be greater than notBefore.");
    }
    function _validateAcademyInfos(AcademyInfosArgs calldata i) internal pure {
        _validateStringIsNotEmpty(i.academyId, "Invalid: academyId is required.");

        _validateStringIsNotEmpty(i.name, "Invalid: name is empty.");
        _validateStringIsNotLong(i.name, MAX_STRING_LENGTH, "Invalid: name too long.");

        _validateStringIsNotEmpty(i.shortName, "Invalid: shortName is empty.");
        _validateStringIsNotLong(i.shortName, MAX_STRING_LENGTH, "Invalid: shortName too long.");

        require(i.academyType <= uint8(AcademyType.other), "Invalid: unknown academyType.");
    }
    function _validateAcademyProofs(AcademyProofsArgs calldata p) internal pure {
        _validateStringIsNotEmpty(p.legalName, "Invalid proofs: legalName is required.");
        _validateStringIsNotEmpty(p.registrationNumber, "Invalid proofs: registrationNumber is required.");
        _validateStringIsNotEmpty(p.taxId, "Invalid proofs: taxId is required.");
        _validateStringIsNotEmpty(p.billingEmail, "Invalid proofs: billingEmail is required.");
    }

    function _validateAcademyIssue(bytes calldata _publicKey, AcademyIssueArgs calldata a) internal pure {
        _validatePublicKeySet(_publicKey);

        _validateAcademyInfos(a.infos);
        _validateAcademyProofs(a.proofs);
        _validateCertificate(a.cert);
    }

    // Internal Functions
    function _hashString(string memory _value) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(_value));
    }

    // External Functions
    function issueAcademyIdentity(
        bytes calldata _publicKey,
        AcademyIssueArgs calldata args
    ) public onlyOwner {
        _validateAcademyIssue(_publicKey, args);
        if (academies[_publicKey].status.issuer != address(0)) {
            revert AcademyIdentityAlreadyIssued();
        }

        // Create indexes for uniqueness checks
        bytes32 academyIdHash = _hashString(args.infos.academyId);
        bytes32 nameShortHash = keccak256(abi.encodePacked(args.infos.name, args.infos.shortName));
        bytes32 legalBundleHash = keccak256(
            abi.encodePacked(
                args.proofs.legalName,
                args.proofs.registrationNumber,
                args.proofs.taxId,
                args.proofs.billingEmail
            )
        );

        if (academyByIdHash[academyIdHash].length != 0) revert AcademyIdAlreadyUsed();
        if (academyByNameShortHash[nameShortHash].length != 0) revert AcademyNameShortNameAlreadyUsed();
        if (academyByLegalBundleHash[legalBundleHash].length != 0) revert AcademyLegalBundleAlreadyUsed();

        academies[_publicKey] = Academy({
            identity: AcademyIdentityData({
                academyIdHash: academyIdHash,
                name: args.infos.name,
                shortName: args.infos.shortName,
                academyType: AcademyType(args.infos.academyType)
            }),
            proofs: AcademyProofData({
                legalName: args.proofs.legalName,
                registrationNumber: args.proofs.registrationNumber,
                taxId: args.proofs.taxId,
                billingEmail: args.proofs.billingEmail
            }),
            cert: AcademyCertificateData({
                fingerprint: args.cert.fingerprint,
                certificate: args.cert.certificate,
                chain: args.cert.chain,
                notBefore: args.cert.notBefore,
                notAfter: args.cert.notAfter
            }),
            status: AcademyStatusData({
                isNotRevoked: true,
                issuedAt: uint64(block.timestamp),
                revokedAt: 0,
                issuer: msg.sender,
                revoker: address(0),
                revocationReason: ""
            })
        });

        // set indexes for checks
        academyByIdHash[academyIdHash] = _publicKey;
        academyByNameShortHash[nameShortHash] = _publicKey;
        academyByLegalBundleHash[legalBundleHash] = _publicKey;

        emit AcademyIssued(_publicKey, msg.sender, academyIdHash, uint64(block.timestamp));
    }

    function revokeAcademyIdentity(
        bytes calldata _publicKey,
        string calldata _reason
    ) public onlyOwner {
        _validatePublicKeySet(_publicKey);

        AcademyStatusData storage s = academies[_publicKey].status;
        if (s.issuer == address(0)) revert AcademyIdentityNotIssued();
        if (!s.isNotRevoked) revert AcademyIdentityAlreadyRevoked();

        s.isNotRevoked = false;
        s.revokedAt = uint64(block.timestamp);
        s.revoker = msg.sender;
        s.revocationReason = _reason;

        emit AcademyRevoked(_publicKey, msg.sender, s.revokedAt);
    }
}
