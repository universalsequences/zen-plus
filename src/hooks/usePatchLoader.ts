import React, { useCallback } from 'react';
import { usePatch, Coordinates } from '@/contexts/PatchContext';
import { Project, useStorage } from '@/contexts/StorageContext';
import { SerializedPatch, Patch } from '@/lib/nodes/types';
import { usePosition } from '@/contexts/PositionContext';;

export const usePatchLoader = (patch: Patch) => {
    const { loadProjectPatch, loadProject } = usePatch();
    const { updatePositions, sizeIndexRef, setSizeIndex } = usePosition();
    const { fetchPatch, fetchPatchesForEmail } = useStorage();

    const loadPatch = useCallback(async (saved: any) => {
        let serialized = await fetchPatch(saved);
        loadProjectPatch(serialized);
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
    }, [patch]);

    return loadPatch;
};
