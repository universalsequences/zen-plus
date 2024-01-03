import React, { useEffect, useCallback, useState } from 'react';
import { mergeDiffs } from '@/lib/onchain/merge';
import pako from 'pako';
import { MINTER_CONTRACT, DROP_CONTRACT } from './WriteOnChain';
import { usePublicClient, useContractRead } from 'wagmi'
import { CommitIcon } from '@radix-ui/react-icons'
import ProjectOption from './ProjectOption';
import { usePosition } from '@/contexts/PositionContext';;
import { usePatch, Coordinates } from '@/contexts/PatchContext';
import { Project, useStorage } from '@/contexts/StorageContext';
import { Patch } from '@/lib/nodes/types';
import { abi } from '@/lib/abi/minter-abi';
import * as erc from '@/lib/abi/erc721-abi';
import { PublicClient } from 'viem';
const jsonpatch = require('fast-json-patch');


interface Props {
    isSubPatch: boolean;
    hide: () => void;
    // actually no point in having this patch, cuz every patch is in their own
    // PatchContext

    patch: Patch;
}
const LoadProject = (props: Props) => {
    const publicClient = usePublicClient();

    const { getPatches } = useStorage();
    const { patch } = props;
    const [patches, setPatches] = useState<Project[]>([]);
    const { updatePositions, sizeIndexRef, setSizeIndex } = usePosition();
    const { loadProject } = usePatch();

    const { data, isError, isLoading } = useContractRead({
        address: MINTER_CONTRACT,
        abi: abi,
        functionName: 'getPatchHeads',
        args: [false]
    })

    const _loadPatch = useCallback((x: Project) => {
        patch.name = x.name;
        loadProject(x);
        let updates: Coordinates = {};
        let sizes = { ...sizeIndexRef.current }
        for (let node of [...patch.objectNodes, ...patch.messageNodes]) {
            updates[node.id] = node.position;
            if (node.size) {
                sizes[node.id] = node.size;
            }
        }
        setSizeIndex(sizes);
        updatePositions(updates);
        props.hide();
    }, [patch]);

    const loadPatchToken = useCallback(async (x: number) => {
        console.log("abi = ", erc.abi, x);
        const data = await publicClient.readContract({
            address: DROP_CONTRACT,
            abi: erc.abi,
            functionName: 'tokenURI',
            args: [x]
        })

        let json = base64ToJson(data as string);
        let previous_token_id = parseInt(json.previous_token_id);

        if (previous_token_id === 0) {
            _loadPatch({ name: json.name, json: { compressed: json.diff } as unknown as any });
        } else {
            let applied = await mergeDiffs(publicClient, x);
            _loadPatch({ name: json.name, json: applied as unknown as any });
        }
        patch.previousTokenId = x;

    }, [patch]);

    useEffect(() => {
        setPatches([...getPatches(props.isSubPatch ? "subpatch" : "patch")].reverse());
    }, []);

    return (
        <div className="text-xs flex flex-col h-96 w-96 select-none">
            <div className="text-base">Patches...</div>
            <div
                style={{ borderColor: "#ffffff3f", backgroundColor: "#00000012" }}
                className="flex-1 mt-4 overflow-y-scroll p-3 border ">
                {data ? [... (data as any[])].reverse().map(
                    (head, index) =>
                        <ProjectOption key={index} head={head} loadPatchToken={loadPatchToken} />) : <></>}
                {patches.map(
                    (project, index) =>
                        <div
                            key={index}
                            onClick={() => _loadPatch(project)}
                            className="flex hover:bg-zinc-300 hover:text-black p-1 cursor-pointer">
                            {project.name}
                        </div>)}
            </div>
        </div>);
}

export default LoadProject;


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
        console.error('Error parsing JSON:', e);
        return null;
    }
}

