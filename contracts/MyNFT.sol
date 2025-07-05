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
    error AlreadyMinted(uint256 tokenId);
    error ERC721OutOfBoundsIndex(address, uint256);

    event SaleOpenChanged(bool open);
    event SaleOwnerTransferred(address previousOwner, address newOwner);
    event SaleOwnerAccepted(address previousOwner, address newOwner);
    event WithdrawRequested(address owner, uint256 endGracePeriod);
    event WithdrawCompleted(uint256 amount, address reciever);

    /* Information */
    string private _name; //je peux prefixer metadata mais j'ai ajouté un _ car ma fonction s'appelle name
    string private _symbol; // ici aussi
    string private baseURI;

    /* Crowd sale */
    uint256 public price;

    uint256 private constant GRACE_PERIOD = 1 weeks;
    uint256 private endGracePeriod;
    bool private open; // TODO: Opti p-e "Booleans use 8 bits while you only need 1 bit"
    uint256 private ethersRaised;
    address private saleOwner;
    address private pendingSaleOwner;

    /* Enumerable */
    uint256[] private allTokens;
    mapping(uint256 tokenId => uint256) private allTokensIndex;
    mapping(address owner => mapping(uint256 index => uint256)) private ownedTokens;
    mapping(uint256 tokenId => uint256) private ownedTokensIndex;

    /* Balance & Ownership */
    mapping(address owner => uint256) private balance;
    mapping(uint256 => address) private owner;

    /* Auth */
    mapping(uint256 => address) private approval;
    mapping(address => mapping(address => bool)) private approvalForAll;

    bytes4 private constant ERC721_RECEIVED = 0x150b7a02;

    modifier onlySaleOwner() {
        require(msg.sender == saleOwner, Unauthorized());
        _;
    }

    constructor (string memory defaultName, string memory defaultSymbol, string memory defaultBaseUri, uint256 defaultPrice) {
        _name = defaultName;
        _symbol = defaultSymbol;
        baseURI = defaultBaseUri;
        open = false;

        if (defaultPrice <= 0) revert InvalidPrice();
        price = defaultPrice;

        saleOwner = msg.sender;
    }

    function name() public view returns (string memory) { //calldata ou memory sachant que la valeur retournée est une const
        return _name;
    }

    function symbol() public view returns (string memory) { //calldata ou memory sachant que la valeur retournée est une const
        return _symbol;
    }

    function totalSupply() public view returns (uint256) {
        return allTokens.length;
    }

    function tokenURI(uint256 _tokenId) public view override returns (string memory) {
        if (!isValidToken(_tokenId)) revert InvalidToken();
        //marche pas avec abi.encode, c'est ce que slither me recommande mais ça plante
        return string(abi.encodePacked(baseURI, Strings.toString(_tokenId), ".json"));
    }

    function balanceOf(address _owner) public view returns (uint256) {
        return balance[_owner];
    }

    function isOperator(uint256 _tokenId, address _owner, address _operator) internal view returns (bool) {
        return approvalForAll[_owner][_operator] || approval[_tokenId] == _operator;
    }

    function ownerOf(uint256 _tokenId) public view returns (address) {
        return owner[_tokenId];
    }

    function transferFrom(address _from, address _to, uint256 _tokenId) public {
        if (_to == address(0)) revert ZeroAddress();
        if (!isValidToken(_tokenId)) revert InvalidToken();

        if (msg.sender != _from && !isOperator(_tokenId, _from, msg.sender)) {
            revert Unauthorized();
        } else if (owner[_tokenId] != _from) {
            revert NotOwner();
        }

        approval[_tokenId] = address(0);

        balance[_from] -= 1;
        balance[_to] += 1;

        owner[_tokenId] = _to;

        updateEnumeration(_from, _to, _tokenId);

        emit Transfer(_from, _to, _tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory data) public {
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

    function approve(address _approved, uint256 _tokenId) external {
        if (owner[_tokenId] != msg.sender) {
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

    function mint(uint256 _nftId) public payable {
        if (!open) revert ClosedSale();
        if (msg.value < price) revert InvalidPrice();
        if (ownerOf(_nftId) != address(0)) revert AlreadyMinted(_nftId);

        uint256 tokenId = _mint(msg.sender, _nftId);

        ethersRaised += msg.value;

        emit Transfer(address(0), msg.sender, tokenId);
    }

    function getEthersRaised() public view returns (uint256) {
        return ethersRaised;
    }

    function isSaleOpen() public view returns (bool) {
        return open;
    }

    function setSaleOpen(bool _open) onlySaleOwner public {
        open = _open;
        emit SaleOpenChanged(open);
    }

    function getSaleOwner() external view returns (address) {
        return saleOwner;
    }

    function transferSaleOwner(address newOwner) external onlySaleOwner {
        pendingSaleOwner = newOwner;
        emit SaleOwnerTransferred(saleOwner, newOwner);
    }

    function acceptSaleOwner() external {
        require(msg.sender == pendingSaleOwner, "Not pending owner");
        address previousOwner = saleOwner;

        saleOwner = msg.sender;
        pendingSaleOwner = address(0);

        emit SaleOwnerAccepted(previousOwner, msg.sender);
    }

    function getEndGracePeriod() external view returns (uint256) {
        return endGracePeriod;
    }

    function askWithdraw() external onlySaleOwner {
        if (endGracePeriod != 0) revert WithdrawAlreadyAsked();
        endGracePeriod = block.timestamp + GRACE_PERIOD;
        emit WithdrawRequested(saleOwner, endGracePeriod);
    }

    function withdraw() external onlySaleOwner {
        if (block.timestamp < endGracePeriod) revert WithdrawNotAllowed();
        if (endGracePeriod == 0) revert WithdrawNotAsked();
        if (ethersRaised == 0) revert NoEthersRaised();

        uint256 amount = ethersRaised;
        ethersRaised = 0;
        endGracePeriod = 0;

        (bool success, ) = saleOwner.call{value: amount}("");
        require(success, "Transfer failed");

        emit WithdrawCompleted(amount, saleOwner);
    }

    function tokenByIndex(uint256 _index) external view returns (uint256) {
        if (_index >= totalSupply()) revert ERC721OutOfBoundsIndex(address(0), _index);
        return allTokens[_index];
    }

    function tokenOfOwnerByIndex(address _owner, uint256 _index) external view returns (uint256) {
        if (_index >= balanceOf(_owner)) revert ERC721OutOfBoundsIndex(_owner, _index);
        return ownedTokens[_owner][_index];
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == type(IERC721Metadata).interfaceId ||
        interfaceId == type(IERC721).interfaceId ||
            interfaceId == type(IERC721Enumerable).interfaceId;
    }

    function isValidToken(uint256 _tokenId) private view returns (bool) {
        return owner[_tokenId] != address(0);
    }

    function _mint(address _to, uint256 _nftId) private returns (uint256) {
        balance[_to] += 1;

        owner[_nftId] = _to;
        addTokenToAllTokensEnumeration(_nftId);
        addTokenToOwnerEnumeration(_to, _nftId);

        return _nftId;
    }

    function isContract(address account) private view returns (bool) {
        return account.code.length > 0;
    }

    function updateEnumeration(address from, address to, uint256 tokenId) private returns (address) {
        if (from == address(0)) {
            addTokenToAllTokensEnumeration(tokenId);
        } else if (from != to) {
            removeTokenFromOwnerEnumeration(from, tokenId);
        }
        if (to == address(0)) {
            removeTokenFromAllTokensEnumeration(tokenId);
        } else if (from != to) {
            addTokenToOwnerEnumeration(to, tokenId);
        }

        return from;
    }

    /**
     * @dev Private function to add a token to this extension's ownership-tracking data structures.
     * @param to address representing the new owner of the given token ID
     * @param tokenId uint256 ID of the token to be added to the tokens list of the given address
     */
    function addTokenToOwnerEnumeration(address to, uint256 tokenId) private {
        uint256 length = balanceOf(to) - 1;
        ownedTokens[to][length] = tokenId;
        ownedTokensIndex[tokenId] = length;
    }

    /**
     * @dev Private function to add a token to this extension's token tracking data structures.
     * @param tokenId uint256 ID of the token to be added to the tokens list
     */
    function addTokenToAllTokensEnumeration(uint256 tokenId) private {
        allTokensIndex[tokenId] = allTokens.length;
        allTokens.push(tokenId);
    }

    /**
     * @dev Private function to remove a token from this extension's ownership-tracking data structures. Note that
     * while the token is not assigned a new owner, the `_ownedTokensIndex` mapping is _not_ updated: this allows for
     * gas optimizations e.g. when performing a transfer operation (avoiding double writes).
     * This has O(1) time complexity, but alters the order of the _ownedTokens array.
     * @param from address representing the previous owner of the given token ID
     * @param tokenId uint256 ID of the token to be removed from the tokens list of the given address
     */
    function removeTokenFromOwnerEnumeration(address from, uint256 tokenId) private {
        // To prevent a gap in from's tokens array, we store the last token in the index of the token to delete, and
        // then delete the last slot (swap and pop).

        uint256 lastTokenIndex = balanceOf(from);
        uint256 tokenIndex = ownedTokensIndex[tokenId];

        mapping(uint256 index => uint256) storage _ownedTokensByOwner = ownedTokens[from];

        // When the token to delete is the last token, the swap operation is unnecessary
        if (tokenIndex != lastTokenIndex) {
            uint256 lastTokenId = _ownedTokensByOwner[lastTokenIndex];

            _ownedTokensByOwner[tokenIndex] = lastTokenId; // Move the last token to the slot of the to-delete token
            ownedTokensIndex[lastTokenId] = tokenIndex; // Update the moved token's index
        }

        // This also deletes the contents at the last position of the array
        delete ownedTokensIndex[tokenId];
        delete _ownedTokensByOwner[lastTokenIndex];
    }

    /**
     * @dev Private function to remove a token from this extension's token tracking data structures.
     * This has O(1) time complexity, but alters the order of the _allTokens array.
     * @param tokenId uint256 ID of the token to be removed from the tokens list
     */
    function removeTokenFromAllTokensEnumeration(uint256 tokenId) private {
        // To prevent a gap in the tokens array, we store the last token in the index of the token to delete, and
        // then delete the last slot (swap and pop).

        uint256 lastTokenIndex = allTokens.length - 1;
        uint256 tokenIndex = allTokensIndex[tokenId];

        // When the token to delete is the last token, the swap operation is unnecessary. However, since this occurs so
        // rarely (when the last minted token is burnt) that we still do the swap here to avoid the gas cost of adding
        // an 'if' statement (like in _removeTokenFromOwnerEnumeration)
        uint256 lastTokenId = allTokens[lastTokenIndex];

        allTokens[tokenIndex] = lastTokenId; // Move the last token to the slot of the to-delete token
        allTokensIndex[lastTokenId] = tokenIndex; // Update the moved token's index

        // This also deletes the contents at the last position of the array
        delete allTokensIndex[tokenId];
        allTokens.pop();
    }
}
