type ContractsByChain = {
    [x: number]: Contracts;
}

type Contracts = {
    [x: string]: `0x${string}`
}

const goerliContracts: Contracts = {
    DropCreator: "0x261e4f05a23B646249150A28dDB748419Fe2E60c",
    MetadataRenderer: "0x8E6274c2b9c8a613Bd3a79674dF55d29f961dDf4",
    ZenModule: "0xe877463bded3ea9e2615065196a88bb365d40a6a"
};

export const contracts: ContractsByChain = {
    5: goerliContracts
};
