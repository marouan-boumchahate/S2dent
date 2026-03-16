// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Academy.sol";

contract ProfessorRegistry is AcademyRegistry{
    enum Role {professor, admin}

    struct Professor {
        bytes32 IdHash;
        address createdBy;
        Role role;
        bool isActive;
    } 

    mapping ( address => Professor) public professors;

    modifier onlyAdmin(address caller) {
        require(
            professors[caller].role == Role.admin,
            "Not authorized: Only admins can perform this action."
        );
        _;
    }

    function addProfessor
    (
        string memory _professorID,
        address _professorWallet,
        bool _professorStatus,
        Role _professorRole,
        address _adder
    ) 
    private
    {
        bytes32 _professorIdHash = keccak256(abi.encodePacked(_professorID));

        professors[_professorWallet] = Professor(
            _professorIdHash, 
            _adder, 
            _professorRole, 
            _professorStatus
        );
    }

    function addMainAdmin
    (
        string memory _professorID, 
        address _professorWallet,
        bool _professorStatus
    )
    public onlyOwner
    {
        addProfessor(
            _professorID, 
            _professorWallet, 
            _professorStatus, 
            Role.admin, 
            owner
        );
    }

    function addNewProfessor
    (
        string memory _professorID, 
        address _professorWallet,
        bool _professorStatus,
        Role _professorRole,
        address _adder
    )
    public onlyAdmin(_adder)
    {
        addProfessor(
            _professorID, 
            _professorWallet, 
            _professorStatus, 
            _professorRole, 
            _adder
        );
    }
}