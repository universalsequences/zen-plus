export const { abi } = {
    "abi": [
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "renderer",
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
            "name": "MinterNotAuthorized",
            "type": "error"
        },
        {
            "inputs": [],
            "name": "TransferNotSuccessful",
            "type": "error"
        },
        {
            "inputs": [],
            "name": "WrongPrice",
            "type": "error"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": false,
                    "internalType": "address",
                    "name": "sender",
                    "type": "address"
                },
                {
                    "indexed": false,
                    "internalType": "address",
                    "name": "newRenderer",
                    "type": "address"
                }
            ],
            "name": "MetadataRendererUpdated",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": false,
                    "internalType": "address",
                    "name": "minter",
                    "type": "address"
                },
                {
                    "indexed": false,
                    "internalType": "address",
                    "name": "mintRecipient",
                    "type": "address"
                },
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "tokenId",
                    "type": "uint256"
                },
                {
                    "indexed": false,
                    "internalType": "string",
                    "name": "tokenURI",
                    "type": "string"
                }
            ],
            "name": "Mint",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": false,
                    "internalType": "address",
                    "name": "sender",
                    "type": "address"
                },
                {
                    "indexed": false,
                    "internalType": "address",
                    "name": "targetZoraDrop",
                    "type": "address"
                },
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "newMintPrice",
                    "type": "uint256"
                }
            ],
            "name": "MintPriceUpdated",
            "type": "event"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "tokenId",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "pageSize",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "page",
                    "type": "uint256"
                }
            ],
            "name": "getAllDiffsPaginated",
            "outputs": [
                {
                    "internalType": "string[]",
                    "name": "",
                    "type": "string[]"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "getAllPatches",
            "outputs": [
                {
                    "internalType": "string[]",
                    "name": "",
                    "type": "string[]"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "getAllSubPatches",
            "outputs": [
                {
                    "internalType": "string[]",
                    "name": "",
                    "type": "string[]"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "bool",
                    "name": "isSubPatch",
                    "type": "bool"
                }
            ],
            "name": "getPatchHeads",
            "outputs": [
                {
                    "components": [
                        {
                            "internalType": "string",
                            "name": "name",
                            "type": "string"
                        },
                        {
                            "internalType": "uint256",
                            "name": "revisionNumber",
                            "type": "uint256"
                        },
                        {
                            "internalType": "address",
                            "name": "author",
                            "type": "address"
                        },
                        {
                            "internalType": "uint256",
                            "name": "tokenId",
                            "type": "uint256"
                        }
                    ],
                    "internalType": "struct Commit.HeadData[]",
                    "name": "",
                    "type": "tuple[]"
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
                    "internalType": "uint256",
                    "name": "pageSize",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "page",
                    "type": "uint256"
                }
            ],
            "name": "getRevisionHistory",
            "outputs": [
                {
                    "components": [
                        {
                            "internalType": "address",
                            "name": "author",
                            "type": "address"
                        },
                        {
                            "internalType": "string",
                            "name": "name",
                            "type": "string"
                        },
                        {
                            "internalType": "string",
                            "name": "diff",
                            "type": "string"
                        },
                        {
                            "internalType": "uint256",
                            "name": "previousTokenId",
                            "type": "uint256"
                        },
                        {
                            "internalType": "uint256",
                            "name": "revisions",
                            "type": "uint256"
                        }
                    ],
                    "internalType": "struct ZenMetadataRenderer.Revision[]",
                    "name": "",
                    "type": "tuple[]"
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
            "name": "getRevisionNumber",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "dropsContractAddress",
                    "type": "address"
                },
                {
                    "internalType": "address",
                    "name": "mintRecipient",
                    "type": "address"
                },
                {
                    "internalType": "string",
                    "name": "name",
                    "type": "string"
                },
                {
                    "internalType": "string",
                    "name": "chunk",
                    "type": "string"
                },
                {
                    "internalType": "bool",
                    "name": "isSubPatch",
                    "type": "bool"
                },
                {
                    "internalType": "uint256",
                    "name": "previousTokenId",
                    "type": "uint256"
                }
            ],
            "name": "purchase",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "payable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "zoraDrop",
                    "type": "address"
                },
                {
                    "internalType": "uint256",
                    "name": "newMintPricePerToken",
                    "type": "uint256"
                }
            ],
            "name": "setMintPrice",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        }
    ],
} 
