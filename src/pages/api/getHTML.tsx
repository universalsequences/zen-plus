// pages/api/get-html/[tokenId].ts

import { abi } from '@/lib/abi/erc721-abi';
import type { NextApiRequest, NextApiResponse } from 'next';
import Web3 from 'web3';

// Define your metadata ABI and other ABIs

// Set your contract addresses and Web3 provider
const web3 = new Web3(new Web3.providers.HttpProvider(`https://goerli.infura.io/v3/${process.env.INFURA_ID}`));

// Cache for storing fetched HTML content

async function getHTML(contractAddress: string, tokenId: string): Promise<string | null> {
    const contract = new web3.eth.Contract(abi as any, contractAddress);

    try {
        const tokenURI: string = await contract.methods.tokenURI(tokenId).call() as string;
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

        return decodedHTML;
    } catch (err) {
        console.error('An error occurred:', err);
        return null;
    }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { contractAddress, tokenId } = req.query;

    if (typeof tokenId !== 'string' || typeof contractAddress !== 'string') {
        res.status(400).send('Token ID must be a string');
        return;
    }

    try {
        let html = await getHTML(contractAddress, tokenId);

        if (html) {
            res.send(html);
        } else {
            res.status(404).send('HTML content not found');
        }
    } catch (err) {
        console.error('An error occurred:', err);
        res.status(500).send('An error occurred while fetching the HTML content.');
    }
}