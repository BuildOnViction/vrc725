import { Signer, BigNumberish } from "ethers";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";

import { NFTMock } from "../typechain-types";
import { signPermit, signPermitForAll } from "./shared/utils";
import { ZERO_ADDRESS } from "./shared/constants";

const firstTokenId = "5042";
const secondTokenId = "79217";
const nonExistentTokenId = "13";
const fourthTokenId = "4";
const baseURI = "https://api.example.com/v1/";
const name = "Test NFT"
const symbol = "Symbol"

const deployToken = async (): Promise<NFTMock> => {
  const [owner] = await ethers.getSigners();
  const token__factory = await ethers.getContractFactory("NFTMock");
  const token: NFTMock = await token__factory.deploy(
    name,
    symbol,
    owner.address
  );
  return token;
};

describe("Should behavior like ERC721", () => {
  let token: NFTMock;
  let owner: Signer;
  let newOwner: Signer;
  let approved: Signer;
  let anotherApproved: Signer;
  let operator: Signer;
  let other: Signer;

  beforeEach(async () => {
    [owner, newOwner, approved, anotherApproved, operator, other] =
      await ethers.getSigners();

    token = await loadFixture(deployToken);
    await token.mint(await owner.getAddress(), firstTokenId);
    await token.mint(await owner.getAddress(), secondTokenId);
  });

  describe("balanceOf", function () {
    context("when the given address owns some tokens", function () {
      it("returns the amount of tokens owned by the given address", async function () {
        expect(await token.balanceOf(owner)).to.be.equal("2");
      });
    });

    context("when the given address does not own any tokens", function () {
      it("returns 0", async function () {
        expect(await token.balanceOf(other)).to.be.equal("0");
      });
    });

    context("when querying the zero address", function () {
      it("throws", async function () {
        await expect(token.balanceOf(ZERO_ADDRESS)).to.revertedWith(
          "VRC725: address zero is not a valid owner"
        );
      });
    });
  });

  describe("ownerOf", function () {
    context("when the given token ID was tracked by this token", function () {
      const tokenId = firstTokenId;

      it("returns the owner of the given token ID", async function () {
        expect(await token.ownerOf(tokenId)).to.be.equal(
          await owner.getAddress()
        );
      });
    });

    context(
      "when the given token ID was not tracked by this token",
      function () {
        const tokenId = nonExistentTokenId;

        it("reverts", async function () {
          await expect(token.ownerOf(tokenId)).to.revertedWith(
            "VRC725: invalid token ID"
          );
        });
      }
    );
  });

  describe("transfers", function () {
    const tokenId = firstTokenId;

    beforeEach(async function () {
      await token.connect(owner).approve(approved, tokenId);
      await token.connect(owner).setApprovalForAll(operator, true);
    });

    const transferWasSuccessful = async (
      fromAddress: string,
      toAddress: string,
      tokenId: BigNumberish
    ) => {
      // transfers the ownership of the given token ID to the given address
      expect(await token.ownerOf(tokenId)).to.be.equal(toAddress);

      // clears the approval for the token ID
      expect(await token.getApproved(tokenId)).to.be.equal(ZERO_ADDRESS);

      // adjusts owners balances
      expect(await token.balanceOf(fromAddress)).to.be.equal("1");

      // adjusts owners tokens by index
      if (!token.tokenOfOwnerByIndex) return;
      expect(await token.tokenOfOwnerByIndex(toAddress, 0)).to.be.equal(
        tokenId
      );

      expect(await token.tokenOfOwnerByIndex(fromAddress, 0)).to.be.not.equal(
        tokenId
      );
    };

    context("when called by the owner", function () {
      it("should transfer successful ", async function () {
        const fromAddress: string = await owner.getAddress();
        const toAddress: string = await newOwner.getAddress();
        const tokenId: BigNumberish = firstTokenId;
        await token.transferFrom(fromAddress, toAddress, tokenId);

        await transferWasSuccessful(fromAddress, toAddress, tokenId);
      });
    });

    context("when called by the approved individual", function () {
      it("should transfer successful", async function () {
        const fromAddress: string = await owner.getAddress();
        const toAddress: string = await newOwner.getAddress();
        const tokenId: BigNumberish = firstTokenId;
        await token
          .connect(approved)
          .transferFrom(fromAddress, toAddress, tokenId);

        await transferWasSuccessful(fromAddress, toAddress, tokenId);
      });
    });

    context("when called by the operator", function () {
      it("should transfer successful", async function () {
        const fromAddress: string = await owner.getAddress();
        const toAddress: string = await newOwner.getAddress();
        const tokenId: BigNumberish = firstTokenId;
        await token
          .connect(operator)
          .transferFrom(fromAddress, toAddress, tokenId);

        await transferWasSuccessful(fromAddress, toAddress, tokenId);
      });
    });

    context("when called by the owner without an approved user", function () {
      it("should transfer successful", async function () {
        const fromAddress: string = await owner.getAddress();
        const toAddress: string = await newOwner.getAddress();
        const tokenId: BigNumberish = firstTokenId;

        await token.connect(owner).approve(ZERO_ADDRESS, tokenId);

        await token
          .connect(operator)
          .transferFrom(fromAddress, toAddress, tokenId);

        await transferWasSuccessful(fromAddress, toAddress, tokenId);
      });
    });

    context("when sent to the owner", function () {
      it("should transfer successful", async function () {
        const fromAddress: string = await owner.getAddress();
        const toAddress: string = await owner.getAddress();
        const tokenId: BigNumberish = firstTokenId;

        await token
          .connect(owner)
          .transferFrom(fromAddress, toAddress, tokenId);

        // transfers the ownership of the given token ID to the given address
        expect(await token.ownerOf(tokenId)).to.be.equal(toAddress);

        // clears the approval for the token ID
        expect(await token.getApproved(tokenId)).to.be.equal(ZERO_ADDRESS);

        // adjusts owners balances
        expect(await token.balanceOf(fromAddress)).to.be.equal("2");

        // adjusts owners tokens by index
        if (!token.tokenOfOwnerByIndex) return;
        expect(await token.tokenOfOwnerByIndex(toAddress, 0)).to.be.equal(
          tokenId
        );
      });
    });

    context("when the address of the previous owner is incorrect", function () {
      it("reverts", async function () {
        const fromAddress: string = await other.getAddress();
        const toAddress: string = await other.getAddress();
        const tokenId: BigNumberish = firstTokenId;

        await expect(
          token.connect(owner).transferFrom(fromAddress, toAddress, tokenId)
        ).to.revertedWith("VRC725: transfer from incorrect owner");
      });
    });

    context("when the sender is not authorized for the token id", function () {
      it("reverts", async function () {
        const fromAddress: string = await owner.getAddress();
        const toAddress: string = await other.getAddress();
        const tokenId: BigNumberish = firstTokenId;

        await expect(
          token.connect(other).transferFrom(fromAddress, toAddress, tokenId)
        ).to.revertedWith("VRC725: caller is not token owner or approved");
      });
    });

    context("when the given token ID does not exist", function () {
      it("reverts", async function () {
        const fromAddress: string = await owner.getAddress();
        const toAddress: string = await other.getAddress();
        const tokenId: BigNumberish = nonExistentTokenId;

        await expect(
          token.connect(owner).transferFrom(fromAddress, toAddress, tokenId)
        ).to.revertedWith("VRC725: invalid token ID");
      });
    });

    context(
      "when the address to transfer the token to is the zero address",
      function () {
        it("reverts", async function () {
          const fromAddress: string = await owner.getAddress();
          const toAddress: string = ZERO_ADDRESS;
          const tokenId: BigNumberish = firstTokenId;

          await expect(
            token.connect(owner).transferFrom(fromAddress, toAddress, tokenId)
          ).to.revertedWith("VRC725: transfer to the zero address");
        });
      }
    );
  });

  describe("approve", () => {
    const tokenId = firstTokenId;

    const shouldClearApproval = async () => {
      expect(await token.getApproved(tokenId)).to.equal(ZERO_ADDRESS);
    };

    const shouldApproval = async (address: string) => {
      expect(await token.getApproved(tokenId)).to.equal(address);
    };

    context("when clearing approval", () => {
      it("should clear approval", async () => {
        await token.connect(owner).approve(ZERO_ADDRESS, tokenId);

        await shouldClearApproval();
      });
    });

    context("when approving a non-zero address", () => {
      it("should approve", async () => {
        await token.connect(owner).approve(approved, tokenId);

        await shouldApproval(await approved.getAddress());
      });
    });

    context("when the sender does not own the given token ID", () => {
      it("Reverts", async () => {
        await expect(
          token.connect(other).approve(approved, tokenId)
        ).to.revertedWith(
          "VRC725: approve caller is not token owner or approved for all"
        );
      });
    });

    context("when the sender is approved for the given token ID", () => {
      it("Reverts", async () => {
        await token.approve(approved, tokenId);
        await expect(
          token.connect(approved).approve(approved, tokenId)
        ).to.revertedWith(
          "VRC725: approve caller is not token owner or approved for all"
        );
      });
    });

    context("when the sender is an operator", () => {
      it("should approve", async () => {
        await token
          .connect(owner)
          .setApprovalForAll(await operator.getAddress(), true);
        await token.connect(operator).approve(approved, tokenId);
        await shouldApproval(await approved.getAddress());
      });
    });

    context("when the given token ID does not exist", () => {
      it("should approve", async () => {
        await token
          .connect(owner)
          .setApprovalForAll(await operator.getAddress(), true);
        await expect(
          token.connect(operator).approve(approved, nonExistentTokenId)
        ).to.revertedWith("VRC725: invalid token ID");
      });
    });
  });

  describe("setApprovalForAll", () => {
    context("when the operator willing to approve is not the owner", () => {
      it("Should approval", async () => {
        await token
          .connect(owner)
          .setApprovalForAll(await operator.getAddress(), true);
        expect(
          await token.isApprovedForAll(
            await owner.getAddress(),
            await operator.getAddress()
          )
        ).to.equal(true);
      });

      it("can unset operator", async () => {
        await token
          .connect(owner)
          .setApprovalForAll(await operator.getAddress(), true);
        expect(
          await token.isApprovedForAll(
            await owner.getAddress(),
            await operator.getAddress()
          )
        ).to.equal(true);
        await token
          .connect(owner)
          .setApprovalForAll(await operator.getAddress(), false);
        expect(
          await token.isApprovedForAll(
            await owner.getAddress(),
            await operator.getAddress()
          )
        ).to.equal(false);
      });
    });

    context("when the operator is owner", () => {
      it("reverts", async () => {
        await expect(
          token.connect(owner).setApprovalForAll(await owner.getAddress(), true)
        ).to.revertedWith("VRC725: approve to caller");
      });
    });
  });

  describe("getApproved", () => {
    context("when token is not minted", () => {
      it("reverts", async () => {
        await expect(token.getApproved(nonExistentTokenId)).to.revertedWith(
          "VRC725: invalid token ID"
        );
      });
    });

    context("when token has been minted", () => {
      it("should return zero address", async () => {
        expect(await token.getApproved(firstTokenId)).to.equal(ZERO_ADDRESS);
      });
      context("when account has been approved", () => {
        beforeEach(async () => {
          await token
            .connect(owner)
            .approve(await approved.getAddress(), firstTokenId);
        });
        it("returns approved account", async () => {
          expect(await token.getApproved(firstTokenId)).to.equal(
            await approved.getAddress()
          );
        });
      });
    });
  });

  describe("permitForAll", () => {
    const shouldCountNonce = async (address: string) => {
      expect(await token.nonceByAddress(address)).to.eq(1);
    };

    context("when signer is owner", () => {
      it("should approve and count nonce", async () => {
        const signature = await signPermitForAll(
          owner,
          token,
          await approved.getAddress(),
          0,
          10000000000000
        );
        await token.permitForAll(
          await owner.getAddress(),
          await approved.getAddress(),
          10000000000000,
          signature
        );
        expect(
          await token.isApprovedForAll(
            await owner.getAddress(),
            await approved.getAddress()
          )
        ).to.eq(true);

        await shouldCountNonce(await owner.getAddress());
      });
    });

    context("when signer is not owner", () => {
      it("reverts", async () => {
        const signature = await signPermitForAll(
          other,
          token,
          await approved.getAddress(),
          0,
          10000000000000
        );
        await expect(
          token.permitForAll(
            await owner.getAddress(),
            await approved.getAddress(),
            10000000000000,
            signature
          )
        ).to.revertedWith("VRC725: Invalid permit signature");
      });
    });
  });

  describe("permit", () => {
    context("when signer is owner of token", () => {
      it("should approve and count nonce", async () => {
        const signature = await signPermit(
          owner,
          token,
          await approved.getAddress(),
          firstTokenId,
          0,
          10000000000000
        );
        await token.permit(
          await approved.getAddress(),
          firstTokenId,
          "10000000000000",
          signature
        );
        expect(await token.getApproved(firstTokenId)).to.eq(
          await approved.getAddress()
        );
      });
    });

    context("when signer is not owner of token", () => {
      it("reverts", async () => {
        const signature = await signPermit(
          other,
          token,
          await approved.getAddress(),
          firstTokenId,
          0,
          10000000000000
        );
        await expect(
          token.permit(
            await approved.getAddress(),
            firstTokenId,
            10000000000000,
            signature
          )
        ).to.revertedWith("VRC725: Invalid permit signature");
      });
    });
  });
});

describe("should behavior like ERC721Metadata", () => {
  let token: NFTMock;
  let owner: Signer
  beforeEach(async () => {
    [owner] = await ethers.getSigners()
    token = await loadFixture(deployToken);
  });

  describe("metadata", () => {
    it("has a name", async () => {
      expect(await token.name()).to.equal(name)
    })
    it("has a symbol", async () => {
      expect(await token.symbol()).to.equal(symbol)
    })

    describe("Token URI", () => {
      beforeEach(async () => {
        await token.mint(await owner.getAddress(), firstTokenId)
      })

      it("Return default", async () => {
        expect(await token.tokenURI(firstTokenId)).to.equal("")
      })
    })
  })
})