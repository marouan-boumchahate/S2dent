// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./AcademyIdentity.sol";

contract ProfessorIdentity is AcademyIdentity{
    struct Professor {
        bytes32 employeeIdHash;
        string fullName;
        string title;
        string department;
        string faculty;
        bool isActive;
        uint256 issuedAt;
        uint256 revokedAt;
        address issuedBy;
    }

    mapping ( address => Professor) public professors;

    function issueProfessorIdentity
    (
        address _walletAddress,
        string memory _employeeId,
        string memory _fullName,
        string memory _title,
        string memory _department,
        string memory _faculty,
        address _academyAddress

    ) public onlyAcademy(_academyAddress) {
        bytes32 employeeIdHash = keccak256(abi.encodePacked(_employeeId));
        bool isActive = true;
        uint256 issuedAt = block.timestamp;
        uint256 revokedAt = 0;
        address academyAddress = _academyAddress;

        professors[_walletAddress] = Professor(
            employeeIdHash,
            _fullName,
            _title,
            _department,
            _faculty,
            isActive,
            issuedAt,
            revokedAt,
            academyAddress
        );
    }
}