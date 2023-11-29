// SPDX-License-Identifier: MIT
pragma solidity >=0.6.2;

import "../libraries/VRC25.sol";
import {VRC725} from "../VRC725.sol";

contract VRC725Helper is VRC25 {
    constructor(string memory name, string memory symbol, uint8 decimals) VRC25(name, symbol, decimals) {
    }

    function _estimateFee(uint256 value) internal view override returns (uint256) {
        return minFee();
    }

    function permit(address collection, address spender, uint256 tokenId, uint256 deadline, bytes memory signature) external {
        uint256 fee = estimateFee(0);
        _chargeFeeFrom(msg.sender, address(this), fee);

        VRC725(collection).permit(spender, tokenId, deadline, signature);
    }

    function permitForAll(address collection, address owner, address spender, uint256 deadline, bytes memory signature) external {
        uint256 fee = estimateFee(0);
        _chargeFeeFrom(msg.sender, address(this), fee);

        VRC725(collection).permitForAll(owner, spender, deadline, signature);
    }

    function transferNFT(address collection, address to, uint256 tokenId) external {
        uint256 fee = estimateFee(0);
        _chargeFeeFrom(msg.sender, address(this), fee);

        VRC725(collection).transferFrom(msg.sender, to, tokenId);
    }

    function multicall(bytes[] calldata data) public returns (bytes[] memory results) {
        results = new bytes[](data.length);
        for (uint256 i = 0; i < data.length; i++) {
            (bool success, bytes memory result) = address(this).delegatecall(data[i]);

            if (!success) {
                // Next 5 lines from https://ethereum.stackexchange.com/a/83577
                if (result.length < 68) revert();
                assembly {
                    result := add(result, 0x04)
                }
                revert(abi.decode(result, (string)));
            }

            results[i] = result;
        }
    }
}