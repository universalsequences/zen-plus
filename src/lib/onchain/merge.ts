import { abi } from '@/lib/abi/minter-abi';
import { MINTER_CONTRACT, DROP_CONTRACT } from '@/components/WriteOnChain';
import { decompress } from './fetch';
import { SerializedPatch } from '@/lib/nodes/types';

import { PublicClient } from 'viem';
const jsonpatch = require('fast-json-patch');

export const mergeDiffs = async (publicClient: PublicClient, tokenId: number): Promise<SerializedPatch> => {
    let diffs: any = await getDiffs(publicClient, tokenId);
    return applyDiffs(diffs);
};

export const getDiffs = async (publicClient: PublicClient, tokenId: number): Promise<any> => {
    const data: string[] = await publicClient.readContract({
        address: MINTER_CONTRACT,
        abi: abi,
        functionName: 'getAllDiffsPaginated',
        args: [tokenId, 1000, 0]
    }) as string[];

    let ret: any[] = data.map(x =>
        decompress(x) as string);

    console.log('get all diffs paginated=', ret);

    return ret;
};


export const applyDiffs = (patches: any[]) => {
    let doc = patches[patches.length - 1];
    for (let i = patches.length - 2; i >= 0; i--) {
        let diff = patches[i];
        /*
        console.log('applying doc/diff', doc, diff);
        let fixedDiff = [];
        for (let operation of diff) {
            let { op, path } = operation;
            if (op === "add" || !pathDoesNotExist(path, doc)) {
                fixedDiff.push(operation);
            } else {
                console.log('did not exist=', operation);
            }
        }
        console.log('fixed diff=', fixedDiff);
        */
        doc = jsonpatch.applyPatch(doc, diff).newDocument;
    }
    return doc;
};


const pathDoesNotExist = (path: string, doc: SerializedPatch): boolean => {
    let parts = path.split("/").filter(x => x !== "");

    let rest: any = doc;
    for (let part of parts) {
        if (!rest[part]) {
            console.log("part did not contain ", part, rest);
            return true;
        }
        rest = rest[part];
    }
    return false;
};
