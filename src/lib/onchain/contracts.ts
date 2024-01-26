type ContractsByChain = {
    [x: number]: Contracts;
}

type Contracts = {
    [x: string]: `0x${string}`
}

const goerliContracts: Contracts = {
    DropCreator: "0xdf5760ACd3e4Cc50eC9f43D7a39abaF38a570742",
    MetadataRenderer: "0x4201b293a49615d8f6aA8fE34aD6791a2C371Ff7",
    ZenModule: "0x5412f942505925199517a4d77612e1356ca1cb0e"
};

export const contracts: ContractsByChain = {
    5: goerliContracts
};
