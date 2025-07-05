import hre from "hardhat";
import {expect} from "chai";
import {BASE_URI, NAME, PRICE, SUPPLY, SYMBOL, ZERO_ADDRESS} from "./myNFT.spec";

describe("Approval", function () {

    it("should approve an address", async function () {
        const myNft = await hre.ethers.deployContract("MyNFT", [NAME, SYMBOL, BASE_URI, PRICE, SUPPLY]);
        const signers = await hre.ethers.getSigners();
        const [owner, user] = signers;

        await myNft.setSaleOpen(true);

        await myNft.mint(444, {value: PRICE});

        await myNft.approve(user.getAddress(), 444);

        expect(await myNft.getApproved(444)).to.be.equal(await user.getAddress());
    });

    it("should emit event when user approve an address", async function () {
        const myNft = await hre.ethers.deployContract("MyNFT", [NAME, SYMBOL, BASE_URI, PRICE, SUPPLY]);
        const signers = await hre.ethers.getSigners();
        const [owner, user] = signers;

        await myNft.setSaleOpen(true);

        await myNft.mint(444, {value: PRICE});

        await expect(myNft.approve(user.getAddress(), 444)).to.emit(myNft, "Approval").withArgs(
            await owner.getAddress(),
            await user.getAddress(),
            444n,
        );
    });

    it("should revoke approve to an approved address", async function () {
        const myNft = await hre.ethers.deployContract("MyNFT", [NAME, SYMBOL, BASE_URI, PRICE, SUPPLY]);
        const signers = await hre.ethers.getSigners();
        const [owner, user] = signers;

        await myNft.setSaleOpen(true);

        await myNft.mint(444, {value: PRICE});

        await myNft.approve(user.getAddress(), 444);

        expect(await myNft.getApproved(444)).to.be.equal(await user.getAddress());

        await myNft.approve(ZERO_ADDRESS, 444);

        expect(await myNft.getApproved(444)).to.be.equal(ZERO_ADDRESS);
    });

    it("should not approve an address if user is not the owner", async function () {
        const myNft = await hre.ethers.deployContract("MyNFT", [NAME, SYMBOL, BASE_URI, PRICE, SUPPLY]);
        const signers = await hre.ethers.getSigners();
        const [owner, user] = signers;

        await myNft.setSaleOpen(true);

        await myNft.mint(444, {value: PRICE});

        await expect(myNft.connect(user).approve(user.getAddress(), 444)).to.be.revertedWithCustomError(myNft, "NotOwner");
    });

    it("should approveAll an address", async function () {
        const myNft = await hre.ethers.deployContract("MyNFT", [NAME, SYMBOL, BASE_URI, PRICE, SUPPLY]);
        const signers = await hre.ethers.getSigners();
        const [owner, user] = signers;

        await myNft.setSaleOpen(true);

        await myNft.mint(444, {value: PRICE});

        await myNft.setApprovalForAll(user.getAddress(), true);

        expect(await myNft.isApprovedForAll(owner, user.getAddress())).to.be.equal(true);
    });

    it("should emit event when user approveAll an address", async function () {
        const myNft = await hre.ethers.deployContract("MyNFT", [NAME, SYMBOL, BASE_URI, PRICE, SUPPLY]);
        const signers = await hre.ethers.getSigners();
        const [owner, user] = signers;

        await myNft.setSaleOpen(true);

        await myNft.mint(444, {value: PRICE});

        await expect(myNft.setApprovalForAll(user.getAddress(), true)).to.emit(myNft, "ApprovalForAll").withArgs(
            await owner.getAddress(),
            await user.getAddress(),
            true,
        );
    });

    it("should revoke approveAll", async function () {
        const myNft = await hre.ethers.deployContract("MyNFT", [NAME, SYMBOL, BASE_URI, PRICE, SUPPLY]);
        const signers = await hre.ethers.getSigners();
        const [owner, user] = signers;

        await myNft.setSaleOpen(true);

        await myNft.mint(444, {value: PRICE});

        await myNft.setApprovalForAll(user.getAddress(), true);
        expect(await myNft.isApprovedForAll(owner, user.getAddress())).to.be.equal(true);

        await myNft.setApprovalForAll(user.getAddress(), false);
        expect(await myNft.isApprovedForAll(owner, user.getAddress())).to.be.equal(false);
    });
});