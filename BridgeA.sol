// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

contract BridgeA {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    IERC20 public token;
    address public validator;
    address public relayer;

    uint256 public globalNonce;
    mapping(uint256 => bool) public processedNonces;

    event Locked(address indexed user, uint256 amount, uint256 nonce);
    event Released(address indexed user, uint256 amount, uint256 nonce);

    constructor(
        address _token,
        address _validator,
        address _relayer
    ) {
        token = IERC20(_token);
        validator = _validator;
        relayer = _relayer;
    }

    modifier onlyRelayer() {
        require(msg.sender == relayer, "Not relayer");
        _;
    }

    function lock(uint256 amount) external {
        require(amount > 0, "Invalid amount");
        globalNonce++;

        token.transferFrom(msg.sender, address(this), amount);

        emit Locked(msg.sender, amount, globalNonce);
    }

    function release(
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

        token.transfer(user, amount);

        emit Released(user, amount, nonce);
    }
}
