import React, { useEffect, useCallback, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { mergeDiffs } from '@/lib/onchain/merge';
import pako from 'pako';
import { MINTER_CONTRACT, DROP_CONTRACT } from './WriteOnChain';
import { usePublicClient, useContractRead } from 'wagmi'
import { CommitIcon } from '@radix-ui/react-icons'
import ProjectOption from './ProjectOption';
import { usePosition } from '@/contexts/PositionContext';;
import { usePatch, Coordinates } from '@/contexts/PatchContext';
import { Project, useStorage } from '@/contexts/StorageContext';
import { SerializedPatch, Patch } from '@/lib/nodes/types';
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

    const { fetchPatch, fetchPatchesForEmail } = useStorage();
    const { patch } = props;
    const [patches, setPatches] = useState<Project[]>([]);
    const { updatePositions, sizeIndexRef, setSizeIndex } = usePosition();
    const { loadProjectPatch, loadProject } = usePatch();

    let [projects, setProjects] = useState<any[]>([]);

    let { user } = useAuth();

    useEffect(() => {
        if (user) {
            fetchPatchesForEmail(user.email).then(
                setProjects);
        }
    }, [user]);

    const _loadPatch = useCallback((x: Project) => {
        // patch.name = x.name;
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

    const loadPatchToken = useCallback(async (saved: any) => {
        let serialized = await fetchPatch(saved);
        loadProjectPatch(serialized);
        /*
        let item = window.localStorage.getItem("patch.beat-fusion relative");
        if (!item) {
            return;
        }
        */
        //let serialized = JSON.parse(item) as SerializedPatch;
        //loadProjectPatch(serialized);

        // patch.name = saved.name;
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
        patch.previousDocId = saved.id;
        patch.previousSerializedPatch = serialized;
        props.hide();
    }, [patch]);

    return (
        <div className="text-xs flex flex-col h-96 w-96 select-none">
            <div className="text-base">Patches...</div>
            <div
                style={{ borderColor: "#ffffff3f", backgroundColor: "#00000012" }}
                className="flex-1 mt-4 overflow-y-scroll p-3 border ">
                {[... (projects as any[])].reverse().map(
                    (head, index) =>
                        <ProjectOption key={index} head={head} loadPatchToken={loadPatchToken} />)}
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


function base64ToJson(base64String: string): any | null {
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

