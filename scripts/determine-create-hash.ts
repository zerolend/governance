import * as ethers from "ethers";
const artifact = require("../artifacts/contracts/ZeroLendTest.sol/ZeroLendTest.json");

const saltToHex = (salt: string | number) => ethers.id(salt.toString());

const encodeParams = (dataTypes: any[], data: any[]) => {
  const abiCoder = new ethers.AbiCoder();
  return abiCoder.encode(dataTypes, data);
};

const buildBytecode = (
  constructorTypes: any[],
  constructorArgs: any[],
  contractBytecode: string
) =>
  `${contractBytecode}${encodeParams(constructorTypes, constructorArgs).slice(
    2
  )}`;

const buildCreate2Address = (
  factory: string,
  saltHex: string,
  byteCode: string
) => {
  return `0x${ethers
    .keccak256(
      `0x${["ff", factory, saltHex, ethers.keccak256(byteCode)]
        .map((x) => x.replace(/0x/, ""))
        .join("")}`
    )
    .slice(-40)}`.toLowerCase();
};

function getCreate2Address(data: {
  factory: string;
  salt: string | number;
  contractBytecode: string;
  constructorTypes: string[];
  constructorArgs: any[];
}) {
  return buildCreate2Address(
    data.factory,
    saltToHex(data.salt),
    buildBytecode(
      data.constructorTypes,
      data.constructorArgs,
      data.contractBytecode
    )
  );
}

const job = async () => {
  // declare deployment parameters
  const target = "0x0000";

  let i = 0;
  while (true) {
    const salt = ethers.keccak256(ethers.toUtf8Bytes("" + i++));

    // Calculate contract address
    const computedAddress = getCreate2Address({
      factory: "0x317e6B6BCa8862F514D1FA28488DCd9211731aCC",
      salt: salt,
      contractBytecode: artifact.bytecode,
      constructorTypes: [],
      constructorArgs: [],
    }) as string;

    if (i % 10000 === 0) console.log(i);

    if (computedAddress.toLowerCase().startsWith(target.toLowerCase())) {
      console.log("salt found!!", i);
      console.log("salt", salt);
      console.log("predicted", computedAddress);
      break;
    }
  }
};

job();
