// test/MyNFT.sol
// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IERC165} from "../interfaces/IERC165.sol";
import {IERC721Enumerable} from "../interfaces/IERC721Enumerable.sol";
import {IERC721Metadata} from "../interfaces/IERC721Metadata.sol";
import {IERC721Receiver} from "../interfaces/IERC721Receiver.sol";
import {IERC721} from "../interfaces/IERC721.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

/*
   PS: j'ai copié collé l'implem du Enumerable, j'ai compris le but et comment ça fonctionnais mais j'ai vraiment eu chaud sur l'implementation

   Quelques points que j'ai remarqué :
   - je pense que j'ai des getters qui servent a rien
*/

contract MyNFT is IERC165, IERC721, IERC721Metadata, IERC721Enumerable {

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
    error AlreadyMinted(uint256 tokenId);
    error OutOfSupply(uint256 tokenId);
    error ERC721OutOfBoundsIndex(address, uint256);

    event SaleOpenChanged(bool open);
    event SaleOwnerTransferred(address previousOwner, address newOwner);
    event SaleOwnerAccepted(address previousOwner, address newOwner);
    event WithdrawRequested(address owner, uint256 endGracePeriod);
    event WithdrawCompleted(uint256 amount, address reciever);

    /* Information */
    string private _name;
    string private _symbol;
    string private _baseURI;
    bytes32 public commitBaseUri;
    uint256 public maxSupply;

    /* Crowd sale */
    uint256 public price;

    uint256 private constant _GRACE_PERIOD = 1 weeks;
    uint256 private _endGracePeriod;
    bool private _open; // TODO: Opti p-e "Booleans use 8 bits while you only need 1 bit"
    address private _saleOwner;
    address private _pendingSaleOwner;

    /* Enumerable */
    uint256[] private _allTokens;
    mapping(uint256 tokenId => uint256) private _allTokensIndex;
    mapping(address owner => mapping(uint256 index => uint256)) private _ownedTokens;
    mapping(uint256 tokenId => uint256) private _ownedTokensIndex;

    /* Balance & Ownership */
    mapping(address owner => uint256) private _balance;
    mapping(uint256 => address) private _owner;

    /* Auth */
    mapping(uint256 => address) private _approval;
    mapping(address => mapping(address => bool)) private _approvalForAll;

    modifier onlySaleOwner() {
        require(msg.sender == _saleOwner, Unauthorized());
        _;
    }

    constructor (string memory c_name, string memory c_symbol, string memory c_baseUri, uint256 c_price, uint256 c_supply, bytes32 c_commitBaseUri) {
        _name = c_name;
        _symbol = c_symbol;
        _baseURI = c_baseUri;
        maxSupply = c_supply;
        commitBaseUri = c_commitBaseUri;
        _open = false;

        if (c_price <= 0) revert InvalidPrice();
        price = c_price;

        _saleOwner = msg.sender;
    }

    function revealBaseUri(string memory value) external onlySaleOwner {
        if (keccak256(abi.encodePacked(value)) == commitBaseUri) {
            _baseURI = value;
        } else {
            revert("Base URI does not match the commit");
        }
    }

    function name() public view returns (string memory) { //calldata ou memory sachant que la valeur retournée est une const
        return _name;
    }

    function symbol() public view returns (string memory) { //calldata ou memory sachant que la valeur retournée est une const
        return _symbol;
    }

    function totalSupply() public view returns (uint256) {
        return _allTokens.length;
    }

    function tokenURI(uint256 _tokenId) public view override returns (string memory) {
        if (!_isValidToken(_tokenId)) revert InvalidToken();
        //marche pas avec abi.encode, c'est ce que slither me recommande mais ça plante
        return string(abi.encodePacked(_baseURI, Strings.toString(_tokenId), ".json"));
    }

    function balanceOf(address owner) public view returns (uint256) {
        return _balance[owner];
    }

    function isOperator(uint256 tokenId, address owner, address operator) internal view returns (bool) {
        return _approvalForAll[owner][operator] || _approval[tokenId] == operator;
    }

    function ownerOf(uint256 _tokenId) public view returns (address) {
        return _owner[_tokenId];
    }

    function transferFrom(address _from, address _to, uint256 _tokenId) public {
        if (_to == address(0)) revert ZeroAddress();
        if (!_isValidToken(_tokenId)) revert InvalidToken();

        if (msg.sender != _from && !isOperator(_tokenId, _from, msg.sender)) {
            revert Unauthorized();
        } else if (_owner[_tokenId] != _from) {
            revert NotOwner();
        }

        _approval[_tokenId] = address(0);

        _balance[_from] -= 1;
        _balance[_to] += 1;

        _owner[_tokenId] = _to;

        _updateEnumeration(_from, _to, _tokenId);

        emit Transfer(_from, _to, _tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory data) public {
        transferFrom(from, to, tokenId);

        if (_isContract(to)) {
            bytes4 result = IERC721Receiver(to).onERC721Received(msg.sender, from, tokenId, data);
            if (result != IERC721Receiver.onERC721Received.selector) {
                revert InvalidReceiver();
            }
        }
    }

    function safeTransferFrom(address from, address to, uint256 tokenId) public {
        safeTransferFrom(from, to, tokenId, "");
    }

    function approve(address _approved, uint256 _tokenId) external {
        if (_owner[_tokenId] != msg.sender) {
            revert NotOwner();
        }

        _approval[_tokenId] = _approved;

        emit Approval(msg.sender, _approved, _tokenId);
    }

    function setApprovalForAll(address _operator, bool _approved) external {
        _approvalForAll[msg.sender][_operator] = _approved;

        emit ApprovalForAll(msg.sender, _operator, _approved);
    }

    function getApproved(uint256 _tokenId) external view returns (address) {
        return _approval[_tokenId];
    }

    function isApprovedForAll(address owner, address operator) external view returns (bool) {
        return _approvalForAll[owner][operator];
    }

    function mint(uint256 _nftId) public payable {
        if (!_open) revert ClosedSale();
        if (msg.value < price) revert InvalidPrice();
        if (ownerOf(_nftId) != address(0)) revert AlreadyMinted(_nftId);
        if (_nftId >= maxSupply) revert OutOfSupply(_nftId);

        uint256 tokenId = _mint(msg.sender, _nftId);

        emit Transfer(address(0), msg.sender, tokenId);
    }

    function isSaleOpen() public view returns (bool) {
        return _open;
    }

    function setSaleOpen(bool open) onlySaleOwner public {
        _open = open;
        emit SaleOpenChanged(open);
    }

    function getSaleOwner() external view returns (address) {
        return _saleOwner;
    }

    function transferSaleOwner(address newOwner) external onlySaleOwner {
        _pendingSaleOwner = newOwner;
        emit SaleOwnerTransferred(_saleOwner, newOwner);
    }

    function acceptSaleOwner() external {
        require(msg.sender == _pendingSaleOwner, "Not pending owner");
        address previousOwner = _saleOwner;

        _saleOwner = msg.sender;
        _pendingSaleOwner = address(0);

        emit SaleOwnerAccepted(previousOwner, msg.sender);
    }

    function getEndGracePeriod() external view returns (uint256) {
        return _endGracePeriod;
    }

    function askWithdraw() external onlySaleOwner {
        if (_endGracePeriod != 0) revert WithdrawAlreadyAsked();
        _endGracePeriod = block.timestamp + _GRACE_PERIOD;
        emit WithdrawRequested(_saleOwner, _endGracePeriod);
    }

    function withdraw() external onlySaleOwner {
        if (block.timestamp < _endGracePeriod) revert WithdrawNotAllowed();
        if (_endGracePeriod == 0) revert WithdrawNotAsked();

        uint256 amount = address(this).balance;
        _endGracePeriod = 0;

        (bool success, ) = _saleOwner.call{value: amount}("");
        require(success, "Transfer failed");

        emit WithdrawCompleted(amount, _saleOwner);
    }

    function tokenByIndex(uint256 _index) external view returns (uint256) {
        if (_index >= totalSupply()) revert ERC721OutOfBoundsIndex(address(0), _index);
        return _allTokens[_index];
    }

    function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256) {
        if (index >= balanceOf(owner)) revert ERC721OutOfBoundsIndex(owner, index);
        return _ownedTokens[owner][index];
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == type(IERC721Metadata).interfaceId ||
        interfaceId == type(IERC721).interfaceId ||
            interfaceId == type(IERC721Enumerable).interfaceId || interfaceId == type(IERC165).interfaceId;
    }

    function _isValidToken(uint256 _tokenId) private view returns (bool) {
        return _owner[_tokenId] != address(0);
    }

    function _mint(address _to, uint256 _nftId) private returns (uint256) {
        _balance[_to] += 1;

        _owner[_nftId] = _to;
        _addTokenToAllTokensEnumeration(_nftId);
        _addTokenToOwnerEnumeration(_to, _nftId);

        return _nftId;
    }

    function _isContract(address account) private view returns (bool) {
        return account.code.length > 0;
    }

    function _updateEnumeration(address from, address to, uint256 tokenId) private returns (address) {
        if (from == address(0)) {
            _addTokenToAllTokensEnumeration(tokenId);
        } else if (from != to) {
            _removeTokenFromOwnerEnumeration(from, tokenId);
        }
        if (to == address(0)) {
            _removeTokenFromAllTokensEnumeration(tokenId);
        } else if (from != to) {
            _addTokenToOwnerEnumeration(to, tokenId);
        }

        return from;
    }

    /**
     * @dev Private function to add a token to this extension's ownership-tracking data structures.
     * @param to address representing the new owner of the given token ID
     * @param tokenId uint256 ID of the token to be added to the tokens list of the given address
     */
    function _addTokenToOwnerEnumeration(address to, uint256 tokenId) private {
        uint256 length = balanceOf(to) - 1;
        _ownedTokens[to][length] = tokenId;
        _ownedTokensIndex[tokenId] = length;
    }

    /**
     * @dev Private function to add a token to this extension's token tracking data structures.
     * @param tokenId uint256 ID of the token to be added to the tokens list
     */
    function _addTokenToAllTokensEnumeration(uint256 tokenId) private {
        _allTokensIndex[tokenId] = _allTokens.length;
        _allTokens.push(tokenId);
    }

    /**
     * @dev Private function to remove a token from this extension's ownership-tracking data structures. Note that
     * while the token is not assigned a new owner, the `_ownedTokensIndex` mapping is _not_ updated: this allows for
     * gas optimizations e.g. when performing a transfer operation (avoiding double writes).
     * This has O(1) time complexity, but alters the order of the _ownedTokens array.
     * @param from address representing the previous owner of the given token ID
     * @param tokenId uint256 ID of the token to be removed from the tokens list of the given address
     */
    function _removeTokenFromOwnerEnumeration(address from, uint256 tokenId) private {
        // To prevent a gap in from's tokens array, we store the last token in the index of the token to delete, and
        // then delete the last slot (swap and pop).

        uint256 lastTokenIndex = balanceOf(from);
        uint256 tokenIndex = _ownedTokensIndex[tokenId];

        mapping(uint256 index => uint256) storage _ownedTokensByOwner = _ownedTokens[from];

        // When the token to delete is the last token, the swap operation is unnecessary
        if (tokenIndex != lastTokenIndex) {
            uint256 lastTokenId = _ownedTokensByOwner[lastTokenIndex];

            _ownedTokensByOwner[tokenIndex] = lastTokenId; // Move the last token to the slot of the to-delete token
            _ownedTokensIndex[lastTokenId] = tokenIndex; // Update the moved token's index
        }

        // This also deletes the contents at the last position of the array
        delete _ownedTokensIndex[tokenId];
        delete _ownedTokensByOwner[lastTokenIndex];
    }

    /**
     * @dev Private function to remove a token from this extension's token tracking data structures.
     * This has O(1) time complexity, but alters the order of the _allTokens array.
     * @param tokenId uint256 ID of the token to be removed from the tokens list
     */
    function _removeTokenFromAllTokensEnumeration(uint256 tokenId) private {
        // To prevent a gap in the tokens array, we store the last token in the index of the token to delete, and
        // then delete the last slot (swap and pop).

        uint256 lastTokenIndex = _allTokens.length - 1;
        uint256 tokenIndex = _allTokensIndex[tokenId];

        // When the token to delete is the last token, the swap operation is unnecessary. However, since this occurs so
        // rarely (when the last minted token is burnt) that we still do the swap here to avoid the gas cost of adding
        // an 'if' statement (like in _removeTokenFromOwnerEnumeration)
        uint256 lastTokenId = _allTokens[lastTokenIndex];

        _allTokens[tokenIndex] = lastTokenId; // Move the last token to the slot of the to-delete token
        _allTokensIndex[lastTokenId] = tokenIndex; // Update the moved token's index

        // This also deletes the contents at the last position of the array
        delete _allTokensIndex[tokenId];
        _allTokens.pop();
    }
}
