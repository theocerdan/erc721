import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox-viem";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-chai-matchers";
import '@typechain/hardhat'
import './tasks/tasks'

const config: HardhatUserConfig = {
  solidity: "0.8.28",
};

export default config;
