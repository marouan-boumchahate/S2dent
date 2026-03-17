// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./S2dent.sol";

contract AcademyIdentity is S2dent{
    struct Academy {
        bytes32 academyIdHash;
        string name;
        string code; // Short Name like my university => Fenerbahce University (FBU)
        bool isActive;
        uint256 issuedAt;
        uint256 revokedAt;
        address issuedBy;
    }

    mapping ( address => Academy ) public academies;

    modifier onlyAcademy(address _caller){
        require(
            academies[_caller].isActive == true,
            "Not Authorized: Only active academies can perform this operation."
        );
        _;
    }

    function issueAcademyIdentity
    (
        address _walletAddress, 
        string memory _universityId, 
        string memory _name,
        string memory _code

    ) public onlyOwner {
        bytes32 academyIdHash = keccak256(abi.encodePacked(_universityId));
        uint256 issuedAt = block.timestamp;
        uint256 revokedAt = 0;
        bool isActive = true;
        address issuedBy = msg.sender;
        
        academies[_walletAddress] = Academy(
            academyIdHash,
            _name,
            _code,
            isActive,
            issuedAt,
            revokedAt,
            issuedBy
        );
    }
}