// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

interface IWrappedToken {
    function mint(address to, uint256 amount) external;
    function burn(address from, uint256 amount) external;
}

contract BridgeB {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    IWrappedToken public token;
    address public validator;
    address public relayer;

    uint256 public globalNonce;
    mapping(uint256 => bool) public processedNonces;

    event Minted(address indexed user, uint256 amount, uint256 nonce);
    event Burned(address indexed user, uint256 amount, uint256 nonce);

    constructor(
        address _token,
        address _validator,
        address _relayer
    ) {
        token = IWrappedToken(_token);
        validator = _validator;
        relayer = _relayer;
    }

    modifier onlyRelayer() {
        require(msg.sender == relayer, "Not relayer");
        _;
    }

    function mint(
        address user,
        uint256 amount,
        uint256 nonce,
        bytes calldata signature
    ) external onlyRelayer {
        require(!processedNonces[nonce], "Nonce already used");

        bytes32 message = keccak256(
            abi.encodePacked(
                user,
                amount,
                nonce,
                address(this),
                block.chainid
            )
        );

        bytes32 ethSignedMessage = MessageHashUtils.toEthSignedMessageHash(message);
        address signer = ethSignedMessage.recover(signature);

        require(signer == validator, "Invalid signature");

        processedNonces[nonce] = true;

        token.mint(user, amount);

        emit Minted(user, amount, nonce);
    }

    function burn(uint256 amount) external {
        require(amount > 0, "Invalid amount");
        globalNonce++;

        token.burn(msg.sender, amount);

        emit Burned(msg.sender, amount, globalNonce);
    }
}
