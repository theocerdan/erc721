import hre from "hardhat";
import {expect} from "chai";
import {BASE_URI, NAME, PRICE, SYMBOL, ZERO_ADDRESS} from "./myNFT.spec";

describe("Transfer", function () {

    describe("transferFrom()", function () {

        it("should transfer a token if user is owner", async function () {
            const myNft = await hre.ethers.deployContract("MyNFT", [NAME, SYMBOL, BASE_URI, PRICE]);
            const signers = await hre.ethers.getSigners();
            const [owner, user] = signers;

            await myNft.setSaleOpen(true);

            await myNft.mint(444, {value: PRICE});

            expect(await myNft.ownerOf(444)).to.be.equal(await owner.getAddress());

            await myNft.transferFrom(owner, user, 444);

            expect(await myNft.ownerOf(444)).to.be.equal(await user.getAddress());
        });

        it("should not transfer a token if user is not owner", async function () {
            const myNft = await hre.ethers.deployContract("MyNFT", [NAME, SYMBOL, BASE_URI, PRICE]);
            const signers = await hre.ethers.getSigners();
            const [owner, user, user2] = signers;

            await myNft.setSaleOpen(true);

            await myNft.mint(444, {value: PRICE});

            expect(await myNft.ownerOf(444)).to.be.equal(await owner.getAddress());

            await expect(myNft.connect(user).transferFrom(user, user2, 444)).to.be.revertedWithCustomError(myNft, "NotOwner");
        });

        it("should not transfer another people's token if user is not authorized", async function () {
            const myNft = await hre.ethers.deployContract("MyNFT", [NAME, SYMBOL, BASE_URI, PRICE]);
            const signers = await hre.ethers.getSigners();
            const [owner, user] = signers;

            await myNft.setSaleOpen(true);

            await myNft.mint(444, {value: PRICE});

            expect(await myNft.ownerOf(444)).to.be.equal(await owner.getAddress());

            await expect(myNft.connect(user).transferFrom(owner, user, 444)).to.be.revertedWithCustomError(myNft, "Unauthorized");
        });

        it("should transfer a token and remove specific approval on transferd token", async function () {
            const myNft = await hre.ethers.deployContract("MyNFT", [NAME, SYMBOL, BASE_URI, PRICE]);
            const signers = await hre.ethers.getSigners();
            const [owner, user] = signers;

            await myNft.setSaleOpen(true);

            await myNft.mint(444, {value: PRICE});

            expect(await myNft.ownerOf(444)).to.be.equal(await owner.getAddress());

            await myNft.approve(user.getAddress(), 444);
            expect(await myNft.getApproved(444)).to.be.equal(await user.getAddress());

            await myNft.transferFrom(owner, user, 444);
            expect(await myNft.getApproved(444)).to.be.equal(ZERO_ADDRESS);
        });

        it("should decrement and increment balance on transfer", async function () {
            const myNft = await hre.ethers.deployContract("MyNFT", [NAME, SYMBOL, BASE_URI, PRICE]);
            const signers = await hre.ethers.getSigners();
            const [owner, user] = signers;

            await myNft.setSaleOpen(true);

            await myNft.mint(444, {value: PRICE});

            expect(await myNft.balanceOf(owner)).to.be.equal(1n);
            expect(await myNft.balanceOf(user)).to.be.equal(0n);

            await myNft.transferFrom(owner, user, 444);

            expect(await myNft.balanceOf(owner)).to.be.equal(0n);
            expect(await myNft.balanceOf(user)).to.be.equal(1n);
        });

        it("should emit event when user transfer a token", async function () {
            const myNft = await hre.ethers.deployContract("MyNFT", [NAME, SYMBOL, BASE_URI, PRICE]);
            const signers = await hre.ethers.getSigners();
            const [owner, user] = signers;

            await myNft.setSaleOpen(true);

            await myNft.mint(444, {value: PRICE});

            expect(await myNft.ownerOf(444)).to.be.equal(await owner.getAddress());

            await expect(myNft.transferFrom(owner, user, 444)).to.emit(myNft, "Transfer").withArgs(
                await owner.getAddress(),
                await user.getAddress(),
                444n,
            );
        });

    });

    describe("safeTransferFrom()", function () {
        it("should revert transfer if 'to' is zero address", async function () {
            const myNft = await hre.ethers.deployContract("MyNFT", [NAME, SYMBOL, BASE_URI, PRICE]);
            const signers = await hre.ethers.getSigners();
            const [owner] = signers;

            await myNft.setSaleOpen(true);

            await myNft.mint(444, {value: PRICE});

            expect(await myNft.ownerOf(444)).to.be.equal(await owner.getAddress());

            await expect(myNft["safeTransferFrom(address,address,uint256)"](owner, ZERO_ADDRESS, 444)).to.be.revertedWithCustomError(myNft, "ZeroAddress");
        });

        it("should revert transfer if token isn't valid", async function () {
            const myNft = await hre.ethers.deployContract("MyNFT", [NAME, SYMBOL, BASE_URI, PRICE]);
            const signers = await hre.ethers.getSigners();
            const [owner, user] = signers;

            await myNft.setSaleOpen(true);

            await myNft.mint(444, {value: PRICE});

            await expect(myNft["safeTransferFrom(address,address,uint256)"](owner, user, 445)).to.be.revertedWithCustomError(myNft, "InvalidToken");
        });

        it("should exec onERC721Received if 'to' is a contract that implement IERC721Receiver", async function () {
            const myNft = await hre.ethers.deployContract("MyNFT", [NAME, SYMBOL, BASE_URI, PRICE]);
            const receiver = await hre.ethers.deployContract("Receiver");
            const signers = await hre.ethers.getSigners();
            const [owner, user] = signers;

            await myNft.setSaleOpen(true);

            await myNft.mint(444, {value: PRICE});

            await expect(myNft["safeTransferFrom(address,address,uint256)"](owner, receiver.getAddress(), 444)).to.emit(receiver, "Recieved").withArgs(
                await owner.getAddress(),
                await owner.getAddress(),
                444n,
                "0x",
            );
        });

        it("should exec onERC721Received with data payload", async function () {
            const myNft = await hre.ethers.deployContract("MyNFT", [NAME, SYMBOL, BASE_URI, PRICE]);
            const receiver = await hre.ethers.deployContract("Receiver");
            const signers = await hre.ethers.getSigners();
            const [owner, user] = signers;

            await myNft.setSaleOpen(true);

            await myNft.mint(444, {value: PRICE});

            await expect(myNft["safeTransferFrom(address,address,uint256,bytes)"](owner, receiver.getAddress(), 444, '0x01020304')).to.emit(receiver, "Recieved").withArgs(
                await owner.getAddress(),
                await owner.getAddress(),
                444n,
                '0x01020304',
            );
        });

        it("should exec onERC721Received if 'to' is a contract that not implement IERC721Receiver", async function () {
            const myNft = await hre.ethers.deployContract("MyNFT", [NAME, SYMBOL, BASE_URI, PRICE]);
            const receiver = await hre.ethers.deployContract("NotReceiver");
            const signers = await hre.ethers.getSigners();
            const [owner, user] = signers;

            await myNft.setSaleOpen(true);

            await myNft.mint(444, {value: PRICE});

            await expect(myNft["safeTransferFrom(address,address,uint256)"](owner, receiver.getAddress(), 444)).to.be.revertedWithoutReason();
        });

        it("should exec onERC721Received if 'to' is a contract that not implement IERC721Receiver well", async function () {
            const myNft = await hre.ethers.deployContract("MyNFT", [NAME, SYMBOL, BASE_URI, PRICE]);
            const receiver = await hre.ethers.deployContract("ReceiverBadReturn");
            const signers = await hre.ethers.getSigners();
            const [owner, user] = signers;

            await myNft.setSaleOpen(true);

            await myNft.mint(444, {value: PRICE});

            await expect(myNft["safeTransferFrom(address,address,uint256)"](owner, receiver.getAddress(), 444)).to.be.revertedWithCustomError(myNft, "InvalidReceiver");
        });

    });

});