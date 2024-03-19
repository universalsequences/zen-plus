import React, { useEffect, useCallback, useRef, useState } from 'react';
import ObjectNodeImpl from '@/lib/nodes/ObjectNode';
import { FilesQueryResult, Project, useStorage } from '@/contexts/StorageContext';
import Files from '@/components/files/Files';
import { File } from '@/lib/files/types';
import { MagnifyingGlassIcon, ArrowLeftIcon, GlobeIcon, CaretRightIcon, Cross2Icon } from '@radix-ui/react-icons'
import { BoxModelIcon, CubeIcon } from '@radix-ui/react-icons'
import { SubPatch, Patch } from '@/lib/nodes/types';
import SubPatchImpl from '@/lib/nodes/Subpatch';
import { usePatches } from '@/contexts/PatchesContext';

const SearchWindow: React.FC<{ hide: () => void }> = ({ hide }) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const ref = useRef<HTMLInputElement>(null);
    let { basePatch } = usePatches();
    let [text, setText] = useState("");
    let [cursor, setCursor] = useState(0);
    let { fetchPatch, fetchRevisions } = useStorage();

    useEffect(() => {
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [cursor, setCursor]);


    useEffect(() => {
        if (ref.current) {
            ref.current.focus();
        }
    }, []);

    const [dragging, setDragging] = useState<Patch | null>(null);
    const [patchOpened, setPatchOpened] = useState<Patch | null>(null);

    const [revisions, setRevisions] = useState<File[] | null>(null);
    let originalBasePatch = basePatch;
    if (patchOpened) {
        basePatch = patchOpened;
    }

    useEffect(() => {
        window.addEventListener("drop", clearDrag);
        return () => window.removeEventListener("drop", clearDrag);
    }, [setDragging]);


    const clearDrag = useCallback(() => {
        console.log('clear drag');
        setDragging(null);
    }, [setDragging]);
    let counter = 0;
    let trees = [
        <Tree
            dragging={dragging}
            setDragging={setDragging}
            patchOpened={patchOpened}
            cursor={cursor} key={basePatch.id} searchTerm={text} patch={basePatch} hide={hide} idx={counter} />
    ];
    for (let node of basePatch.objectNodes) {
        if (node.subpatch) {
            /*
            trees.push(
                <Tree
                    patchOpened={patchOpened}
                    cursor={cursor} key={node.id} searchTerm={text} patch={node.subpatch} hide={hide} idx={counter} />);
                    */
            let innerPatches = node.subpatch.getAllNodes().filter(x => x.subpatch && (text === "" || (x.subpatch.name && x.subpatch.name!.toLowerCase().includes(text.toLowerCase()))));
            if (text !== "" && innerPatches.length === 0) {
            } else {
                counter += innerPatches.length + 1;
            }
        }
    }

    const [showFiles, setShowFiles] = useState(false);
    const [fileExpanded, setFileExpanded] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    useEffect(() => {
        if (fileExpanded) {
            setLoading(true);
            fetchRevisions(fileExpanded).then((r: File[]) => {
                setLoading(false);
                setRevisions(r);
            });
        }
    }, [fileExpanded, setRevisions, setLoading]);


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
        if (text !== "") {
            setCursor(1);
        } else {
            setCursor(0);
        }
    }, [text, setCursor]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo(0, cursor * 19.5);
        }
    }, [cursor]);

    let [fileOpened, setFileOpened] = useState<any | null>(null);
    let [selectedRevision, setSelectedRevision] = useState<File | null>(null);
    return (<div
        onDrop={clearDrag}
        onDragOver={(e: any) => e.preventDefault()}
        onClick={() => {
            hide();
            setShowFiles(false);
            setPatchOpened(null);
        }}
        style={{
            backgroundColor: "#00000038",
            zIndex: 10000000000
        }} className="fixed top-0 left-0 w-full h-full">
        <div
            //style={{ maxHeight: 300 }}
            onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
            className={(showFiles ? "w-2/3 h-2/3" : "w-1/2 h-1/2") + " dark-modal absolute top-0 left-0 bottom-0 right-0 flex flex-col m-auto p-2 rounded-md  text-xs transition-all"}>
            <div className="relative my-auto w-full flex">
                <input ref={ref} value={text} onChange={(e: any) => setText(e.target.value)} className="bg-black-blur border border-zinc-500 mb-3 rounded-full text-white h-8 outline-none w-full pl-10" />
                <MagnifyingGlassIcon className="absolute left-2 -top-2 bottom-0 my-auto w-6 h-6" />
            </div>
            <div className="flex mb-2">
                <div
                    onClick={() => setShowFiles(false)}
                    className={(!showFiles ? "border-zinc-300" : "border-zinc-900") + " mr-2 px-4 py-4 border cursor-pointer bg-zinc-800 rounded-md"}>this patch</div>
                <div
                    onClick={() => setShowFiles(true)}
                    className={(showFiles ? "border-zinc-300" : "border-zinc-900") + " mr-2 px-4 py-4 border cursor-pointer bg-zinc-800 rounded-md"}>files</div>
            </div>
            {patchOpened && <div className="flex w-full relative h-20 p-3">
                <ArrowLeftIcon
                    onClick={() => {
                        setPatchOpened(null);
                        setFileExpanded(null);
                    }
                    }
                    className="w-6 h-6 cursor-pointer absolute top-2 left-2" />
                {fileExpanded && <div className="ml-10">{fileExpanded.name}</div>}
                {fileExpanded && revisions && <div className="absolute bottom-5  ml-10 text-zinc-400">revisions</div>}
                {loading ? <div className="ml-20 my-auto spinner" aria-label="Loading"></div> : revisions && <div className="ml-10 flex-1 flex overflow-x-scroll overflow-y-hidden">
                    {revisions.map(x =>
                        <div
                            onClick={() => {
                                setSelectedRevision(x);
                                fetchPatch(x).then(
                                    p => {
                                        let node = new ObjectNodeImpl(originalBasePatch);
                                        let mockPatch = new SubPatchImpl(originalBasePatch, node);
                                        console.log('p = ', p);
                                        if (p.id === "1") {
                                            console.log('its base...');
                                            // if theres a canvas then we want gl
                                            if (p.objectNodes.some(x => x.text === "canvas")) {
                                                node.parse('zen @type gl');
                                                console.log(node);
                                            } else {
                                                node.parse('zen @type audio');
                                            }
                                            if (node.subpatch) {
                                                mockPatch = node.subpatch as SubPatchImpl;
                                            }
                                        }
                                        console.log("node = ", node);
                                        mockPatch.fromJSON(p, true);
                                        if (p.id === "1") {
                                            // originalBasePatch.initialLoadCompile();
                                        }
                                        setPatchOpened(mockPatch);
                                    });

                            }}
                            style={{ border: selectedRevision === x ? "2px solid white" : "", minWidth: 80 }} className="flex mr-2 relative w-16 cursor-pointer active:scale-104 transition-all h-12 bg-zinc-700 overflow-hidden rounded-md"><div className="absolute flex w-16 bottom-0 left-0 right-0 mx-auto">{x.name}</div> {x.screenshot && <img src={x.screenshot} className="h-full w-full" />}</div>)}
                </div>}
            </div>}
            <div ref={scrollRef} className="text-xs flex-1 overflow-scroll">
                {!patchOpened && showFiles ? <div className="flex flex-col w-full h-full"><Files
                    fileExpanded={fileExpanded}
                    setFileExpanded={setFileExpanded}
                    setPatchOpened={setPatchOpened} basePatch={basePatch} isMini={true} text={text} fileOpened={fileOpened} setFileToOpen={setFileOpened} /></div> : trees}
            </div>
        </div >
    </div >);
}

