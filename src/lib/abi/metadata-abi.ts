export const { abi } = {
    "abi": [
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "lib1",
                    "type": "address"
                },
                {
                    "internalType": "address",
                    "name": "lib2",
                    "type": "address"
                },
                {
                    "internalType": "address",
                    "name": "lib3",
                    "type": "address"
                },
                {
                    "internalType": "address",
                    "name": "glLib1",
                    "type": "address"
                },
                {
                    "internalType": "address",
                    "name": "glLib2",
                    "type": "address"
                }
            ],
            "stateMutability": "nonpayable",
            "type": "constructor"
        },
        {
            "inputs": [],
            "name": "Access_OnlyAdmin",
            "type": "error"
        },
        {
            "inputs": [],
            "name": "Address_NotInitialized",
            "type": "error"
        },
        {
            "inputs": [],
            "name": "Cannot_SetBlank",
            "type": "error"
        },
        {
            "inputs": [],
            "name": "No_MetadataAccess",
            "type": "error"
        },
        {
            "inputs": [],
            "name": "No_WildcardAccess",
            "type": "error"
        },
        {
            "inputs": [],
            "name": "Token_DoesntExist",
            "type": "error"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": false,
                    "internalType": "address",
                    "name": "",
                    "type": "address"
                }
            ],
            "name": "AudioLibraryAddress",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": false,
                    "internalType": "address",
                    "name": "",
                    "type": "address"
                }
            ],
            "name": "GLLibraryAddress",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": false,
                    "internalType": "address",
                    "name": "",
                    "type": "address"
                }
            ],
            "name": "ZenModuleInitialized",
            "type": "event"
        },
        {
            "inputs": [],
            "name": "contractURI",
            "outputs": [
                {
                    "internalType": "string",
                    "name": "",
                    "type": "string"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "tokenId",
                    "type": "uint256"
                },
                {
                    "internalType": "address",
                    "name": "target",
                    "type": "address"
                }
            ],
            "name": "generateHTML",
            "outputs": [
                {
                    "internalType": "string",
                    "name": "",
                    "type": "string"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "contractAddress",
                    "type": "address"
                }
            ],
            "name": "getDSP",
            "outputs": [
                {
                    "internalType": "string",
                    "name": "",
                    "type": "string"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "contractAddress",
                    "type": "address"
                }
            ],
            "name": "getParameters",
            "outputs": [
                {
                    "components": [
                        {
                            "internalType": "string",
                            "name": "name",
                            "type": "string"
                        },
                        {
                            "internalType": "int64",
                            "name": "min",
                            "type": "int64"
                        },
                        {
                            "internalType": "int64",
                            "name": "max",
                            "type": "int64"
                        }
                    ],
                    "internalType": "struct Parameters.Parameter[]",
                    "name": "",
                    "type": "tuple[]"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "glLibrary1",
            "outputs": [
                {
                    "internalType": "contract IData",
                    "name": "",
                    "type": "address"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "glLibrary2",
            "outputs": [
                {
                    "internalType": "contract IData",
                    "name": "",
                    "type": "address"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "bytes",
                    "name": "data",
                    "type": "bytes"
                }
            ],
            "name": "initializeWithData",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "libraryChunk1",
            "outputs": [
                {
                    "internalType": "contract IData",
                    "name": "",
                    "type": "address"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "libraryChunk2",
            "outputs": [
                {
                    "internalType": "contract IData",
                    "name": "",
                    "type": "address"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "libraryChunk3",
            "outputs": [
                {
                    "internalType": "contract IData",
                    "name": "",
                    "type": "address"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "dropAddress",
                    "type": "address"
                },
                {
                    "internalType": "uint256",
                    "name": "tokenId",
                    "type": "uint256"
                }
            ],
            "name": "onchainTokenURI",
            "outputs": [
                {
                    "internalType": "string",
                    "name": "",
                    "type": "string"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "dropAddress",
                    "type": "address"
                },
                {
                    "internalType": "uint256",
                    "name": "tokenId",
                    "type": "uint256"
                }
            ],
            "name": "tokenImage",
            "outputs": [
                {
                    "internalType": "string",
                    "name": "",
                    "type": "string"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "tokenId",
                    "type": "uint256"
                }
            ],
            "name": "tokenURI",
            "outputs": [
                {
                    "internalType": "string",
                    "name": "",
                    "type": "string"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "string",
                    "name": "base",
                    "type": "string"
                }
            ],
            "name": "ugradeViewerBase",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "target",
                    "type": "address"
                },
                {
                    "internalType": "string",
                    "name": "base",
                    "type": "string"
                }
            ],
            "name": "updateImageBase",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "bool",
                    "name": "update",
                    "type": "bool"
                }
            ],
            "name": "updateNeedsViewerBase",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "chunk",
                    "type": "address"
                }
            ],
            "name": "upgradeZenAudioLibraryChunk1",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "chunk",
                    "type": "address"
                }
            ],
            "name": "upgradeZenAudioLibraryChunk2",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "chunk",
                    "type": "address"
                }
            ],
            "name": "upgradeZenAudioLibraryChunk3",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "chunk",
                    "type": "address"
                }
            ],
            "name": "upgradeZenGLLibrary1",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "chunk",
                    "type": "address"
                }
            ],
            "name": "upgradeZenGLLibrary2",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "",
                    "type": "address"
                }
            ],
            "name": "workByContract",
            "outputs": [
                {
                    "internalType": "string",
                    "name": "contractURI",
                    "type": "string"
                },
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
                    "name": "dsp",
                    "type": "string"
                },
                {
                    "internalType": "string",
                    "name": "visuals",
                    "type": "string"
                },
                {
                    "internalType": "uint8",
                    "name": "fps",
                    "type": "uint8"
                },
                {
                    "internalType": "bool",
                    "name": "useExternalRenderer",
                    "type": "bool"
                },
                {
                    "internalType": "uint256",
                    "name": "createdAt",
                    "type": "uint256"
                },
                {
                    "internalType": "string",
                    "name": "image",
                    "type": "string"
                },
                {
                    "internalType": "string",
                    "name": "imageBase",
                    "type": "string"
                },
                {
                    "internalType": "bool",
                    "name": "isImageBaseConfigured",
                    "type": "bool"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "zenModule",
            "outputs": [
                {
                    "internalType": "contract ZenModule",
                    "name": "",
                    "type": "address"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        }
    ]
};
