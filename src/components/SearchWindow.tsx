import React, { useEffect, useCallback, useRef, useState } from 'react';
import { GlobeIcon, CaretRightIcon, Cross2Icon } from '@radix-ui/react-icons'
import { CubeIcon } from '@radix-ui/react-icons'
import { SubPatch, Patch } from '@/lib/nodes/types';
import { usePatches } from '@/contexts/PatchesContext';

const SearchWindow: React.FC<{ hide: () => void }> = ({ hide }) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const ref = useRef<HTMLInputElement>(null);
    let { basePatch } = usePatches();
    let [text, setText] = useState("");
    let [cursor, setCursor] = useState(0);

    useEffect(() => {
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [cursor, setCursor]);


    useEffect(() => {
        if (ref.current) {
            ref.current.focus();
        }
    }, []);

    let counter = 0;
    let trees = [];
    for (let node of basePatch.objectNodes) {
        if (node.subpatch) {
            trees.push(
                <Tree cursor={cursor} key={node.id} searchTerm={text} patch={node.subpatch} hide={hide} idx={counter} />);
            let innerPatches = node.subpatch.getAllNodes().filter(x => x.subpatch && (text === "" || (x.subpatch.name && x.subpatch.name!.toLowerCase().includes(text.toLowerCase()))));
            if (text !== "" && innerPatches.length === 0) {
            } else {
                counter += innerPatches.length + 1;
            }
        }
    }

    const onKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === "ArrowDown") {
            let _cursor = (cursor + 1);;
            setCursor(_cursor);
        } else if (e.key === "ArrowUp") {
            let _cursor = Math.max(0, (cursor - 1))
            setCursor(_cursor);
        }
    }, [setCursor, cursor]);

    useEffect(() => {
        setCursor(1);
    }, [text, setCursor]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo(0, cursor * 20);
        }
    }, [cursor]);

    return (<div
        onClick={() => hide()}
        style={{
            backgroundColor: "#000000af",
            zIndex: 10000000000
        }} className="fixed top-0 left-0 w-full h-full">
        <div
            //style={{ maxHeight: 300 }}
            onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
            className="dark-modal absolute top-0 left-0 bottom-0 right-0 flex flex-col w-96 h-96 m-auto p-2 rounded-md  text-xs">
            <input ref={ref} value={text} onChange={(e: any) => setText(e.target.value)} className="bg-black-blur border border-zinc-500 mb-3 rounded-full text-white h-8 outline-none px-2" />
            <div ref={scrollRef} className="text-xs flex-1 overflow-scroll">
                {trees}
            </div>
        </div>
    </div>);
}

const Tree: React.FC<{ patch: Patch, cursor: number, searchTerm: string, hide: () => void, idx: number }> = ({ searchTerm, patch, hide, idx, cursor }) => {
    let { setPatches, expandPatch, patches } = usePatches();
    let isSelected = patches.includes(patch);

    useEffect(() => {
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [cursor, idx, searchTerm]);

    const onKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === "Enter" && cursor === idx) {
            if (searchTerm !== "" && (!patch.name || !patch.name.toLowerCase().includes(searchTerm.toLowerCase()))) {
                return;
            }
            console.log('exppanding patch=', patch);
            patch.justExpanded = true;
            expandPatch((patch as SubPatch).parentNode);
            hide();
        }
    }, [cursor, searchTerm, idx]);

    let counter = idx;
    let trees = [];
    for (let node of patch.objectNodes) {
        if (node.subpatch) {

            let _counter = counter;
            if (searchTerm === "" || node.subpatch.name && node.subpatch.name.toLowerCase().includes(searchTerm.toLowerCase())) {
                _counter++;
            }

            trees.push(
                <Tree key={node.id} searchTerm={searchTerm} patch={node.subpatch} hide={hide} idx={_counter} cursor={cursor} />);
            let innerPatches = node.subpatch.getAllNodes().filter(x => x.subpatch && (searchTerm === "" || (x.subpatch.name && x.subpatch.name!.toLowerCase().includes(searchTerm.toLowerCase()))));
            if (searchTerm !== "") {
                if (node.subpatch.name && node.subpatch.name.toLowerCase().includes(searchTerm.toLowerCase())) {
                    counter += innerPatches.length + 1;
                } else {
                    counter += innerPatches.length + 0;
                }
            } else {
                counter += innerPatches.length + 1;
            }
        }
    }

    return <div>
        {(searchTerm === "" || (patch.name && patch.name.toLowerCase().includes(searchTerm.toLowerCase()))) && <div
            onClick={() => {
                expandPatch((patch as SubPatch).parentNode);
                hide();
            }}
            style={cursor === idx ? { backgroundColor: "#cffff8" } : {}}
            className={(cursor === idx ? "  text-black " : "") + " pl-3  cursor-pointer flex py-1 overflow-hidden whitespace-nowrap " + (!patch.name ? " text-zinc-400" : "")}><div className="mr-5 flex"> <CubeIcon className="mr-2 w-3 my-auto" /> {patch.name || "subpatch"}</div>
            {searchTerm !== "" && <TreePath patch={patch as SubPatch} />}
        </div>}
        <div className={searchTerm === "" ? "ml-2" : ""}>
            {trees}
        </div>
    </div>
};


const TreePath: React.FC<{ patch: SubPatch }> = ({ patch }) => {
    let path = [];
    while (patch.parentPatch) {
        patch = patch.parentPatch as SubPatch;
        if (patch.name) {
            path.push(patch.name);
        }
    }
    return <div style={{ fontSize: 8 + 'px', lineHeight: '16px' }} className="flex  ml-auto text-zinc-600">
        {path.map((x, i) => <><div className="mr-1">{x}</div>
            {i < path.length - 1 && <CaretRightIcon className="w-3 h-3 mx-1" />}
        </>)}
    </div>;
};

export default SearchWindow;
