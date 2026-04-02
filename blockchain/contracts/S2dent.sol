// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract S2dent {
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

    // Errors
    error InvalidAddress(string reason);
    error InvalidString(string reason);
    error InvalidNumber(string reason);

    // validations
    function _validateWalletAddressSet(address _address) internal pure {
        if (_address == address(0)) revert InvalidAddress("Address must not be zero.");
    }

    function _validateStringIsNotEmpty(
        string memory _value, 
        string memory _msg
    ) internal pure { require(bytes(_value).length > 0, _msg); }

    function _validateStringIsNotShort(
        string memory _value,
        uint256 _min,
        string memory _msg
    ) internal pure { require(bytes(_value).length >= _min, _msg); }

    function _validateStringIsNotLong(
        string memory _value,
        uint256 _max,
        string memory _msg
    ) internal pure { require(bytes(_value).length <= _max, _msg); }

    function _validateTimeSet(
        uint256 _value,
        string memory _msg
    ) internal pure { require(_value > 0, _msg); }

    function _validateTime1BeforeTime2(
        uint256 _value1,
        uint256 _value2,
        string memory _msg
    ) internal pure { require(_value1 < _value2, _msg); }
}