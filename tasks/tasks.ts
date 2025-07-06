import {task} from "hardhat/config";
import {parseEther} from "viem";
import {ethers} from "ethers";

const NAME = "MyNFT";
const SYMBOL = "MNFT";
const BEFORE_URI = "https://nothidden.com/";
const SUPPLY = 999999;
const PRICE = parseEther("0.1");

const AFTER_URI = "https://hidden.com/";
const AFTER_URI_COMMIT = ethers.solidityPackedKeccak256(
    ["string"],
    [AFTER_URI]
);

task("deploy-nft", "Deploys the MyNFT contract")
    .setAction(async (taskArgs, hre) => {
            const nftcontract = await hre.ethers.getContractFactory("MyNFT");

            const deployed = await nftcontract.deploy(NAME, SYMBOL, BEFORE_URI, PRICE, SUPPLY, AFTER_URI_COMMIT)

            console.log(`Deployed MyNFT contract at address: ${await deployed.getAddress()}`);
        }
    );

task("mint-nft", "Mints an NFT")
    .addParam("contract", "The NFT contract address")
    .addOptionalParam("tokenid", "The NFT token ID", "0")
    .setAction(async (taskArgs, hre) => {
            const nftcontract = await hre.ethers.getContractAt("MyNFT", taskArgs.contract);

            await nftcontract.mint(taskArgs.tokenid, { value: PRICE });
        }
    );


task("open-sale", "Mints an NFT")
    .addParam("contract", "The NFT contract address")
    .setAction(async (taskArgs, hre) => {
            const nftcontract = await hre.ethers.getContractAt("MyNFT", taskArgs.contract);

            await nftcontract.setSaleOpen(true);
        }
    );


task("get-nft", "Gets the NFT metadata")
    .addParam("contract", "The NFT contract address")
    .addParam("tokenid", "The NFT token ID")
    .setAction(async (taskArgs, hre) => {
            const nftcontract = await hre.ethers.getContractAt("MyNFT", taskArgs.contract);
            const tokenURI = await nftcontract.tokenURI(BigInt(taskArgs.tokenid));
            const owner = await nftcontract.ownerOf(BigInt(taskArgs.tokenid));
            console.log(`Owner: ${owner}`);
            console.log(`Token URI: ${tokenURI}`);
        }
    );

task("commit-uri", "Commits the new token URI")
    .addParam("contract", "The NFT contract address")
    .addParam("afteruri", "The new token URI")
    .setAction(async (taskArgs, hre) => {
            const nftcontract = await hre.ethers.getContractAt("MyNFT", taskArgs.contract);

            await nftcontract.revealBaseUri(taskArgs.afteruri);
        }
    );
