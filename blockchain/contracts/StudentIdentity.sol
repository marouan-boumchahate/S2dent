// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./ProfessorIdentity.sol";

contract StudentIdentity is ProfessorIdentity{

    // Errors
    error InvalidStudentId(string reason);
    error InvalidNationality(string reason);

    // Constants
    uint256 private constant MAX_STRING_LENGTH = 256;
    uint256 private constant MIN_STRING_LENGTH = 3;

    uint256 private constant MAX_ID_LENGTH = 20;
    uint256 private constant MIN_ID_LENGTH = 3;

    // Structs
    struct Student {
        bytes32 studentIdHash;
        string name;
        string nationality;

        string academyName;
        string department;
        string country;

        bool isNotRevoked;
        uint256 issuedAt;
        uint256 revokedAt;
        address issuedBy;
        address revokedBy;
    }

    // Mappers
    mapping ( address => Student) public students;

    // Validations
    // function _validateStudentIdentityArgs(
    //     address _walletAddress,
    //     address _academyAddress,
    //     string  memory _studentId,
    //     string  memory _name,
    //     string  memory _nationality,
    //     string  memory _department,
    //     string  memory _country
    // ) internal view {

    //     if (_walletAddress == address(0)) revert InvalidWalletAddress("Wallet address must not be zero.");

    //     if (_academyAddress == address(0)) revert InvalidWalletAddress("Academy address must not be zero.");

    //     uint256 idLen = bytes(_studentId).length;
    //     if (idLen == 0) revert InvalidStudentId("Student ID must not be empty.");
    //     if (idLen < MIN_ID_LENGTH) revert InvalidStudentId("Student ID is too short.");
    //     if (idLen > MAX_ID_LENGTH) revert InvalidStudentId("Student ID exceeds maximum length.");

    //     uint256 nameLen = bytes(_name).length;
    //     if (nameLen == 0) revert InvalidName("Name must not be empty.");
    //     if (nameLen > MAX_STRING_LENGTH) revert InvalidName("Name exceeds maximum length.");

    //     uint256 nationalityLen = bytes(_nationality).length;
    //     if (nationalityLen == 0) revert InvalidNationality("Nationality must not be empty.");
    //     if (nationalityLen < MIN_STRING_LENGTH) revert InvalidNationality("Nationality is too short.");
    //     if (nationalityLen > MAX_STRING_LENGTH) revert InvalidNationality("Nationality exceeds maximum length.");
        
    //     uint256 deptLen = bytes(_department).length;
    //     if (deptLen == 0) revert InvalidDepartment("Department must not be empty.");
    //     if (deptLen > MAX_STRING_LENGTH) revert InvalidDepartment("Department exceeds maximum length.");

    //     uint256 countryLen = bytes(_country).length;
    //     if (countryLen == 0) revert InvalidCountry("Country must not be empty.");
    //     if (countryLen > MAX_STRING_LENGTH) revert InvalidCountry("Country exceeds maximum length.");
    // }

    // External / Public Functions
    function issueStudentIdentity
    (
        address _walletAddress,
        address _academyAddress,
        string  memory _studentId,
        string  memory _name,
        string  memory _nationality,
        string  memory _department,
        string  memory _country
    ) public onlyOwner onlyAcademy(_academyAddress) {

        // _validateStudentIdentityArgs(
        //     _walletAddress,
        //     _academyAddress,
        //     _studentId,
        //     _name,
        //     _nationality,
        //     _department,
        //     _country
        // );

        bytes32 studentIdHash = keccak256(abi.encodePacked(_studentId));
        string memory academyName = academies[_academyAddress].name;

        students[_walletAddress] = Student(
            studentIdHash,
            _name,
            _nationality,
            academyName,
            _department,
            _country,
            true,
            block.timestamp,
            0,
            _academyAddress,
            address(0)
        );
    }
}