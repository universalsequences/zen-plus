import React from 'react';
import { usePatch } from '@/contexts/PatchContext';
import { usePatches } from '@/contexts/PatchesContext';

const WasmViewer = () => {
    const { patch } = usePatch();
    const { zenCode } = usePatches();

    let text = patch.wasmCode ? patch.wasmCode.slice(patch.wasmCode.indexOf("void process")) : "";
    return <pre
        style={{
            backgroundColor: "#000000a8",
        }}
        className="overflow-scroll text-white p-2 relative">
        <div className="absolute top-2 right-2 z-30">
            {text.length / 1000.0}kb
        </div>
        {patch.wasmCode && patch.wasmCode.slice(patch.wasmCode.indexOf("void process"))}
    </pre>
};

export default WasmViewer;
