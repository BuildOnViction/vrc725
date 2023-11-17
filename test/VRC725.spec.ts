import { ethers } from "hardhat"
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";

import { TestNFT } from "../typechain-types"
import { TestNFT__factory } from "../typechain-types/factories/contracts/tests"

const deployTestNFT = async (): Promise<TestNFT> => {
    const [owner] = await ethers.getSigners()
    const testNFT__factory: TestNFT__factory = await ethers.getContractFactory("TestNFT")
    const testNFT: TestNFT = testNFT__factory.deploy("Test NFT", "NFT", owner.address)
    return testNFT
}

describe("VRC725 Basic Unittest", () => {
    let testNFT: TestNFT
    before(async () => {
        testNFT = await loadFixture(deployTestNFT)
    })

    it("Should mint NFT", async () => {
        const [owner] = await ethers.getSigners()
        await testNFT.mint(owner.address, 1)
        
        expect(await testNFT.ownerOf(1)).to.eq(owner.address)
    })
})