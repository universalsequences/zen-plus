
type ContractsByChain = {
    [x: number]: ContractVersions;
}

type Contracts = {
    [x: string]: `0x${string}`
}

type ContractVersions = {
    [x: number]: Contracts;
}

const goerliContracts: ContractVersions = {
    /**
       deprecreated on 3/1/2024
    DropCreator: "0xefA027cECE583d0B47D193dEB3Bb64A3063d6369",
    MetadataRenderer: "0x5caa28319dffA552C6E33c74aD21B816fEB30825",
    ZenModule: "0x5dfecc96D149b682e6289ED4Daf5694CD564Ff5F"
    */

    // created on 3/1/2024 transaction: 0x7f7bb87838511f9ca2d3398f6ae947b340ab0f9d23f3b7641d53d97d01d9f361
    // 0x96784437c143c93f45d97687f7a08a3c59a51909f7c0ab184b9413378824ec20

    /**
    DropCreator: "0x8f76541eAe8a9249C92C7d47d9A952ad29EAA26A",
    MetadataRenderer: "0xabaB430a787Ffd8e0cC8f50B6bd10DDFA9943aB5",
    ZenModule: "0xF1B9197eEB85442DF6845629847911ddAEDb87D9"
    * VERSION WITH LEGENDARY TOKEN_ID=2 ambient
    */

    2: {
        DropCreator: "0x50c5Ac7d815371B6c477B308d7356B2bD0fF6424",
        MetadataRenderer: "0x466CF4526e0c3781CE06E912A51B7f39079abb38",
        ZenModule: "0x681E7B4E513659bB6D1c18798D1D928395064CBd"
    }
};

const zoraContracts: ContractVersions = {
    //DropCreator: "0x86699fB76c8d513C0E324cf38aCD7F3Af9F910eb",
    //MetadataRenderer: "0xb7057E6590199AbF68B91b6817e9e73691E7eFD3",
    //ZenModule: "0x08047602036d96a0c8ef10f1d1fa4639929cc755"
    1: {
        DropCreator: "0x80b756Be5a9d24d7B67a78C63030e9E10cfc5DA2",
        MetadataRenderer: "0xf38Dd4D89baeFdE3831De5Ba2E62A654B21166aa",
        ZenModule: "0x25ea74dd4451015cab42c6e7905a71cf6fe31db1"
    },
    2: {
        DropCreator: "0xef72bC0a011E337C1E14683f01fe4B84BFdCe57d",
        MetadataRenderer: "0xFE2b8Fb1c4623DCc2be6995488e081B8876600d0",
        ZenModule: "0x11a207e0166223af9dead98620e2b335267c5e7c"
    }
};

const zoraGoerliContracts: Contracts = {
    //DropCreator: "0x86699fB76c8d513C0E324cf38aCD7F3Af9F910eb",
    //MetadataRenderer: "0xb7057E6590199AbF68B91b6817e9e73691E7eFD3",
    //ZenModule: "0x08047602036d96a0c8ef10f1d1fa4639929cc755"
    DropCreator: "0x6A84033218011Be47b8EcB2f6c05D99d79CE60c9",
    MetadataRenderer: "0xfF21545B3c6c07Ee31432842fb8DE5cCC0cf5FE5",
    ZenModule: "0xb27db69fdb46bddcb6a63bc47edda186d4e1f3a"
};


export const contracts: ContractsByChain = {
    5: goerliContracts,
    7777777: zoraContracts,
    //999: zoraGoerliContracts
};
