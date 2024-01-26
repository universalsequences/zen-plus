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

const zoraContracts: Contracts = {
    DropCreator: "0x86699fB76c8d513C0E324cf38aCD7F3Af9F910eb",
    MetadataRenderer: "0xb7057E6590199AbF68B91b6817e9e73691E7eFD3",
    ZenModule: "0x08047602036d96a0c8ef10f1d1fa4639929cc755"
};

export const contracts: ContractsByChain = {
    5: goerliContracts,
    7777777: zoraContracts
};
