// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.10;

import {IERC721Receiver} from "../../interfaces/IERC721Receiver.sol";


contract ReceiverBadReturn is IERC721Receiver {

    constructor(){
    }

    event Recieved(address operator, address from, uint256 tokenId, bytes data);

    function onERC721Received(address operator, address from, uint256 tokenId, bytes calldata data) external override returns (bytes4) {
        emit Recieved(operator, from, tokenId, data);

        return 0x01020304;
    }
}
