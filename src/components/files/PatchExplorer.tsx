import React, { useState, useRef, useEffect } from 'react';
import { Patch, IOlet, MessageNode, IOConnection, ObjectNode, Coordinate } from '@/lib/nodes/types';
import { PatchImpl } from '@/lib/nodes/Patch';
import SubPatch from '@/lib/nodes/Subpatch';
import ObjectNodeImpl from '@/lib/nodes/ObjectNode';
import { usePatchLoader } from '@/hooks/usePatchLoader';
import { useStorage } from '@/contexts/StorageContext';
import { File } from '@/lib/files/types';

const PatchExplorer: React.FC<{ setPatchOpened: (x: Patch | null) => void, file: File, basePatch: Patch }> = ({ basePatch, file, setPatchOpened }) => {
    const { fetchPatch } = useStorage();

    useEffect(() => {
        fetchPatch(file).then(
            x => {
                let node = new ObjectNodeImpl(basePatch);
                let mockPatch = new SubPatch(basePatch, node);
                if (x.id === "1") {
                    // if theres a canvas then we want gl
                    if (x.objectNodes.some(x => x.text === "canvas")) {
                        node.parse('zen @type gl');
                    } else {
                        node.parse('zen @type audio');
                    }
                    if (node.subpatch) {
                        mockPatch = node.subpatch as SubPatch;
                    }
                }
                mockPatch.fromJSON(x, true);
                if (x.id === "1") {
                    basePatch.initialLoadCompile();
                }
                setPatchOpened(mockPatch);
            });
    }, [file]);

    return <>
    </>;
};
export default PatchExplorer;
