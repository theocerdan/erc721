// contracts/MyNFT.sol
// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "../interfaces/IERC721Metadata.sol";
import {IERC721Receiver} from "../interfaces/IERC721Receiver.sol";
import {IERC721} from "../interfaces/IERC721.sol";

contract MyNFT is IERC721Metadata {

    error Unauthorized();
    error NotOwner();
    error ZeroAddress();
    error InvalidToken();
    error InvalidReceiver();

    uint256 public _tokenIdCounter;

    mapping(address => uint256) private balance;

    mapping(uint256 => address) private owner;

    mapping(uint256 => address) private approval;

    mapping(address => mapping(address => bool)) private approvalForAll;

    bytes4 private constant ERC721_RECEIVED = 0x150b7a02;


    function baseURI() external view returns (string memory) {
        return "https://my-nft-api.com/token/";
    }

    function name() external pure returns (string memory) { //calldata ou memory sachant que la valeur retournée est une const
        return "MyNFT";
    }

    function symbol() external pure returns (string memory) { //calldata ou memory sachant que la valeur retournée est une const
        return "MNFT";
    }

    function tokenURI(uint256 _tokenId) external view returns (string memory) {
        if (!isValidToken(_tokenId)) revert InvalidToken();
        return string.concat(baseURI(), string(abi.encodePacked(_tokenId)));
    }

    function balanceOf(address _owner) external view returns (uint256) {
        return balance[_owner];
    }

    function isOwner(uint256 _tokenId, address _address) internal view returns (bool) {
        return getOwner(_tokenId) == _address;
    }

    function getOwner(uint256 _tokenId) internal view returns (address) {
        return owner[_tokenId];
    }

    function isOperator(uint256 _tokenId, address _owner, address _operator) internal view returns (bool) {
        return approvalForAll[_owner][_operator] || approval[_tokenId] == _operator;
    }

    function ownerOf(uint256 _tokenId) external view returns (address) {
        return owner[_tokenId];
    }

    function transferFrom(address _from, address _to, uint256 _tokenId) public {
        if (!((isOwner(_tokenId, _from) || isOperator(_tokenId, getOwner(_tokenId), _from)))) {
            revert Unauthorized();
        }

        approval[_tokenId] = address(0);

        owner[_tokenId] = _to;

        balance[_from] -= 1;
        balance[_to] += 1;

        emit Transfer(_from, _to, _tokenId);
    }

    function approve(address _approved, uint256 _tokenId) external {
        if (!(isOwner(_tokenId, msg.sender))) {
            revert NotOwner();
        }

        approval[_tokenId] = _approved;

        emit Approval(msg.sender, _approved, _tokenId);
    }

    function setApprovalForAll(address _operator, bool _approved) external {
        approvalForAll[msg.sender][_operator] = _approved;

        emit ApprovalForAll(msg.sender, _operator, _approved);
    }

    function getApproved(uint256 _tokenId) external view returns (address) {
        return approval[_tokenId];
    }

    function isApprovedForAll(address _owner, address _operator) external view returns (bool) {
        return approvalForAll[_owner][_operator];
    }

    function isValidToken(uint256 _tokenId) private view returns (bool) {
        return owner[_tokenId] != address(0) && _tokenId < _tokenIdCounter;
    }

    function mint() external returns (uint256) {
        owner[_tokenIdCounter] = msg.sender;
        balance[msg.sender] += 1;

        uint256 nftId = _tokenIdCounter;

        _tokenIdCounter = _tokenIdCounter + 1;

        return nftId;
    }

    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory data) public {
        if (to == address(0)) revert ZeroAddress();
        if (!isValidToken(tokenId)) revert InvalidToken();

        transferFrom(from, to, tokenId);

        if (isContract(to)) {
            bytes4 result = IERC721Receiver(to).onERC721Received(msg.sender, from, tokenId, data);
            if (result != ERC721_RECEIVED) {
                revert InvalidReceiver();
            }
        }
    }

    function safeTransferFrom(address from, address to, uint256 tokenId) public {
        safeTransferFrom(from, to, tokenId, "");
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == type(IERC721Metadata).interfaceId;
    }

    function isContract(address account) private view returns (bool) {
        return account.code.length > 0;
    }
}
