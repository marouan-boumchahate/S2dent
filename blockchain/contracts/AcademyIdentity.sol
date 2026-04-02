// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./S2dent.sol";

contract AcademyIdentity is S2dent {
    // Constants
    uint256 private constant MAX_STRING_LENGTH = 256;
    uint256 private constant MAX_POSTAL_CODE_LENGTH = 20;

    // Enums
    enum AcademyType {
        university,
        college,
        school,
        institute,
        online_platform,
        other
    }
    
    // Structs
    struct Academy {
        // Academy Infos
        string academyId;
        string name;
        string shortName;
        AcademyType academyType;

        string description;
        string website;
        string logoUrl;

        // Contact Infos
        string email;
        string phone;

        // Legal Infos
        string legalName;
        string registrationNumber;
        string taxId;
        string billingEmail;

        // Address Infos
        string addressLine1;
        string addressLine2;
        string street;
        string district;
        string state;
        string postalCode;
        string city;
        string country;
        string latitude;
        string longitude;

        // Certificate Infos
        bytes32 fingerprint;
        string certificatePem;
        string chainPem;
        uint256 notBefore;
        uint256 notAfter;

        // Revocation Infos
        bool isNotRevoked;
        uint256 issuedAt;
        uint256 revokedAt;
        address issuer;
        address revoker;
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
    function _validateCertificate(
        bytes32 fingerprint,
        string memory _certificatePem,
        string memory _chainPem,
        uint256 notBefore,
        uint256 notAfter
    ) internal pure {
        require(fingerprint != bytes32(0), "Invalid certificate: fingerprint is required.");

        _validateStringIsNotEmpty(_certificatePem, "Invalid certificate: certificatePem is empty.");
        _validateStringIsNotEmpty(_chainPem, "Invalid certificate: chainPem is empty."); 
        _validateTimeSet(notBefore, "Invalid certificate: notBefore must be set."); 
        _validateTime1BeforeTime2(notBefore, notAfter, "Invalid certificate: notAfter must be greater than notBefore.");
    }

    function _validateAddress(
        string memory _street,
        string memory _district,
        string memory _state,
        string memory _postalCode,
        string memory _city,
        string memory _country
    ) internal pure {
        _validateStringIsNotLong(_city, MAX_STRING_LENGTH, "Invalid address: city too length.");
        _validateStringIsNotLong(_country, MAX_STRING_LENGTH, "Invalid address: country too length.");
        _validateStringIsNotLong(_postalCode, MAX_POSTAL_CODE_LENGTH, "Invalid address: postal code too length."); 
        _validateStringIsNotLong(_street, MAX_STRING_LENGTH, "Invalid address: street too long.");
        _validateStringIsNotLong(_district, MAX_STRING_LENGTH, "Invalid address: district too long.");
        _validateStringIsNotLong(_state, MAX_STRING_LENGTH, "Invalid address: state too long.");
    }

    function _validateAcademyInfos(
        address _walletAddress,
        string memory _academyId,
        string memory _name,
        string memory _shortName,
        AcademyType academyType,
        string memory _description,
        string memory _website,
        string memory _logoUrl,
        string memory _email,
        string memory _phone,
        string memory _legalName,
        string memory _registrationNumber,
        string memory _taxId,
        string memory _billingEmail
    ) internal pure {
        _validateWalletAddressSet(_walletAddress);

        _validateStringIsNotShort(_academyId, 11, "Invalid: academyId too short.");
        _validateStringIsNotLong(_academyId, 20, "Invalid: academyId too long.");
        
        _validateStringIsNotEmpty(_name, "Invalid: name is empty.");
        _validateStringIsNotLong(_name, MAX_STRING_LENGTH, "Invalid: name too long.");

        _validateStringIsNotEmpty(_shortName, "Invalid: shortName is empty.");
        
        require(uint8(academyType) <= uint8(AcademyType.other), "Invalid: unknown academyType.");

        _validateStringIsNotLong(_description, MAX_STRING_LENGTH, "Invalid: description too long.");
        _validateStringIsNotLong(_website, MAX_STRING_LENGTH, "Invalid: website too long.");
        _validateStringIsNotLong(_logoUrl, MAX_STRING_LENGTH, "Invalid: logoUrl too long.");

        _validateStringIsNotEmpty(_email, "Invalid: email is empty.");
        _validateStringIsNotLong(_email, MAX_STRING_LENGTH, "Invalid: email too long.");

        _validateStringIsNotLong(_billingEmail, MAX_STRING_LENGTH, "Invalid: billingEmail too long.");
        
        _validateStringIsNotLong(_phone, MAX_STRING_LENGTH, "Invalid: phone too long.");

        _validateStringIsNotEmpty(_legalName, "Invalid: legalName is empty.");
        _validateStringIsNotLong(_legalName, MAX_STRING_LENGTH, "Invalid: legalName too long.");

        _validateStringIsNotEmpty(_registrationNumber, "Invalid: registrationNumber is empty.");
        _validateStringIsNotLong(_registrationNumber, MAX_STRING_LENGTH, "Invalid: registrationNumber too long.");

        _validateStringIsNotEmpty(_taxId, "Invalid: taxId is empty.");
        _validateStringIsNotLong(_taxId, MAX_STRING_LENGTH, "Invalid: taxId too long.");
    }


    // External Functions
    function issueAcademyIdentity(
        address _walletAddress,

        string  memory _academyNumber,
        string  memory _name,
        string  memory _shortName,
        uint8 _academyType,

        string  memory _description,
        string  memory _website,
        string  memory _logoUrl,

        string  memory _email,
        string  memory _phone,

        string  memory _legalName,
        string  memory _registrationNumber,
        string  memory _taxId,
        string  memory _billingEmail,
        
        string  memory _addressLine1,
        string  memory _addressLine2,
        string  memory _street,
        string  memory _district,
        string  memory _state,
        string  memory _postalCode,
        string  memory _city,
        string  memory _country,
        string  memory _latitude,
        string  memory _longitude,


        bytes32 _fingerprint,
        string memory _certificatePem,
        string memory _chainPem,
        uint256 _notBefore,
        uint256 _notAfter
    ) public onlyOwner {
        // Field-by-field assignment avoids "Stack too deep" without relying only on viaIR.
        Academy memory a;

        a.academyId = _academyNumber;
        a.name = _name;
        a.shortName = _shortName;
        a.academyType = AcademyType(_academyType);
        a.description = _description;
        a.website = _website;
        a.logoUrl = _logoUrl;
        a.email = _email;
        a.phone = _phone;
        a.legalName = _legalName;
        a.registrationNumber = _registrationNumber;
        a.taxId = _taxId;
        a.billingEmail = _billingEmail;
        a.addressLine1 = _addressLine1;
        a.addressLine2 = _addressLine2;
        a.street = _street;
        a.district = _district;
        a.state = _state;
        a.postalCode = _postalCode;
        a.city = _city;
        a.country = _country;
        a.latitude = _latitude;
        a.longitude = _longitude;
        a.fingerprint = _fingerprint;
        a.certificatePem = _certificatePem;
        a.chainPem = _chainPem;
        a.notBefore = _notBefore;
        a.notAfter = _notAfter;
        a.isNotRevoked = true;
        a.issuedAt = block.timestamp;
        a.revokedAt = 0;
        a.issuer = msg.sender;
        a.revoker = address(0);

        academies[_walletAddress] = a;
    }
}
