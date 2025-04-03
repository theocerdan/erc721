// contracts/MyNFT.sol
// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IERC165} from "../interfaces/IERC165.sol";
import {IERC721Metadata} from "../interfaces/IERC721Metadata.sol";
import {IERC721Enumerable} from "../interfaces/IERC721Enumerable.sol";
import {IERC721Receiver} from "../interfaces/IERC721Receiver.sol";
import {IERC721} from "../interfaces/IERC721.sol";

contract MyNFT is IERC721, IERC721Metadata, IERC721Enumerable {

    error Unauthorized();
    error NotOwner();
    error ZeroAddress();
    error InvalidToken();
    error InvalidReceiver();
    error InvalidPrice();
    error ClosedSale();
    error WithdrawAlreadyAsked();
    error NoEthersRaised();
    error WithdrawNotAllowed();
    error WithdrawNotAsked();

    /* Information */
    string private _name;
    string private _symbol;
    string private _baseURI;
    uint256 private _totalSupply;

    /* Crowd sale */
    uint256 private constant GRACE_PERIOD = 1 weeks;
    uint256 private _endGracePeriod;
    bool private _open; // TODO: Opti p-e "Booleans use 8 bits while you only need 1 bit"
    uint256 private _price;
    uint256 private _ethersRaised;
    address private _saleOwner;
    address private _pendingSaleOwner;

    mapping(address => uint256) private balance;

    mapping(uint256 => address) private owner;

    mapping(uint256 => address) private approval;

    mapping(address => mapping(address => bool)) private approvalForAll;

    bytes4 private constant ERC721_RECEIVED = 0x150b7a02;

    constructor (string memory name, string memory symbol, string memory baseURI, uint256 price) {
        _name = name;
        _symbol = symbol;
        _baseURI = baseURI;
        _totalSupply = 0;
        _open = false;

        if (price <= 0) revert InvalidPrice();
        _price = price;

        _saleOwner = msg.sender;
    }

    function baseURI() public view returns (string memory) {
        return _baseURI;
    }

    function getEthersRaised() public view returns (uint256) {
        return _ethersRaised;
    }

    function isSaleOpen() public view returns (bool) {
        return _open;
    }

    function name() external view returns (string memory) { //calldata ou memory sachant que la valeur retournée est une const
        return _name;
    }

    function symbol() external view returns (string memory) { //calldata ou memory sachant que la valeur retournée est une const
        return _symbol;
    }

    function totalSupply() external view returns (uint256) {
        return _totalSupply;
    }

    function price() external view returns (uint256) {
        return _price;
    }

    function tokenByIndex(uint256 _index) external view returns (uint256) {
        return 0;
    }

    function tokenOfOwnerByIndex(address _owner, uint256 _index) external view returns (uint256) {
        return 0;
    }

    /* Sale Ownership */
    modifier onlySaleOwner() {
        require(msg.sender == _saleOwner, Unauthorized());
        _;
    }

    function getSaleOwner() external view returns (address) {
        return _saleOwner;
    }

    function transferSaleOwner(address newOwner) external onlySaleOwner {
        _pendingSaleOwner = newOwner;
    }

    function acceptSaleOwner() external {
        require(msg.sender == _pendingSaleOwner, "Not pending owner");
        _saleOwner = msg.sender;
        _pendingSaleOwner = address(0);
    }

    function getEndGracePeriod() external view returns (uint256) {
        return _endGracePeriod;
    }

    function askWithdraw() external onlySaleOwner {
        if (_endGracePeriod != 0) revert WithdrawAlreadyAsked();
        _endGracePeriod = block.timestamp + GRACE_PERIOD;
    }

    function withdraw() external onlySaleOwner {
        if (block.timestamp < _endGracePeriod) revert WithdrawNotAllowed();
        if (_endGracePeriod == 0) revert WithdrawNotAsked();
        if (_ethersRaised == 0) revert NoEthersRaised();

        uint256 amount = _ethersRaised;
        _ethersRaised = 0;
        _endGracePeriod = 0;

        (bool success, ) = _saleOwner.call{value: amount}("");
        require(success, "Transfer failed");
    }

    function setSaleOpen(bool open) onlySaleOwner public {
        _open = open;
    }

    /*            */

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
        return owner[_tokenId] != address(0) && _tokenId < _totalSupply;
    }

    function mint() public payable {
        if (!_open) revert ClosedSale();
        if (msg.value < _price) revert InvalidPrice();

        uint256 tokenId = _mint(msg.sender);

        _ethersRaised += msg.value;

        emit Transfer(address(0), msg.sender, tokenId);
    }

    function _mint(address _to) private returns (uint256) {
        owner[_totalSupply] = _to;
        balance[_to] += 1;

        uint256 nftId = _totalSupply;

        _totalSupply = _totalSupply + 1;

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
