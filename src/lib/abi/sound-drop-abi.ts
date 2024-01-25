export const { abi } = {
    "abi": [
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "_metadataRenderer",
                    "type": "address"
                }
            ],
            "stateMutability": "nonpayable",
            "type": "constructor"
        },
        {
            "inputs": [],
            "name": "DEFAULT_ADMIN_ROLE",
            "outputs": [
                {
                    "internalType": "bytes32",
                    "name": "",
                    "type": "bytes32"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "MINTER_ROLE",
            "outputs": [
                {
                    "internalType": "bytes32",
                    "name": "",
                    "type": "bytes32"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "components": [
                        {
                            "internalType": "string",
                            "name": "name",
                            "type": "string"
                        },
                        {
                            "internalType": "string",
                            "name": "description",
                            "type": "string"
                        },
                        {
                            "internalType": "string",
                            "name": "collectionImage",
                            "type": "string"
                        },
                        {
                            "internalType": "string",
                            "name": "dsp",
                            "type": "string"
                        },
                        {
                            "internalType": "string",
                            "name": "visuals",
                            "type": "string"
                        },
                        {
                            "internalType": "string[]",
                            "name": "parameterNames",
                            "type": "string[]"
                        },
                        {
                            "internalType": "int64[]",
                            "name": "minValues",
                            "type": "int64[]"
                        },
                        {
                            "internalType": "int64[]",
                            "name": "maxValues",
                            "type": "int64[]"
                        },
                        {
                            "internalType": "string[]",
                            "name": "inputs",
                            "type": "string[]"
                        },
                        {
                            "internalType": "string[]",
                            "name": "outputs",
                            "type": "string[]"
                        }
                    ],
                    "internalType": "struct SoundDropCreator.DropInfo",
                    "name": "data",
                    "type": "tuple"
                },
                {
                    "internalType": "uint104",
                    "name": "price",
                    "type": "uint104"
                },
                {
                    "internalType": "uint64",
                    "name": "editionSize",
                    "type": "uint64"
                }
            ],
            "name": "newDrop",
            "outputs": [
                {
                    "internalType": "address",
                    "name": "",
                    "type": "address"
                }
            ],
            "stateMutability": "nonpayable",
            "type": "function"
        }
    ]
};
