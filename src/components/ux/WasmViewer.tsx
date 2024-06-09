import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
// Choose a style theme from the available styles
import { materialDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';

import { usePatch } from '@/contexts/PatchContext';
import { usePatches } from '@/contexts/PatchesContext';

const WasmViewer = () => {
    const { patch } = usePatch();
    const { zenCode } = usePatches();

    let text = patch.wasmCode ? patch.wasmCode.slice(patch.wasmCode.indexOf("void process")) : "";
    return < SyntaxHighlighter
        showLineNumbers={true}
        className="overflow-scroll text-white p-2 relative w-full select-text"
        language="c" style={materialDark}>
        {patch.wasmCode}
    </SyntaxHighlighter >
};

export default WasmViewer;
