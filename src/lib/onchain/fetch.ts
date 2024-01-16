import { PublicClient } from 'viem';
import { getDiffs, applyDiffs } from './merge';
import pako from 'pako';
import { MINTER_CONTRACT, DROP_CONTRACT } from '@/components/WriteOnChain';
import * as erc from '@/lib/abi/erc721-abi';
import { SerializedPatch } from '@/lib/nodes/types';

export interface OnchainSubPatch {
    id: string;
    //tokenId: number;
    name: string;
}

export interface Revision {
    tokenId: number;
    name: string;
}

export const fetchRevisions = async (publicClient: PublicClient, tokenId: number): Promise<Revision[]> => {
    let tokenIds = [tokenId];
    let json = await fetchTokenURI(publicClient, tokenId);
    let names = [json.name];
    let prevTokenId = json.previous_token_id

    let revs: Revision[] = [{ name: json.name, tokenId }];

    while (prevTokenId != 0) {
        json = await fetchTokenURI(publicClient, prevTokenId);
        prevTokenId = json.previous_token_id
        tokenIds.push(prevTokenId);
        names.push(json.name);
        revs.push({
            name: json.name,
            tokenId: prevTokenId
        });
    }
    return revs;

    /*
    console.log("names/tokens/diffs", names, tokenIds);
    for (let i = 0; i < Math.min(tokenIds.length, names.length); i++) {
        let diffs = await getDiffs(publicClient, tokenIds[i]);
        let applied = applyDiffs(diffs);
        console.log(applied);
        revs.push({
            name: names[i],
            tokenId: tokenIds[i],
            patch: applied
        });
    }

    return revs;
    */
};

export const fetchOnchainSubPatch = async (publicClient: PublicClient, tokenId: number): Promise<SerializedPatch> => {
    let uri = await fetchTokenURI(publicClient, tokenId);
    let diff = uri.diff;

    let decompressed = decompress(diff);
    return decompressed;
};

const fetchTokenURI = async (publicClient: PublicClient, tokenId: number): Promise<any> => {
    const data = await publicClient.readContract({
        address: DROP_CONTRACT,
        abi: erc.abi,
        functionName: 'tokenURI',
        args: [tokenId]
    })

    let json = base64ToJson(data as string);
    return json;
};

function base64ToJson(base64String: string) {
    // Step 1: Extract the Base64 encoded string (if it's part of a data URI)
    const splitData = base64String.split(',');
    const encodedString = splitData.length > 1 ? splitData[1] : base64String;

    // Step 2: Decode the Base64 string
    const decodedString = atob(encodedString);

    // Step 3: Parse the JSON
    try {
        const json = JSON.parse(decodedString);
        return json;
    } catch (e) {
        return null;
    }
}

export const decompress = (compressed: any): any => {
    const binaryBuffer = Buffer.from(compressed, 'base64');

    // Decompress the data using Pako
    const decompressed = pako.inflate(binaryBuffer, { to: 'string' });
    let _json = JSON.parse(decompressed);
    return _json;
};

