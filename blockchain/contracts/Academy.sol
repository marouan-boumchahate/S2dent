// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract AcademyRegistry{
    address owner;

    constructor() {
        owner = msg.sender;
    }
    
    modifier onlyOwner {
        require(
            msg.sender == owner, 
            "Not authorized: Only owner can perform this operation."
        );
        _;
    }
}