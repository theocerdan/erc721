import hre from "hardhat";
import {expect} from "chai";
import {BASE_URI, NAME, PRICE, SUPPLY, SYMBOL} from "./myNFT.spec";

describe("Enumerable", function () {

    describe("tokenByIndex()", function () {

        it("should retrieve tokenId by tokenIndex", async function () {
            const myNft = await hre.ethers.deployContract("MyNFT", [NAME, SYMBOL, BASE_URI, PRICE, SUPPLY]);
            const signers = await hre.ethers.getSigners();
            const [owner, user_1, user_2] = signers;

            await myNft.setSaleOpen(true);

            await myNft.mint(100, {value: PRICE});
            await myNft.connect(user_1).mint(0, {value: PRICE});
            await myNft.connect(user_1).mint(44444, {value: PRICE});
            await myNft.connect(user_2).mint(8388, {value: PRICE});
            await myNft.connect(user_2).mint(1, {value: PRICE});

            expect(await myNft.tokenByIndex(0)).to.be.equal(100n);
            expect(await myNft.tokenByIndex(1)).to.be.equal(0n);
            expect(await myNft.tokenByIndex(2)).to.be.equal(44444n);
            expect(await myNft.tokenByIndex(3)).to.be.equal(8388n);
            expect(await myNft.tokenByIndex(4)).to.be.equal(1n);
        });

        it("should retrieve tokenId by tokenIndex if token is transfered", async function () {
            const myNft = await hre.ethers.deployContract("MyNFT", [NAME, SYMBOL, BASE_URI, PRICE, SUPPLY]);
            const signers = await hre.ethers.getSigners();
            const [owner, user_1] = signers;

            await myNft.setSaleOpen(true);

            await myNft.mint(100, {value: PRICE});
            await myNft.mint(333, {value: PRICE});
            await myNft.mint(444, {value: PRICE});

            expect(await myNft.tokenByIndex(0)).to.be.equal(100n);
            expect(await myNft.tokenByIndex(1)).to.be.equal(333n);
            expect(await myNft.tokenByIndex(2)).to.be.equal(444n);

            await myNft.transferFrom(owner, user_1, 100);

            expect(await myNft.tokenByIndex(0)).to.be.equal(100n);
            expect(await myNft.tokenByIndex(1)).to.be.equal(333n);
            expect(await myNft.tokenByIndex(2)).to.be.equal(444n);
        });

        it("should revert OutOfBoundsIndex error if token isn't minted", async function () {
            const myNft = await hre.ethers.deployContract("MyNFT", [NAME, SYMBOL, BASE_URI, PRICE, SUPPLY]);
            const signers = await hre.ethers.getSigners();

            await myNft.setSaleOpen(true);

            await myNft.mint(100, {value: PRICE});

            await expect(myNft.tokenByIndex(1)).to.be.revertedWithCustomError(myNft, "ERC721OutOfBoundsIndex");
            await expect(myNft.tokenByIndex(2)).to.be.revertedWithCustomError(myNft, "ERC721OutOfBoundsIndex");
            await expect(myNft.tokenByIndex(3)).to.be.revertedWithCustomError(myNft, "ERC721OutOfBoundsIndex");
            await expect(myNft.tokenByIndex(4)).to.be.revertedWithCustomError(myNft, "ERC721OutOfBoundsIndex");
        });

    });

    describe("tokenOfOwnerByIndex()", function () {

        it("should retrieve tokenId by owner and owner's index with tokenOfOwnerByIndex", async function () {
            const myNft = await hre.ethers.deployContract("MyNFT", [NAME, SYMBOL, BASE_URI, PRICE, SUPPLY]);
            const signers = await hre.ethers.getSigners();
            const [owner] = signers;

            await myNft.setSaleOpen(true);

            await myNft.mint(100, {value: PRICE});

            expect(await myNft.tokenOfOwnerByIndex(owner, 0)).to.be.equal(100n);
        });

        it("should retrieve multiple token with tokenOfOwnerByIndex function", async function () {
            const myNft = await hre.ethers.deployContract("MyNFT", [NAME, SYMBOL, BASE_URI, PRICE, SUPPLY]);
            const signers = await hre.ethers.getSigners();
            const [owner] = signers;

            await myNft.setSaleOpen(true);

            await myNft.mint(200, {value: PRICE});
            await myNft.mint(140, {value: PRICE});

            expect(await myNft.tokenOfOwnerByIndex(owner, 0)).to.be.equal(200n);
            expect(await myNft.tokenOfOwnerByIndex(owner, 1)).to.be.equal(140n);
        });

        it("should revert with OutOfBoundsIndex error if user doesn't have tokens", async function () {
            const myNft = await hre.ethers.deployContract("MyNFT", [NAME, SYMBOL, BASE_URI, PRICE, SUPPLY]);
            const signers = await hre.ethers.getSigners();
            const [owner, user] = signers;

            await myNft.setSaleOpen(true);

            await myNft.mint(200, {value: PRICE});
            await myNft.mint(140, {value: PRICE});

            expect(myNft.tokenOfOwnerByIndex(owner, 2)).to.be.revertedWithCustomError(myNft, "ERC721OutOfBoundsIndex");
            expect(myNft.tokenOfOwnerByIndex(owner, 4)).to.be.revertedWithCustomError(myNft, "ERC721OutOfBoundsIndex");
        });

        it("should remove token from owner enumeration if token is transfered", async function () {
            const myNft = await hre.ethers.deployContract("MyNFT", [NAME, SYMBOL, BASE_URI, PRICE, SUPPLY]);
            const signers = await hre.ethers.getSigners();
            const [owner, user] = signers;

            await myNft.setSaleOpen(true);

            await myNft.mint(200, {value: PRICE});
            await myNft.mint(140, {value: PRICE});

            await myNft.transferFrom(owner, user, 200);

            expect(await myNft.tokenOfOwnerByIndex(owner, 0)).to.be.equal(140n);
            await expect(myNft.tokenOfOwnerByIndex(owner, 1)).to.be.revertedWithCustomError(myNft, "ERC721OutOfBoundsIndex");

            expect(await myNft.connect(user).tokenOfOwnerByIndex(user, 0)).to.be.equal(200n);
            await expect(myNft.connect(user).tokenOfOwnerByIndex(user, 1)).to.be.revertedWithCustomError(myNft, "ERC721OutOfBoundsIndex");
        });

    });

});