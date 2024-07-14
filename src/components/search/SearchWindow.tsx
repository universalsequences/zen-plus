import { useEffect, useCallback, useRef, useState } from "react";
import { useRevisions } from "@/hooks/useRevisions";
import ObjectNodeImpl from "@/lib/nodes/ObjectNode";
import {
  FilesQueryResult,
  Project,
  useStorage,
} from "@/contexts/StorageContext";
import Files from "@/components/files/Files";
import {
  MagnifyingGlassIcon,
  ArrowLeftIcon,
  GlobeIcon,
  CaretRightIcon,
  Cross2Icon,
} from "@radix-ui/react-icons";
import { BoxModelIcon, CubeIcon } from "@radix-ui/react-icons";
import SubPatchImpl from "@/lib/nodes/Subpatch";
import { usePatches } from "@/contexts/PatchesContext";
import Tree from "./Tree";

const SearchWindow: React.FC<{ hide: () => void }> = ({ hide }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const revisionsRef = useRef<HTMLDivElement>(null);
  const ref = useRef<HTMLInputElement>(null);
  let { basePatch } = usePatches();
  let [text, setText] = useState("");
  let [cursor, setCursor] = useState(0);
  let { fetchPatch } = useStorage();

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
  const { fetchRevisions } = useRevisions();
  let originalBasePatch = basePatch;
  if (patchOpened) {
    basePatch = patchOpened;
  }

  useEffect(() => {
    window.addEventListener("drop", clearDrag);
    return () => window.removeEventListener("drop", clearDrag);
  }, [setDragging]);

  const clearDrag = useCallback(() => {
    setDragging(null);
  }, [setDragging]);
  let counter = 0;
  let trees = [
    <Tree
      dragging={dragging}
      setDragging={setDragging}
      patchOpened={patchOpened}
      cursor={cursor}
      key={basePatch.id}
      searchTerm={text}
      patch={basePatch}
      hide={hide}
      idx={counter}
    />,
  ];
  for (let node of basePatch.objectNodes) {
    if (node.subpatch) {
      /*
            trees.push(
                <Tree
                    patchOpened={patchOpened}
                    cursor={cursor} key={node.id} searchTerm={text} patch={node.subpatch} hide={hide} idx={counter} />);
                    */
      let innerPatches = node.subpatch
        .getAllNodes()
        .filter(
          (x) =>
            x.subpatch &&
            (text === "" ||
              (x.subpatch.name &&
                x.subpatch.name!.toLowerCase().includes(text.toLowerCase()))),
        );
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

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        let _cursor = cursor + 1;
        setCursor(_cursor);
      } else if (e.key === "ArrowUp") {
        let _cursor = Math.max(0, cursor - 1);
        setCursor(_cursor);
      }
    },
    [setCursor, cursor],
  );

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

  useEffect(() => {
    if (revisionsRef.current) {
      revisionsRef.current.addEventListener("scroll", onRevisionsScroll);
    }
    return () => {
      if (revisionsRef.current) {
        revisionsRef.current.removeEventListener("scroll", onRevisionsScroll);
      }
    };
  }, [fileExpanded, revisions]);

  const onRevisionsScroll = useCallback(
    (e: any) => {
      if (revisionsRef.current && revisions && fileExpanded) {
        let scrollLeft = revisionsRef.current.scrollLeft;
        if (
          scrollLeft + 2 >=
          revisionsRef.current.scrollWidth - revisionsRef.current.offsetWidth
        ) {
          fetchRevisions(fileExpanded).then((x) => {
            setRevisions([...revisions, ...x]);
          });
        }
      }
    },
    [revisions, fileExpanded],
  );

  let [fileOpened, setFileOpened] = useState<any | null>(null);
  let [selectedRevision, setSelectedRevision] = useState<File | null>(null);
  return (
    <div
      onDrop={clearDrag}
      onDragOver={(e: any) => e.preventDefault()}
      onClick={() => {
        hide();
        setShowFiles(false);
        setPatchOpened(null);
      }}
      style={{
        backgroundColor: "#00000038",
        zIndex: 10000000000,
      }}
      className="fixed top-0 left-0 w-full h-full"
    >
      <div
        //style={{ maxHeight: 300 }}
        onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
        className={
          (showFiles ? "w-2/3 h-2/3" : "w-1/2 h-1/2") +
          " dark-modal absolute top-0 left-0 bottom-0 right-0 flex flex-col m-auto p-2 rounded-md  text-xs transition-all"
        }
      >
        <div className="relative my-auto w-full flex">
          <input
            ref={ref}
            value={text}
            onChange={(e: any) => setText(e.target.value)}
            className="bg-black-blur border border-zinc-500 mb-3 rounded-full text-white h-8 outline-none w-full pl-10"
          />
          <MagnifyingGlassIcon className="absolute left-2 -top-2 bottom-0 my-auto w-6 h-6" />
        </div>
        <div className="flex mb-2">
          <div
            onClick={() => setShowFiles(false)}
            className={
              (!showFiles ? "border-zinc-300" : "border-zinc-900") +
              " mr-2 px-4 py-4 border cursor-pointer bg-zinc-800 rounded-md"
            }
          >
            this patch
          </div>
          <div
            onClick={() => setShowFiles(true)}
            className={
              (showFiles ? "border-zinc-300" : "border-zinc-900") +
              " mr-2 px-4 py-4 border cursor-pointer bg-zinc-800 rounded-md"
            }
          >
            files
          </div>
        </div>
        {patchOpened && (
          <div className="flex w-full relative h-20 p-3">
            <ArrowLeftIcon
              onClick={() => {
                setPatchOpened(null);
                setFileExpanded(null);
              }}
              className="w-6 h-6 cursor-pointer absolute top-2 left-2"
            />
            {fileExpanded && <div className="ml-10">{fileExpanded.name}</div>}
            {fileExpanded && revisions && (
              <div className="absolute bottom-5  ml-10 text-zinc-400">
                revisions
              </div>
            )}
            {loading ? (
              <div className="ml-20 my-auto spinner" aria-label="Loading" />
            ) : (
              revisions && (
                <div
                  ref={revisionsRef}
                  className="ml-10 flex-1 flex overflow-x-scroll overflow-y-hidden"
                >
                  {revisions.map((x, i) => (
                    <div
                      key={i}
                      onClick={() => {
                        setSelectedRevision(x);
                        fetchPatch(x).then((p) => {
                          let node = new ObjectNodeImpl(originalBasePatch);
                          let mockPatch = new SubPatchImpl(
                            originalBasePatch,
                            node,
                          );
                          if (p.id === "1") {
                            // if theres a canvas then we want gl
                            if (
                              p.objectNodes.some((x) => x.text === "canvas")
                            ) {
                              node.parse("zen @type gl");
                            } else {
                              node.parse("zen @type audio");
                            }
                            if (node.subpatch) {
                              mockPatch = node.subpatch as SubPatchImpl;
                            }
                          }
                          mockPatch.fromJSON(p, true);
                          setPatchOpened(mockPatch);
                        });
                      }}
                      style={{
                        border: selectedRevision === x ? "2px solid white" : "",
                        minWidth: 80,
                      }}
                      className="flex mr-2 relative w-16 cursor-pointer active:scale-104 transition-all h-12 bg-zinc-700 overflow-hidden rounded-md"
                    >
                      <div className="absolute flex w-16 bottom-0 left-0 right-0 mx-auto">
                        {x.name}
                      </div>{" "}
                      {x.screenshot && (
                        <img src={x.screenshot} className="h-full w-full" />
                      )}
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        )}
        <div ref={scrollRef} className="text-xs flex-1 overflow-scroll">
          {!patchOpened && showFiles ? (
            <div className="flex flex-col w-full h-full">
              <Files
                fileExpanded={fileExpanded}
                setFileExpanded={setFileExpanded}
                setPatchOpened={setPatchOpened}
                basePatch={basePatch}
                isMini={true}
                text={text}
                fileOpened={fileOpened}
                setFileToOpen={setFileOpened}
              />
            </div>
          ) : (
            trees
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchWindow;
