// SPDX-License-Identifier: MIT

pragma solidity >=0.6.2;

abstract contract Context {
    function _msgSender() internal view returns (address payable) {
        return payable(msg.sender);
    }
    function _msgData() internal view returns (bytes memory) {
        this;
        return msg.data;
    }
}