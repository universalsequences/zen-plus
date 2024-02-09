
type ContractsByChain = {
    [x: number]: Contracts;
}

type Contracts = {
    [x: string]: `0x${string}`
}

const goerliContracts: Contracts = {
    DropCreator: "0x991C1AA4d3309F26849257F9FBCc5f6a82aBc6Dc",
    MetadataRenderer: "0xf8C21e072432205f6D02a1f2F5BFc6e6Ed90Ef84",
    ZenModule: "0xcBe2142a8E578Fbc3c82E130d73b0C13D23E42f6"
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
