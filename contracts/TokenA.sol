// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TokenA is ERC20 {
    constructor(address owner, uint256 initialSupply)
        ERC20("Token A", "TKA")
    {
        _mint(owner, initialSupply);
    }
}