const Tree: React.FC<{ setDragging: (x: Patch | null) => void, dragging: Patch | null, patchOpened: Patch | null, patch: Patch, cursor: number, searchTerm: string, hide: () => void, idx: number }> = ({ searchTerm, patch, hide, idx, cursor, patchOpened, dragging, setDragging }) => {
    let { setPatches, expandPatch, selectedPatch, setSelectedPatch, patches } = usePatches();
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
                <Tree dragging={dragging} setDragging={setDragging} patchOpened={patchOpened} key={node.id} searchTerm={searchTerm} patch={node.subpatch} hide={hide} idx={_counter} cursor={cursor} />);
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
    let isPresenting = (patch.presentationMode || ((patch as SubPatch).parentNode && (patch as SubPatch).parentNode.attributes["Custom Presentation"]))
    let type = (patch as SubPatch).parentNode && (patch as SubPatch).parentNode.attributes.type;

    const onDrop = useCallback(() => {
        if (patch === dragging) {
            return;
        }
        console.log("DROP!", dragging, patch);
        let sub = dragging as SubPatch;
        if (sub.parentPatch) {
            let node = sub.parentNode;
            sub.parentPatch.objectNodes = sub.parentPatch.objectNodes.filter(
                x => x !== node);
            sub.parentPatch = patch;
            node.patch = patch;
            patch.objectNodes.push(node);
            expandPatch(node);
        }
    }, [dragging, patch]);

    const [draggingOver, setDraggingOver] = useState(false);

    return <div>
        {(searchTerm === "" || (patch.name && patch.name.toLowerCase().includes(searchTerm.toLowerCase()))) && <div
            onClick={(e: any) => {
                e.stopPropagation();

                if (!(patch as SubPatch).parentNode) {
                    return;
                }
                if (patchOpened && selectedPatch) {
                    console.log('patch opened and selected patch', patchOpened, selectedPatch, patch);
                    (patch as SubPatch).parentPatch = selectedPatch;
                    (patch as SubPatch).parentNode.patch = selectedPatch;
                    let node = (patch as SubPatch).parentNode;
                    selectedPatch.objectNodes.push(node);

                    // clear all outlets and inlets
                    for (let inlet of node.inlets) {
                        inlet.connections = [];
                    }
                    for (let outlet of node.outlets) {
                        outlet.connections = [];
                    }

                    console.log("expanding...");
                    patch.initialLoadCompile();
                    patch.id = "10232123";
                    let _selectedPatch = selectedPatch;
                    expandPatch((patch as SubPatch).parentNode);
                    setSelectedPatch(selectedPatch)
                } else {
                    expandPatch((patch as SubPatch).parentNode);
                }
                // hide();
            }}
            draggable="true"
            onDragStart={() => setDragging(patch)}
            onDragOver={(e: any) => {
                e.preventDefault();
                setDraggingOver(true);
            }}
            onDragLeave={(e: any) => {
                e.preventDefault();
                setDraggingOver(false);
            }}
            onDrop={onDrop}
            style={cursor === idx ? { backgroundColor: "#b6dcd42f", borderBottom: "1px solid #2f2f2f" } : { borderBottom: "1px solid transparent" }}
            className={(draggingOver ? "bg-zinc-400 " : "") + (cursor === idx ? "   " : "") + " pl-3  cursor-pointer flex py-1 overflow-hidden whitespace-nowrap " + (!patch.name ? " text-zinc-300" : "")}><div className={(isPresenting ? "" : "text-zinc-300") + " mr-5 flex hover:text-white transition-colors hover:underline active:scale-105 transition-all"}> {!(patch as SubPatch).parentPatch ? <GlobeIcon className="mr-2 w-3 my-auto" /> : isPresenting ? <BoxModelIcon className="mr-2 w-3 my-auto" /> : <CubeIcon className="mr-2 w-3 my-auto" />} {patch.name || ((patch as SubPatch).parentPatch ? "subpatch" : "base patch")}

                <div className={`w-1 h-1 rounded-full ${type === 'audio' ? "bg-yellow-300" : type === "gl" ? "bg-purple-500" : "bg-teal-200"} my-auto ml-2`} />
            </div>
            {<TreePath patch={patch as SubPatch} />}
        </div>
        }
        {dragging !== patch && <div className={searchTerm === "" ? "ml-2" : ""}>
            {trees}
        </div>}
    </div >
};


const TreePath: React.FC<{ patch: SubPatch }> = ({ patch }) => {
    let path = [];
    while (patch.parentPatch) {
        patch = patch.parentPatch as SubPatch;
        if (patch.name) {
            path.push(patch.name);
        }
    }
    return <div style={{ fontSize: 8 + 'px', lineHeight: '16px' }} className="flex  ml-auto text-zinc-300">
        {path.map((x, i) => <><div className="mr-1">{x}</div>
            {i < path.length - 1 && <CaretRightIcon className="w-3 h-3 mx-1" />}
        </>)}
    </div>;
};

export default SearchWindow;
