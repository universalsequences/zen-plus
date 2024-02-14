
type ContractsByChain = {
    [x: number]: Contracts;
}

type Contracts = {
    [x: string]: `0x${string}`
}

const goerliContracts: Contracts = {
    DropCreator: "0xefA027cECE583d0B47D193dEB3Bb64A3063d6369",
    MetadataRenderer: "0x5caa28319dffA552C6E33c74aD21B816fEB30825",
    ZenModule: "0x5dfecc96D149b682e6289ED4Daf5694CD564Ff5F"
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
