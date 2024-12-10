import React, { useRef, useState, useEffect, useCallback } from "react";
import { Timestamp } from "firebase/firestore";
import { HeartIcon, HeartFilledIcon } from "@radix-ui/react-icons";
import FileComponent from "./File";
import type { File } from "@/lib/files/types";
import {
  ArrowDownIcon,
  MagnifyingGlassIcon,
  Cross2Icon,
  PlusCircledIcon,
} from "@radix-ui/react-icons";
import { useNav, NavOption } from "@/contexts/NavContext";
import type { Patch } from "@/lib/nodes/types";
import { useAuth } from "@/contexts/AuthContext";
import PatchExplorer from "./PatchExplorer";
import { type FilesQueryResult, useStorage } from "@/contexts/StorageContext";
import { PatchDocComponent } from "../org/PatchDocComponent";

const Files: React.FC<{
  fileExpanded: File | null;
  setFileExpanded: (x: File | null) => void;
  basePatch?: Patch;
  setPatchOpened: (x: Patch | null) => void;
  text?: string;
  isMini: boolean;
  fileOpened: any | null;
  setFileToOpen: (x: any) => void;
}> = ({
  setFileToOpen,
  fileOpened,
  isMini = false,
  text,
  basePatch,
  setPatchOpened,
  fileExpanded,
  setFileExpanded,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const revisionsRef = useRef<HTMLDivElement>(null);
  let [queryResult, setQueryResult] = useState<FilesQueryResult | null>(null);
  const [projects, setProjects] = useState<File[]>([]);
  let [searchText, setSearchText] = useState("");
  const { setNavOption } = useNav();

  const { fetchPatchesForEmail } = useStorage();
  let { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [filterFavorited, setFilterFavorited] = useState(false);

  useEffect(() => {
    if (fileOpened && projects) {
      let found = projects.find((x) => x.id === fileOpened.id);
      if (found && found.commits) {
        setFileExpanded(found);
      }
    }
  }, [projects, fileOpened, setFileExpanded]);

  useEffect(() => {
    if (user) {
      setLoading(true);
      fetchPatchesForEmail(user.email, false, filterFavorited, undefined, searchText).then((x) => {
        setLoading(false);
        setQueryResult(x);
        setProjects(x.files);
      });
    }
  }, [user, setLoading, filterFavorited, searchText]);

  let loadingRef = useRef(false);
  const fetchPaginatedResults = useCallback(() => {
    if (user && !loadingRef.current) {
      loadingRef.current = true;
      setLoading(true);
      fetchPatchesForEmail(
        user.email,
        false,
        filterFavorited,
        queryResult ? queryResult.cursor : undefined,
        searchText,
      ).then((x) => {
        setLoading(false);
        loadingRef.current = false;
        setQueryResult(x);
        setProjects([...projects, ...x.files]);
      });
    }
  }, [
    searchText,
    filterFavorited,
    user,
    setProjects,
    projects,
    setLoading,
    setQueryResult,
    queryResult,
  ]);

  //let { fetchRevisions } = useStorage();
  let [revisions, setRevisions] = useState<File[]>([]);
  let [revisionCursor, setRevisionCursor] = useState(0);

  const fetchRevisions = useCallback(
    (file: File): Promise<File[]> => {
      return new Promise((resolve) => {
        user.getIdToken().then((token: string) => {
          fetch("/api/revisions/query", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              commits: file.commits,
              start: revisionCursor,
            }),
          }).then(async (r) => {
            let json = await r.json();
            let revisions: File[] = [];
            for (let x of json.revisions) {
              revisions.push({
                ...x,
                createdAt: Timestamp.fromMillis(
                  x.createdAt.seconds * 1000 + x.createdAt.nanoseconds / 1000000,
                ),
              });
            }
            setRevisionCursor(json.cursor || 0);
            resolve(revisions);
          });
        });
      });
    },
    [revisionCursor, revisions],
  );

  useEffect(() => {
    if (!isMini && fileExpanded && fileExpanded.commits) {
      setLoading(true);
      fetchRevisions(fileExpanded).then((x) => {
        setLoading(false);
        setRevisions(x);
      });
    }
  }, [fileExpanded, isMini, setRevisions, setLoading]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.addEventListener("scroll", onScroll);
    }
    return () => {
      if (scrollRef.current) {
        scrollRef.current.removeEventListener("scroll", onScroll);
      }
    };
  }, [queryResult, setQueryResult, revisions, setProjects, projects, filterFavorited, user]);

  useEffect(() => {
    if (revisionsRef.current) {
      revisionsRef.current.addEventListener("scroll", onRevisionsScroll);
    }
    return () => {
      if (revisionsRef.current) {
        revisionsRef.current.removeEventListener("scroll", onRevisionsScroll);
      }
    };
  }, [
    queryResult,
    setQueryResult,
    setProjects,
    projects,
    filterFavorited,
    user,
    fileExpanded,
    revisions,
  ]);

  const onRevisionsScroll = useCallback(
    (e: any) => {
      if (revisionsRef.current && fileExpanded) {
        let scrollLeft = revisionsRef.current.scrollLeft;
        if (scrollLeft >= revisionsRef.current.scrollWidth - revisionsRef.current.offsetWidth) {
          fetchRevisions(fileExpanded).then((x) => {
            setRevisions([...revisions, ...x]);
          });
        }
      }
    },
    [queryResult, projects, setProjects, setQueryResult, filterFavorited, user, revisions],
  );

  const onScroll = useCallback(
    (e: any) => {
      if (scrollRef.current) {
        let scrollTop = scrollRef.current.scrollTop;
        if (scrollTop > scrollRef.current.scrollHeight - scrollRef.current.offsetHeight) {
          fetchPaginatedResults();
        }
      }
    },
    [queryResult, projects, setProjects, setQueryResult, filterFavorited, user],
  );

  const goToEditor = useCallback(() => {
    setNavOption(NavOption.Editor);
  }, []);

  const openFile = useCallback((file: File | null) => {
    setRevisions([]);
    setFileToOpen(file);
    setNavOption(NavOption.Editor);
  }, []);

  useEffect(() => {
    if (text) {
      setSearchText(text);
    }
  }, [setSearchText, text]);

  if (!user) {
    return <></>;
  }

  return (
    <>
      {!isMini && (
        <div
          className={
            (isMini ? "h-16" : "h-32") + " w-full  border-b border-b-zinc-700 flex flex-col"
          }
        >
          <div className="flex pl-5 pr-10 content-start my-auto">
            {!isMini && (
              <div className="ml-5 relative my-auto">
                <input
                  value={searchText}
                  onChange={(e: any) => setSearchText(e.target.value)}
                  className="pl-10 rounded-lg bg-zinc-800 border border-zinc-700 outline-none py-2 w-64"
                  type="text"
                />
                <MagnifyingGlassIcon className="absolute left-2 top-0 bottom-0 my-auto w-6 h-6" />
              </div>
            )}
            <div
              onClick={() => setFilterFavorited(!filterFavorited)}
              className="flex ml-2 mr-5 my-auto cursor-pointer"
            >
              {filterFavorited ? (
                <HeartFilledIcon color="red" className="w-6 h-6" />
              ) : (
                <HeartIcon className="w-6 h-6" />
              )}
            </div>
            {!isMini && (
              <button
                onClick={goToEditor}
                className="ml-10 active:scale-105 bg-violet-700 text-xs rounded-md px-3 py-1 flex cursor-pointer transition-colors hover:bg-violet-500"
              >
                <PlusCircledIcon className="w-5 h-5 mr-3 my-auto" />
                <div className="my-auto">New Project</div>
              </button>
            )}
          </div>
        </div>
      )}
      <div
        className={
          (!fileExpanded ? "h-0 " : " h-80  border-b ") +
          "transition-all flex flex-col object-start w-full border-b-zinc-700 duration-300 ease-in-out relative"
        }
      >
        {fileExpanded && (
          <Cross2Icon
            onClick={() => {
              setRevisions([]);
              setFileExpanded(null);
            }}
            className="hover:scale-105 transition-all cursor-pointer absolute top-5 right-5 w-6 h-6"
          />
        )}

        {basePatch && fileExpanded && isMini ? (
          <PatchExplorer
            setPatchOpened={setPatchOpened}
            basePatch={basePatch}
            file={fileExpanded}
          />
        ) : (
          <>
            {fileExpanded && (
              <div className="text-zinc-500 p-5 flex">
                <div className="my-auto">Revision History</div>
                <div className="my-auto text-white ml-5">{fileExpanded.name}</div>
                <button
                  onClick={() => {
                    openFile(fileExpanded);
                  }}
                  className="active:scale-105 ml-10 my-auto bg-zinc-700 text-white text-xs rounded-md px-3 py-2 flex cursor-pointer transition-colors hover:bg-violet-500"
                >
                  <PlusCircledIcon className="w-5 h-5 mr-3 my-auto" />
                  <div className="my-auto">Open Latest Edit</div>
                </button>
                {fileExpanded.screenshot && (
                  <button
                    className="ml-5 active:scale-105 ml-10 my-auto bg-zinc-700 text-white text-xs rounded-md px-3 py-2 flex cursor-pointer transition-colors hover:bg-violet-500"
                    onClick={() => {
                      const anchor = document.createElement("a");
                      // Set the href to the URL of the image
                      if (fileExpanded && fileExpanded.screenshot) {
                        anchor.href = fileExpanded.screenshot;
                        // Use the 'download' attribute to set the new filename
                        anchor.download = "screenshot.png";
                        // Append the anchor to the body (required for Firefox)
                        document.body.appendChild(anchor);
                        // Programmatically click the anchor to trigger the download
                        anchor.click();
                        // Remove the anchor from the body
                        document.body.removeChild(anchor);
                      }
                    }}
                  >
                    <ArrowDownIcon className="w-5 h-5 mr-3 my-auto" />
                    <div className="my-auto">Download Image</div>
                  </button>
                )}
                <div className="h-8">
                  <PatchDocComponent isFlexRow={true} docId={fileExpanded.id} doc={fileExpanded} />
                </div>
              </div>
            )}
            <div ref={revisionsRef} className="flex overflow-x-scroll content-start">
              {fileExpanded &&
                [fileExpanded, ...[...revisions]].map((x) => (
                  <FileComponent
                    showAttributes={x === fileExpanded}
                    isRevision={true}
                    key={x.id}
                    setRevisions={setRevisions}
                    file={x}
                    setFileExpanded={setFileToOpen}
                    className="w-56 h-40"
                    openFile={openFile}
                    isMini={isMini}
                    fileExpanded={fileExpanded}
                    setFileToOpen={setFileToOpen}
                  />
                ))}

              {loading && <div className="ml-20 my-auto spinner" aria-label="Loading"></div>}
            </div>
          </>
        )}
      </div>
      <div
        ref={scrollRef}
        className="flex-1 transition-all flex flex-wrap object-start flex-1 overflow-scroll duration-300 ease-in-out content-start "
      >
        {!fileExpanded && loading && <div className="m-auto spinner" aria-label="Loading"></div>}

        {[...projects]
          .filter(
            (x) => searchText === "" || x.name.toLowerCase().includes(searchText.toLowerCase()),
          )
          .map((x) => (
            <FileComponent
              isMini={isMini}
              key={x.id}
              className={isMini ? "w-32 h-32" : "w-64 h-40"}
              setRevisions={setRevisions}
              file={x}
              isRevision={false}
              setFileExpanded={setFileExpanded}
              openFile={openFile}
              fileExpanded={fileExpanded}
              setFileToOpen={setFileToOpen}
            />
          ))}
      </div>
    </>
  );
};

export default Files;
