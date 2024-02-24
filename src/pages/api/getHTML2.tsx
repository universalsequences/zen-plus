// pages/api/get-html/[tokenId].t

//import { abi } from '@/lib/abi/metadata-abi';
import { abi } from '@/lib/abi/data-abi';
import { contracts } from '@/lib/onchain/contracts';
import type { NextApiRequest, NextApiResponse } from 'next';
import Web3 from 'web3';

const Cors = require('cors');

// Define your metadata ABI and other ABIs

// Set your contract addresses and Web3 provider
// Cache for storing fetched HTML content

// Import the cors library
// Initialize the cors middleware
const cors = Cors({
    methods: ['GET', 'HEAD', 'POST'], // Set the methods you want to allow
    origin: '*', // Replace with the specific hostname you want to allow
});

// Helper method to initialize and use CORS in your API route
function runMiddleware(req: any, res: any, fn: any) {
    return new Promise((resolve, reject) => {
        fn(req, res, (result: any) => {
            if (result instanceof Error) {
                return reject(result);
            }
            return resolve(result);
        });
    });
}


async function getHTML(contractAddress: string, tokenId: string, chainId: number): Promise<string | null> {

    //const web3 = chainId === 5 ? new Web3(new Web3.providers.HttpProvider(`https://goerli.infura.io/v3/${process.env.INFURA_ID}`)) :
    //    chainId === 999 ? new Web3(new Web3.providers.HttpProvider('https://testnet.rpc.zora.energy/'))
    //        : new Web3(new Web3.providers.HttpProvider('https://rpc.zora.energy/'));
    const web3 = new Web3(new Web3.providers.HttpProvider('https://rpc.zora.energy/'));


    //const contract = new web3.eth.Contract(abi as any, contracts[chainId].MetadataRenderer);
    const contract = new web3.eth.Contract(abi as any, "0xFbc2323C23e621Db4481904594f1A46a76a7eE94");
    console.log("Hello");
    try {
        const tokenURI: string = await contract.methods.getData().call() as string;
        console.log("TOKENURI (", tokenURI, ")");
        /*
        // Check if tokenURI is base64 encoded, if not, assume it's a URL
        let metadataJSON;
        if (tokenURI.startsWith('data:application/json;base64,')) {
            metadataJSON = JSON.parse(Buffer.from(tokenURI.replace('data:application/json;base64,', ''), 'base64').toString());
        }
        console.log('metadatajson=', metadataJSON);

        // Extract the 'animation_url' field and decode it
        const base64HTML = metadataJSON.animation_url;
        console.log('animation base', base64HTML);
        const decodedHTML = Buffer.from(base64HTML.replace("data:text/html;base64,", ""), 'base64').toString();
        */

        return tokenURI;
    } catch (err) {
        console.error('An error occurred:', err);
        return null;
    }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    await runMiddleware(req, res, cors);

    const { contractAddress, tokenId, chainId } = req.query;

    let _chainId = 5;
    if (typeof chainId === "string") {
        _chainId = parseInt(chainId);
    } else if (typeof chainId === "number") {
        _chainId = chainId;
    }

    if (typeof tokenId !== 'string' || typeof contractAddress !== 'string') {
        res.status(400).send('Token ID must be a string');
        return;
    }

    try {
        let html = await getHTML(contractAddress, tokenId, _chainId);
        console.log("Html=", html);

        if (html) {
            res.send(html);
            console.log('sending html');
        } else {
            console.log('no html');
            res.status(404).send('HTML content not found');
        }
    } catch (err) {
        console.error('An error occurred:', err);
        res.status(500).send('An error occurred while fetching the HTML content.');
    }
}
