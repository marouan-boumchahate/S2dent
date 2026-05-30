// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

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

    // Constants
    uint256 internal constant PUBLIC_KEY_LENGTH = 65;
    uint256 internal constant SIGNATURE_LENGTH = 65;

    // Errors
    error InvalidAddress(string reason);
    error InvalidPublicKey(string reason);
    error InvalidSignature(string reason);
    error InvalidString(string reason);
    error InvalidNumber(string reason);

    // validations
    function _validateAddressSet(address _addr) internal pure {
        if (_addr == address(0)) {
            revert InvalidAddress("Address must not be the zero address.");
        }
    }

    function _validatePublicKeySet(bytes memory _publicKey) internal pure {
        if (_publicKey.length != PUBLIC_KEY_LENGTH) {
            revert InvalidPublicKey("Public key must be 65 bytes.");
        }
    }

    function _validateSignatureSet(bytes memory _signature) internal pure {
        if (_signature.length != SIGNATURE_LENGTH) {
            revert InvalidSignature("Signature must be 65 bytes.");
        }
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

    function isMessageSignedByOwner(
        string memory _message,
        bytes memory _signature
    ) public view returns (bool) {
        return ECDSA.recover(
            MessageHashUtils.toEthSignedMessageHash(bytes(_message)),
            _signature
        ) == owner;
    }
}