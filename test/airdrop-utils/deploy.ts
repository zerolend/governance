import { Contract, ContractFactory } from "ethers";
import { ethers, upgrades } from "hardhat";
import { Artifact } from "hardhat/types";

const getFactory = async (contractNameOrArtifact: string | Artifact) => {
  const signers = await ethers.getSigners();
  if (typeof contractNameOrArtifact === "string") {
    return await ethers.getContractFactory(contractNameOrArtifact, signers[0]);
  } else {
    return ethers.ContractFactory.fromSolidity(
      contractNameOrArtifact,
      signers[0]
    );
  }
};

export const deploy = async <T extends Contract>(
  contractNameOrArtifact: string | Artifact,
  ...args: any[]
) => {
  const signers = await ethers.getSigners();
  let factory: ContractFactory;
  if (typeof contractNameOrArtifact === "string") {
    factory = await ethers.getContractFactory(
      contractNameOrArtifact,
      signers[0]
    );
  } else {
    factory = ethers.ContractFactory.fromSolidity(
      contractNameOrArtifact,
      signers[0]
    );
  }
  const contract = (await factory.deploy(...args)) as T;
  await contract.waitForDeployment();
  return contract;
};

export const deployProxy = async <T extends Contract>(
  contractNameOrArtifact: string | Artifact,
  initializerSignature: string,
  ...args: any[]
) => {
  const factory = await getFactory(contractNameOrArtifact);
  const contract = (await upgrades.deployProxy(factory, args, {
    initializer: initializerSignature,
  })) as T; // do not initialize yet
  await contract.waitForDeployment();
  return contract;
};
