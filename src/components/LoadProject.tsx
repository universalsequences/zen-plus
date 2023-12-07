import React, { useEffect, useCallback, useState } from 'react';
import { usePosition } from '@/contexts/PositionContext';;
import { usePatch, Coordinates } from '@/contexts/PatchContext';
import { Project, useStorage } from '@/contexts/StorageContext';
import { Patch } from '@/lib/nodes/types';

interface Props {
    isSubPatch: boolean;

    // actually no point in having this patch, cuz every patch is in their own
    // PatchContext

    patch: Patch;
}
const LoadProject = (props: Props) => {
    const { getPatches } = useStorage();
    const { patch } = props;
    const [patches, setPatches] = useState<Project[]>([]);
    const { updatePositions, sizeIndexRef, setSizeIndex } = usePosition();
    const { loadProject } = usePatch();

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
    }, [patch]);

    useEffect(() => {
        setPatches([...getPatches(props.isSubPatch ? "subpatch" : "patch")].reverse());
    }, []);

    return (
        <div className="text-xs flex flex-col h-64 w-96 select-none">
            <div className="text-base">Patches...</div>
            <div
                style={{ backgroundColor: "#0000003f" }}
                className="flex-1 mt-4 overflow-y-scroll p-3 border border-zinc-500">
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
