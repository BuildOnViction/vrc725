import { ethers } from "hardhat"
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";

import { TestNFT } from "../typechain-types"
import { signPermitForAll } from "./shared/utils";



const deployTestNFT = async (): Promise<TestNFT> => {
    const [owner] = await ethers.getSigners()
    const testNFT__factory = await ethers.getContractFactory("TestNFT")
    const testNFT: TestNFT = await testNFT__factory.deploy("Test NFT", "NFT", owner.address)
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

    it("Permit for all", async () => {
        const [owner, spender] = await ethers.getSigners()
        const signature = await signPermitForAll(owner, testNFT, spender.address, 0, 10000000000000)

        await testNFT.permitForAll(owner.address, spender.address, 0, 10000000000000, signature)
        expect(await testNFT.isApprovedForAll(owner.address, spender.address)).to.eq(true)
        expect(await testNFT.isUsedNonce(owner.address, 0)).to.eq(true)
    })
})