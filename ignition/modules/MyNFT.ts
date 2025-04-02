// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const MyNFTModule = buildModule("MyNFT", (m) => {

  const myNft = m.contract("MyNFT");

  return { myNft };
});

export default MyNFTModule;
