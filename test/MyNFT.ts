import hre from "hardhat";
import {expect} from "chai";
import {parseEther} from "viem";
import {MyNFT} from "../typechain-types";

const NAME = "MyNFT";
const SYMBOL = "MNFT";
const BASE_URI = "https://toto.com/";
const PRICE = parseEther("0.1");

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const WEEK_IN_SECONDS = 7 * 24 * 60 * 60;

const fastForward = async (seconds: number) => {
    const block = await hre.ethers.provider.getBlock("latest");

    if (block == null)
        throw new Error("Block is null");

    const timestamp = block.timestamp + seconds;

    await hre.ethers.provider.send("evm_setNextBlockTimestamp", [timestamp]);
}

describe("MyNFT", function () {

    /*
    Fonctions external :
        tokenURI(uint256 _tokenId)
        getApproved(uint256 _tokenId)
        isApprovedForAll(address _owner, address _operator)
        supportsInterface(bytes4 interfaceId)
    Fonctions public :
        transferFrom(address _from, address _to, uint256 _tokenId)
        approve(address _approved, uint256 _tokenId)
        setApprovalForAll(address _operator, bool _approved)
        safeTransferFrom(address from, address to, uint256 tokenId, bytes memory data)
        safeTransferFrom(address from, address to, uint256 tokenId)
     */

    it("should deploy MyNFT", async function () {
        const myNft = await hre.ethers.deployContract("MyNFT", [NAME, SYMBOL, BASE_URI, PRICE]);
    });

    describe("supportsInterface()", () => {
        /*
        interfaceId == type(IERC721Metadata).interfaceId ||
               interfaceId == type(IERC721).interfaceId ||
               interfaceId == type(IERC721Enumerable).interfaceId;
         */

        //TODO: support interface
        //cas passant
        //cas non passant
        it.skip("should return true if interfaceId is supported", async () => {
            const myNft = await hre.ethers.deployContract("MyNFT", [NAME, SYMBOL, BASE_URI, PRICE]);

            const erc721enumerableInterfaceId = '0x5b5e139f'; //IERC721Metadata
            const erc721metadataInterfaceId = '0x5b5e139f'; //IERC721Metadata
            const erc721InterfaceId = '0x5b5e139f'; //IERC721Metadata

            //expect(await myNft.supportsInterface('toto')).to.be.equal(true);
        })

    });

    describe("ownerOf()", () => {

        it("should return the owner of the token", async () => {
            const myNft = await hre.ethers.deployContract("MyNFT", [NAME, SYMBOL, BASE_URI, PRICE]);
            const signers = await hre.ethers.getSigners();
            const [owner] = signers;
            const ownerAddress = await owner.getAddress();

            await myNft.setSaleOpen(true);

            await myNft.mint(0, { value: PRICE });

            expect(await myNft.ownerOf(0)).to.be.equal(ownerAddress);
        });

        it("should revert error if tokenId is not minted", async () => {
            const myNft = await hre.ethers.deployContract("MyNFT", [NAME, SYMBOL, BASE_URI, PRICE]);

            expect(await myNft.ownerOf(0)).to.be.equal(ZERO_ADDRESS);
        })

        it("should transfer ownership of tokenId", async () => {
            const myNft = await hre.ethers.deployContract("MyNFT", [NAME, SYMBOL, BASE_URI, PRICE]);
            const signers = await hre.ethers.getSigners();
            const [owner, user] = signers;

            await myNft.setSaleOpen(true);

            await myNft.mint(0, { value: PRICE });

            expect(await myNft.ownerOf(0)).to.be.equal(await owner.getAddress());

            await myNft.transferFrom(owner, user, 0);

            expect(await myNft.ownerOf(0)).to.be.equal(await user.getAddress());
        });

    });

    describe('balanceOf()', () => {
        it("should increment balance of user when minting", async () => {
            const myNft = await hre.ethers.deployContract("MyNFT", [NAME, SYMBOL, BASE_URI, PRICE]);
            const signers = await hre.ethers.getSigners();
            const [owner, user] = signers;

            await myNft.setSaleOpen(true);

            await myNft.mint(0, { value: PRICE });

            expect(await myNft.balanceOf(owner)).to.be.equal(1n);
        });

        it("should decrement balance of user when transfering", async () => {
            const myNft = await hre.ethers.deployContract("MyNFT", [NAME, SYMBOL, BASE_URI, PRICE]);
            const signers = await hre.ethers.getSigners();
            const [owner, user] = signers;

            await myNft.setSaleOpen(true);

            await myNft.mint(0, { value: PRICE });

            expect(await myNft.balanceOf(owner)).to.be.equal(1n);

            await myNft.transferFrom(owner, user, 0);

            expect(await myNft.balanceOf(owner)).to.be.equal(0n);
        });

        it("should user's balance be empty by default", async () => {
            const myNft = await hre.ethers.deployContract("MyNFT", [NAME, SYMBOL, BASE_URI, PRICE]);
            const signers = await hre.ethers.getSigners();
            const [owner, user] = signers;

            expect(await myNft.balanceOf(owner)).to.be.equal(0n);
            expect(await myNft.balanceOf(user)).to.be.equal(0n);
        });
    });

    describe("name()", function () {
        it("should return the name of the collection", async function () {
            const myNft = await hre.ethers.deployContract("MyNFT", [NAME, SYMBOL, BASE_URI, PRICE]);

            expect(await myNft.name()).to.be.equal(NAME);
        });
    });

    describe("symbol()", function () {
        it("should return the symbol of the collection", async function () {
            const myNft = await hre.ethers.deployContract("MyNFT", [NAME, SYMBOL, BASE_URI, PRICE]);

            expect(await myNft.symbol()).to.be.equal(SYMBOL);
        });
    });

    describe("baseURI()", function () {
        it("should return the base URI of the collection", async function () {
            const myNft = await hre.ethers.deployContract("MyNFT", [NAME, SYMBOL, BASE_URI, PRICE]);

            expect(await myNft.baseURI()).to.be.equal(BASE_URI);
        });
    });

    describe("totalSupply()", function () {
        it("should return the total supply of the collection", async function () {
            const myNft = await hre.ethers.deployContract("MyNFT", [NAME, SYMBOL, BASE_URI, PRICE]);

            expect(await myNft.totalSupply()).to.be.equal(0n);
        });
    });

    describe("price()", function () {
        it("should return the crowd sale price of the collection", async function () {
            const myNft = await hre.ethers.deployContract("MyNFT", [NAME, SYMBOL, BASE_URI, PRICE]);

            expect(await myNft.price()).to.be.equal(PRICE);
        });
    });

    describe("mint(), getEthersRaised(), setSaleOpen()", function () {
        it("should mint a token if sale is open", async function () {
            const myNft = await hre.ethers.deployContract("MyNFT", [NAME, SYMBOL, BASE_URI, PRICE]);

            await myNft.setSaleOpen(true);

            await myNft.mint(0, { value: PRICE });
            expect(await myNft.totalSupply()).to.be.equal(1n);
        });

        it("should revert error if user tried to mint a token if sale is close", async function () {
            const myNft = await hre.ethers.deployContract("MyNFT", [NAME, SYMBOL, BASE_URI, PRICE]);

            await myNft.setSaleOpen(false);

            await expect(myNft.mint(0, { value: PRICE })).to.be.revertedWithCustomError(myNft, "ClosedSale");
        });

        it("should sale be closed by default", async function () {
            const myNft = await hre.ethers.deployContract("MyNFT", [NAME, SYMBOL, BASE_URI, PRICE]);

            await expect(myNft.mint(0, { value: PRICE })).to.be.revertedWithCustomError(myNft, "ClosedSale");
        });

        it("should revert error if the attached value isn't sufficient", async function () {
            const myNft = await hre.ethers.deployContract("MyNFT", [NAME, SYMBOL, BASE_URI, PRICE]);

            await myNft.setSaleOpen(true);

            await expect(myNft.mint(0, { value: PRICE / 2n })).to.be.revertedWithCustomError(myNft, "InvalidPrice");
            await expect(myNft.mint(0, { value: 0 })).to.be.revertedWithCustomError(myNft, "InvalidPrice");
        });

        it("should add value to ethersRaised when user mint a token", async function () {
            const myNft = await hre.ethers.deployContract("MyNFT", [NAME, SYMBOL, BASE_URI, PRICE]);

            await myNft.setSaleOpen(true);

            await myNft.mint(0, { value: PRICE });
            expect(await myNft.getEthersRaised()).to.be.equal(PRICE);

            await myNft.mint(1, { value: PRICE });
            expect(await myNft.getEthersRaised()).to.be.equal(PRICE * 2n);
        });

        it("should not add value to ethersRaised if mint is reverted", async function () {
            const myNft = await hre.ethers.deployContract("MyNFT", [NAME, SYMBOL, BASE_URI, PRICE]);

            await myNft.setSaleOpen(true);

            try {
                //try to mint with 0 value
                await myNft.mint(0);
            } catch (e) {}

            expect(await myNft.getEthersRaised()).to.be.equal(0n);
        });

        it("should add value to smart contract when user mint a token", async function () {
            const myNft = await hre.ethers.deployContract("MyNFT", [NAME, SYMBOL, BASE_URI, PRICE]);

            await myNft.setSaleOpen(true);

            await myNft.mint(0, { value: PRICE });
            expect(await hre.ethers.provider.getBalance(await myNft.getAddress())).to.be.equal(PRICE);

            await myNft.mint(1, { value: PRICE });
            expect(await hre.ethers.provider.getBalance(await myNft.getAddress())).to.be.equal(PRICE * 2n);
        });

        it("should not mint two time the same tokenId", async function () {
            const myNft = await hre.ethers.deployContract("MyNFT", [NAME, SYMBOL, BASE_URI, PRICE]);

            await myNft.setSaleOpen(true);

            await myNft.mint(0, { value: PRICE });

            expect(myNft.mint(0, { value: PRICE })).to.be.revertedWithCustomError(myNft, "AlreadyMinted");
        });

        it("should not add value to smart contract if mint is reverted", async function () {
            const myNft = await hre.ethers.deployContract("MyNFT", [NAME, SYMBOL, BASE_URI, PRICE]);

            await myNft.setSaleOpen(true);

            try {
                //try to mint with 0 value
                await myNft.mint(0);
            } catch (e) {}

            expect(await hre.ethers.provider.getBalance(await myNft.getAddress())).to.be.equal(0n);
        });

        it.skip("should remove ether from user balance when user mint a token", async function () {
            const myNft = await hre.ethers.deployContract("MyNFT", [NAME, SYMBOL, BASE_URI, PRICE]);
            const [owner] = await hre.ethers.getSigners();

            const balance = await hre.ethers.provider.getBalance(owner.getAddress());

            await myNft.setSaleOpen(true);

            await myNft.mint(0, { value: PRICE });
            expect(await hre.ethers.provider.getBalance(owner.getAddress())).to.be.equal(balance - PRICE);

            await myNft.mint(1, { value: PRICE });
            expect(await hre.ethers.provider.getBalance(owner.getAddress())).to.be.equal(balance - PRICE * 2n);
        });

        it.skip("should not remove ether from user balance if the mint is reverted", async function () {
            const myNft = await hre.ethers.deployContract("MyNFT", [NAME, SYMBOL, BASE_URI, PRICE]);
            const [owner] = await hre.ethers.getSigners();

            const balance = await hre.ethers.provider.getBalance(owner.getAddress());

            await myNft.setSaleOpen(true);

            let fees = 0n;

            try {
                //try to mint with 0 value
                const transaction = await myNft.mint(0);
                fees = transaction.gasLimit * transaction.gasPrice;

            } catch (e) {}

            expect(await hre.ethers.provider.getBalance(await myNft.getAddress())).to.be.equal(balance - fees);
        });
    });

    describe("Sale ownership", function () {
        describe("setSaleOpen() && isSaleOpen()", function () {
            it("should close the sale if user is the sale owner", async function () {
                const myNft = await hre.ethers.deployContract("MyNFT", [NAME, SYMBOL, BASE_URI, PRICE]);

                await myNft.setSaleOpen(false);
                expect(await myNft.isSaleOpen()).to.be.equal(false);
            });

            it("should open the sale if user is the sale owner", async function () {
                const myNft = await hre.ethers.deployContract("MyNFT", [NAME, SYMBOL, BASE_URI, PRICE]);

                await myNft.setSaleOpen(true);
                expect(await myNft.isSaleOpen()).to.be.equal(true);
            });

            it("should not close the sale if user is not the sale owner", async function () {
                const myNft = await hre.ethers.deployContract("MyNFT", [NAME, SYMBOL, BASE_URI, PRICE]);
                const [owner, user] = await hre.ethers.getSigners();

                await myNft.setSaleOpen(true);

                await expect(myNft.connect(user).setSaleOpen(false)).to.be.revertedWithCustomError(myNft, "Unauthorized");
                expect(await myNft.isSaleOpen()).to.be.equal(true);
            });

            it("should not open the sale if user is not the sale owner", async function () {
                const myNft = await hre.ethers.deployContract("MyNFT", [NAME, SYMBOL, BASE_URI, PRICE]);
                const [owner, user] = await hre.ethers.getSigners();

                await myNft.setSaleOpen(false);

                await expect(myNft.connect(user).setSaleOpen(true)).to.be.revertedWithCustomError(myNft, "Unauthorized");
                expect(await myNft.isSaleOpen()).to.be.equal(false);
            });
        });

        describe("transferSaleOwner(), getSaleOwner()", function () {
            it("shoud transfer sale ownership if user is sale owner", async function () {
                const myNft = await hre.ethers.deployContract("MyNFT", [NAME, SYMBOL, BASE_URI, PRICE]);
                const [owner, user] = await hre.ethers.getSigners();

                await myNft.transferSaleOwner(user.getAddress());
                expect(await myNft.getSaleOwner()).to.be.equal(await owner.getAddress());
            });

            it("shoud transfer sale ownership if user is not sale owner", async function () {
                const myNft = await hre.ethers.deployContract("MyNFT", [NAME, SYMBOL, BASE_URI, PRICE]);
                const [owner, user] = await hre.ethers.getSigners();

                await expect(myNft.connect(user).transferSaleOwner(user.getAddress())).to.be.revertedWithCustomError(myNft, "Unauthorized");
                expect(await myNft.getSaleOwner()).to.be.equal(await owner.getAddress());
            });
        });

        describe("acceptSaleOwner(), getSaleOwner()", function () {
            it("shoud accept sale ownership if user is the pending owner", async function () {
                const myNft = await hre.ethers.deployContract("MyNFT", [NAME, SYMBOL, BASE_URI, PRICE]);
                const [owner, user] = await hre.ethers.getSigners();

                await myNft.transferSaleOwner(user.getAddress());
                expect(await myNft.getSaleOwner()).to.be.equal(await owner.getAddress());

                await myNft.connect(user).acceptSaleOwner();

                expect(await myNft.getSaleOwner()).to.be.equal(await user.getAddress());
            });

            it("shoud not accept sale ownership if user is not the pending owner", async function () {
                const myNft = await hre.ethers.deployContract("MyNFT", [NAME, SYMBOL, BASE_URI, PRICE]);
                const [owner, user, user2] = await hre.ethers.getSigners();

                await expect(myNft.connect(user2).transferSaleOwner(user.getAddress())).to.be.revertedWithCustomError(myNft, "Unauthorized");
                expect(await myNft.getSaleOwner()).to.be.equal(await owner.getAddress());
            });
        });

        describe("askWithdraw(), getEndGracePeriod()", function () {
            it ("should ask withdraw if user is the sale owner", async function () {
                const myNft = await hre.ethers.deployContract("MyNFT", [NAME, SYMBOL, BASE_URI, PRICE]);

                await myNft.askWithdraw();
            });

            it ("should not ask withdraw if user is not the sale owner", async function () {
                const myNft = await hre.ethers.deployContract("MyNFT", [NAME, SYMBOL, BASE_URI, PRICE]);
                const [owner, user] = await hre.ethers.getSigners();

                await expect(myNft.connect(user).askWithdraw()).to.be.revertedWithCustomError(myNft, "Unauthorized");
            });

            it ("should not ask withdraw two times", async function () {
                const myNft = await hre.ethers.deployContract("MyNFT", [NAME, SYMBOL, BASE_URI, PRICE]);

                await myNft.askWithdraw();
                await expect(myNft.askWithdraw()).to.be.revertedWithCustomError(myNft, "WithdrawAlreadyAsked");
            });

            it ("should ask withdraw and set end grace period to 1 week before actual block", async function () {
                const myNft = await hre.ethers.deployContract("MyNFT", [NAME, SYMBOL, BASE_URI, PRICE]);

                await myNft.askWithdraw();

                const block = await hre.ethers.provider.getBlock("latest");

                if (block == null)
                    throw new Error("Block is null");

                const timestamp = block.timestamp + WEEK_IN_SECONDS;

                expect(await myNft.getEndGracePeriod()).to.be.equal(timestamp);
            });

        });

        describe("withdraw()", function () {

            //TODO : transfer failed ?
            //TODO : cas passant

            it("should revert error during withdraw if ethers raised amount is 0", async function () {
                const myNft = await hre.ethers.deployContract("MyNFT", [NAME, SYMBOL, BASE_URI, PRICE]);
                await myNft.setSaleOpen(true);

                await myNft.askWithdraw();

                await fastForward(WEEK_IN_SECONDS);

                await expect(myNft.withdraw()).to.be.revertedWithCustomError(myNft, "NoEthersRaised");
            });

            it("should withdraw if user is the sale owner and grace period is over", async function () {
                const myNft = await hre.ethers.deployContract("MyNFT", [NAME, SYMBOL, BASE_URI, PRICE]);
                await myNft.setSaleOpen(true);

                await myNft.mint(0, { value: PRICE });

                await myNft.askWithdraw();

                await fastForward(WEEK_IN_SECONDS);

                await myNft.withdraw();
            });

            it("should not withdraw if user is the sale owner and grace period is not over", async function () {
                const myNft = await hre.ethers.deployContract("MyNFT", [NAME, SYMBOL, BASE_URI, PRICE]);
                await myNft.setSaleOpen(true);

                await myNft.mint(0, { value: PRICE });

                await myNft.askWithdraw();

                await fastForward(WEEK_IN_SECONDS / 2);

                await expect(myNft.withdraw()).to.be.revertedWithCustomError(myNft, "WithdrawNotAllowed");
            });

            it("should withdraw ethers if user is the sale owner", async function () {
                const myNft = await hre.ethers.deployContract("MyNFT", [NAME, SYMBOL, BASE_URI, PRICE]);
                await myNft.setSaleOpen(true);

                await myNft.mint(0, { value: PRICE });

                await myNft.askWithdraw();

                await fastForward(WEEK_IN_SECONDS);

                await myNft.withdraw();
            });

            it("should not withdraw ethers if user is not the sale owner", async function () {
                const myNft = await hre.ethers.deployContract("MyNFT", [NAME, SYMBOL, BASE_URI, PRICE]);
                await myNft.setSaleOpen(true);

                const [owner, user] = await hre.ethers.getSigners();

                await myNft.mint(0, { value: PRICE });

                await myNft.askWithdraw();

                await fastForward(WEEK_IN_SECONDS);

                await expect(myNft.connect(user).withdraw()).to.be.revertedWithCustomError(myNft, "Unauthorized");
            });

        });
    });

    describe("Enumerable", function () {

        describe("tokenByIndex()", function () {

            it("should retrieve tokenId by tokenIndex", async function () {
                const myNft = await hre.ethers.deployContract("MyNFT", [NAME, SYMBOL, BASE_URI, PRICE]);
                const signers = await hre.ethers.getSigners();
                const [owner, user_1, user_2] = signers;

                await myNft.setSaleOpen(true);

                await myNft.mint(100, { value: PRICE });
                await myNft.connect(user_1).mint(0, { value: PRICE });
                await myNft.connect(user_1).mint(44444, { value: PRICE });
                await myNft.connect(user_2).mint(838838383, { value: PRICE });
                await myNft.connect(user_2).mint(1, { value: PRICE });

                expect(await myNft.tokenByIndex(0)).to.be.equal(100n);
                expect(await myNft.tokenByIndex(1)).to.be.equal(0n);
                expect(await myNft.tokenByIndex(2)).to.be.equal(44444n);
                expect(await myNft.tokenByIndex(3)).to.be.equal(838838383n);
                expect(await myNft.tokenByIndex(4)).to.be.equal(1n);
            });

            it("should retrieve tokenId by tokenIndex if token is transfered", async function () {
                const myNft = await hre.ethers.deployContract("MyNFT", [NAME, SYMBOL, BASE_URI, PRICE]);
                const signers = await hre.ethers.getSigners();
                const [owner, user_1] = signers;

                await myNft.setSaleOpen(true);

                await myNft.mint(100, { value: PRICE });
                await myNft.mint(333, { value: PRICE });
                await myNft.mint(444, { value: PRICE });

                expect(await myNft.tokenByIndex(0)).to.be.equal(100n);
                expect(await myNft.tokenByIndex(1)).to.be.equal(333n);
                expect(await myNft.tokenByIndex(2)).to.be.equal(444n);

                await myNft.transferFrom(owner, user_1, 100);

                expect(await myNft.tokenByIndex(0)).to.be.equal(100n);
                expect(await myNft.tokenByIndex(1)).to.be.equal(333n);
                expect(await myNft.tokenByIndex(2)).to.be.equal(444n);
            });

            it("should revert OutOfBoundsIndex error if token isn't minted", async function () {
                const myNft = await hre.ethers.deployContract("MyNFT", [NAME, SYMBOL, BASE_URI, PRICE]);
                const signers = await hre.ethers.getSigners();

                await myNft.setSaleOpen(true);

                await myNft.mint(100, { value: PRICE });

                await expect(myNft.tokenByIndex(1)).to.be.revertedWithCustomError(myNft, "ERC721OutOfBoundsIndex");
                await expect(myNft.tokenByIndex(2)).to.be.revertedWithCustomError(myNft, "ERC721OutOfBoundsIndex");
                await expect(myNft.tokenByIndex(3)).to.be.revertedWithCustomError(myNft, "ERC721OutOfBoundsIndex");
                await expect(myNft.tokenByIndex(4)).to.be.revertedWithCustomError(myNft, "ERC721OutOfBoundsIndex");
            });

        });

        describe("tokenOfOwnerByIndex()", function () {

            it("should retrieve tokenId by owner and owner's index with tokenOfOwnerByIndex", async function () {
                const myNft = await hre.ethers.deployContract("MyNFT", [NAME, SYMBOL, BASE_URI, PRICE]);
                const signers = await hre.ethers.getSigners();
                const [owner] = signers;

                await myNft.setSaleOpen(true);

                await myNft.mint(100, { value: PRICE });

                expect(await myNft.tokenOfOwnerByIndex(owner, 0)).to.be.equal(100n);
            });

            it("should retrieve multiple token with tokenOfOwnerByIndex function", async function () {
                const myNft = await hre.ethers.deployContract("MyNFT", [NAME, SYMBOL, BASE_URI, PRICE]);
                const signers = await hre.ethers.getSigners();
                const [owner] = signers;

                await myNft.setSaleOpen(true);

                await myNft.mint(200, { value: PRICE });
                await myNft.mint(140, { value: PRICE });

                expect(await myNft.tokenOfOwnerByIndex(owner, 0)).to.be.equal(200n);
                expect(await myNft.tokenOfOwnerByIndex(owner, 1)).to.be.equal(140n);
            });

            it("should revert with OutOfBoundsIndex error if user doesn't have tokens", async function () {
                const myNft = await hre.ethers.deployContract("MyNFT", [NAME, SYMBOL, BASE_URI, PRICE]);
                const signers = await hre.ethers.getSigners();
                const [owner, user] = signers;

                await myNft.setSaleOpen(true);

                await myNft.mint(200, { value: PRICE });
                await myNft.mint(140, { value: PRICE });

                expect(myNft.tokenOfOwnerByIndex(owner, 2)).to.be.revertedWithCustomError(myNft, "ERC721OutOfBoundsIndex");
                expect(myNft.tokenOfOwnerByIndex(owner, 4)).to.be.revertedWithCustomError(myNft, "ERC721OutOfBoundsIndex");
            });

            it("should remove token from owner enumeration if token is transfered", async function () {
                const myNft = await hre.ethers.deployContract("MyNFT", [NAME, SYMBOL, BASE_URI, PRICE]);
                const signers = await hre.ethers.getSigners();
                const [owner, user] = signers;

                await myNft.setSaleOpen(true);

                await myNft.mint(200, { value: PRICE });
                await myNft.mint(140, { value: PRICE });

                await myNft.transferFrom(owner, user, 200);

                expect(await myNft.tokenOfOwnerByIndex(owner, 0)).to.be.equal(140n);
                await expect(myNft.tokenOfOwnerByIndex(owner, 1)).to.be.revertedWithCustomError(myNft, "ERC721OutOfBoundsIndex");

                expect(await myNft.connect(user).tokenOfOwnerByIndex(user, 0)).to.be.equal(200n);
                await expect(myNft.connect(user).tokenOfOwnerByIndex(user, 1)).to.be.revertedWithCustomError(myNft, "ERC721OutOfBoundsIndex");
            });

        });

    });

});
