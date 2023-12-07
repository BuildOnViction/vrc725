import { ethers } from "hardhat"
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";

import { NFTMock, VRC725Helper } from "../typechain-types"
import { signPermit, signPermitForAll } from "./shared/utils";

const deployTestNFT = async (): Promise<[NFTMock, VRC725Helper]> => {
    const [owner] = await ethers.getSigners()
    const testNFT__factory = await ethers.getContractFactory("NFTMock")
    const testNFT: NFTMock = await testNFT__factory.deploy("Test NFT", "NFT", owner.address)

    const vrc725Helper__factory = await ethers.getContractFactory("VRC725Helper")
    const vrc725Helper: VRC725Helper = await vrc725Helper__factory.deploy("Helper", "HELPER", 0)
    return [testNFT, vrc725Helper]
}

describe("VRC725 Helper Unittest", () => {
    let testNFT: NFTMock
    let helper: VRC725Helper
    before(async () => {
        [testNFT, helper] = await loadFixture(deployTestNFT)
    })

    it("Should mint NFT", async () => {
        const [owner] = await ethers.getSigners()
        await testNFT.mint(owner.address, 1)
        
        expect(await testNFT.ownerOf(1)).to.eq(owner.address)
    })

    it("Permit through Helper", async () => {
        const [owner, spender] = await ethers.getSigners()
        const signature = await signPermit(owner, testNFT, spender.address, 1, 0, 10000000000000)

        await helper.permit(await testNFT.getAddress(), spender.address, 1, 10000000000000, signature)
        expect(await testNFT.getApproved(1)).to.eq(spender.address)
    })

    it("Permit for all through Helper", async () => {
        const [owner, spender] = await ethers.getSigners()
        const signature = await signPermitForAll(owner, testNFT, spender.address, 0, 10000000000000)

        await helper.permitForAll(await testNFT.getAddress(), owner.address, spender.address, 10000000000000, signature)
        expect(await testNFT.isApprovedForAll(owner.address, spender.address)).to.eq(true)
        expect(await testNFT.nonceByAddress(owner.address)).to.eq(1)
    })

    it("Transfer though Helper", async () => {
        const [owner, receiver] = await ethers.getSigners()
        const signature = await signPermitForAll(owner, testNFT, await helper.getAddress(), 1, 10000000000000)

        await helper.permitForAll(await testNFT.getAddress(), owner.address, await helper.getAddress(), 10000000000000, signature)
        await helper.transferNFT(await testNFT.getAddress(), receiver.address, 1)

        expect(await testNFT.ownerOf(1)).to.eq(receiver.address)
    })

    it("Multi call", async () => {
        const [owner, receiver] = await ethers.getSigners()
        await testNFT.mint(owner.address, 2)

        const signature = await signPermitForAll(owner, testNFT, await helper.getAddress(), 2, 10000000000000)


        const permitData = helper.interface.encodeFunctionData("permitForAll", [await testNFT.getAddress(), owner.address, await helper.getAddress(), 10000000000000, signature])
        const transferData = helper.interface.encodeFunctionData("transferNFT", [await testNFT.getAddress(), receiver.address, 2])
        await helper.multicall([permitData, transferData])
        expect(await testNFT.ownerOf(2)).to.eq(receiver.address)
    })
})