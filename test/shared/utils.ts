import { Signer, BigNumberish } from "ethers";
import { ethers } from "hardhat";
import { NFTMock } from "../../typechain-types";

const signPermitForAll = async (
  owner: Signer,
  collection: NFTMock,
  spenderAddress: string,
  nonce: BigNumberish,
  deadline: number
): Promise<string> => {
  const chainId = await ethers.provider.send("eth_chainId", []);

  const domain = {
    name: "Test NFT",
    version: "1",
    chainId: chainId,
    verifyingContract: await collection.getAddress(),
  };
  const types = {
    PermitForAll: [
      { name: "spender", type: "address" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
  };
  const value = {
    spender: spenderAddress,
    nonce,
    deadline,
  };
  const signature = await owner.signTypedData(domain, types, value);
  return signature;
};

const signPermit = async (
  owner: Signer,
  collection: NFTMock,
  spenderAddress: string,
  tokenId: BigNumberish,
  nonce: BigNumberish,
  deadline: number
): Promise<string> => {
  const chainId = await ethers.provider.send("eth_chainId", []);

  const domain = {
    name: "Test NFT",
    version: "1",
    chainId: chainId,
    verifyingContract: await collection.getAddress(),
  };
  const types = {
    Permit: [
      { name: "spender", type: "address" },
      { name: "tokenId", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
  };
  const value = {
    spender: spenderAddress,
    tokenId,
    nonce,
    deadline,
  };
  const signature = await owner.signTypedData(domain, types, value);
  return signature;
};

export { signPermitForAll, signPermit };
