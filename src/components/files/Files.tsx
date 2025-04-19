import React, { useRef, useState, useEffect, useCallback } from "react";
import { Timestamp, doc, updateDoc } from "firebase/firestore";
import Image from "next/image";
import { HeartIcon, HeartFilledIcon, CommitIcon } from "@radix-ui/react-icons";
import FileComponent from "./File";
import type { File } from "@/lib/files/types";
import {
  ArrowDownIcon,
  MagnifyingGlassIcon,
  Cross2Icon,
  PlusCircledIcon,
  GridIcon,
  RowsIcon,
} from "@radix-ui/react-icons";
import { db } from "@/lib/db/firebase";
import { getTime } from "@/components/ProjectOption";
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
  let [inputValue, setInputValue] = useState("");
  // Initialize view preference from localStorage or default to grid view (true)
  const [isGridView, setIsGridView] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedView = localStorage.getItem('zen-files-view-mode');
      // Default to grid view (true) if no preference has been saved
      return savedView === null ? true : savedView === 'grid';
    }
    return true; // Default to grid view
  });
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
      // Completely reset state when search term or filters change
      setLoading(true);
      setProjects([]);
      setHasMoreResults(true);
      // Important: Reset the query result to clear any existing cursor
      setQueryResult(null);
      
      // Small delay to ensure state is reset before fetching
      setTimeout(() => {
        fetchPatchesForEmail(
          user.email, 
          false, 
          filterFavorited, 
          undefined, 
          searchText
        ).then((x) => {
          setLoading(false);
          setQueryResult(x);
          setProjects(x.files);
          // Update hasMoreResults based on API response
          setHasMoreResults(x.hasMore || false);
        });
      }, 10);
    }
  }, [user, setLoading, filterFavorited, searchText, fetchPatchesForEmail]);

  let loadingRef = useRef(false);
  // Track if we have more results to load
  let [hasMoreResults, setHasMoreResults] = useState(true);
  
  const fetchPaginatedResults = useCallback(() => {
    console.log("Attempting to fetch more results", { hasMoreResults, loadingRef: loadingRef.current });
    
    // Only fetch if the user is logged in, we're not already loading, and there are more results
    if (user && !loadingRef.current && hasMoreResults) {
      loadingRef.current = true;
      setLoading(true);
      
      // If queryResult is null, we should start from the beginning
      // This should not normally happen but provides a safeguard
      const cursor = queryResult ? queryResult.cursor : undefined;
      console.log("Using cursor for pagination:", cursor);
      
      fetchPatchesForEmail(
        user.email,
        false,
        filterFavorited,
        cursor,
        searchText
      ).then((x) => {
        setLoading(false);
        loadingRef.current = false;
        
        console.log("Pagination results:", { 
          count: x.files.length, 
          hasMore: x.hasMore, 
          cursor: x.cursor 
        });
        
        // Update hasMoreResults based on API response
        setHasMoreResults(x.hasMore || false);
        
        // Only update projects if we received new files
        if (x.files.length > 0) {
          setQueryResult(x);
          // Make sure we don't add duplicates
          const newFileIds = new Set(x.files.map(file => file.id));
          const existingFiles = projects.filter(file => !newFileIds.has(file.id));
          setProjects([...existingFiles, ...x.files]);
        } else {
          // If we got zero results but the API says there's more, 
          // something is wrong with the cursor - reset hasMoreResults
          if (x.hasMore) {
            setHasMoreResults(false);
          }
        }
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
    fetchPatchesForEmail,
    hasMoreResults
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

  // We'll replace the scroll detection with Intersection Observer
  const loadMoreRef = useRef(null);
  
  // Set up Intersection Observer to detect when loading element is visible
  useEffect(() => {
    if (!loadMoreRef.current) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        // If the loading element is visible and we have more results to load
        if (entries[0].isIntersecting && hasMoreResults && !loadingRef.current) {
          fetchPaginatedResults();
        }
      },
      { rootMargin: '200px' } // Start loading a bit before the element comes into view
    );
    
    observer.observe(loadMoreRef.current);
    
    return () => {
      if (loadMoreRef.current) {
        observer.unobserve(loadMoreRef.current);
      }
    };
  }, [loadMoreRef, hasMoreResults, fetchPaginatedResults, loadingRef]);
  
  // Keep this as a no-op to satisfy existing dependencies
  const onScroll = useCallback(() => {}, []);

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
      setInputValue(text);
    }
  }, [setSearchText, setInputValue, text]);

  if (!user) {
    return <></>;
  }

  return (
    <>
      {!isMini && (
        <div
          className={
            (isMini ? "h-16" : "h-32") + " w-full  border-b border-b-zinc-900 flex flex-col"
          }
        >
          <div className="flex pl-5 pr-10 content-start my-auto">
            {!isMini && (
              <div className="ml-5 relative my-auto">
                <input
                  value={inputValue}
                  onChange={(e: any) => {
                    // Update local state immediately for responsive UI
                    const value = e.target.value;
                    setInputValue(value);
                    
                    // Debounce the actual search
                    clearTimeout((window as any).searchTimeout);
                    (window as any).searchTimeout = setTimeout(() => {
                      setSearchText(value);
                    }, 300); // 300ms debounce
                  }}
                  className="pl-10 rounded-lg bg-zinc-800 border border-zinc-700 outline-none py-2 w-64"
                  type="text"
                  placeholder="Search projects..."
                />
                <MagnifyingGlassIcon className="absolute left-2 top-0 bottom-0 my-auto w-6 h-6" />
              </div>
            )}
            <div
              onClick={() => setFilterFavorited(!filterFavorited)}
              className="flex ml-2 mr-3 my-auto cursor-pointer"
              title={filterFavorited ? "Show all" : "Show favorites"}
            >
              {filterFavorited ? (
                <HeartFilledIcon color="red" className="w-6 h-6" />
              ) : (
                <HeartIcon className="w-6 h-6" />
              )}
            </div>
            
            <div 
              onClick={() => {
                const newViewMode = !isGridView;
                setIsGridView(newViewMode);
                // Save preference to localStorage
                if (typeof window !== 'undefined') {
                  localStorage.setItem('zen-files-view-mode', newViewMode ? 'grid' : 'list');
                }
              }}
              className="flex mr-5 my-auto cursor-pointer hover:text-white"
              title={isGridView ? "Switch to list view" : "Switch to grid view"}
            >
              {isGridView ? (
                <RowsIcon className="w-6 h-6" />
              ) : (
                <GridIcon className="w-6 h-6" />
              )}
            </div>
            {!isMini && (
              <button
                onClick={goToEditor}
                className="ml-10 active:scale-105 bg-violet-700 text-xs rounded-md px-3 py-1 flex cursor-pointer transition-colors hover:bg-violet-500"
              >
                <PlusCircledIcon className="w-5 h-5 mr-3 my-auto" />
                <div className="my-auto">New Patch</div>
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

              {loading && (
                <div className="w-56 h-40 ml-5 my-auto rounded-md bg-zinc-800 overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-zinc-700 to-transparent animate-shimmer" 
                     style={{ backgroundSize: '200% 100%' }}></div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
      <div
        ref={scrollRef}
        className={`flex-1 transition-all ${isGridView ? 'flex flex-wrap' : 'block'} object-start flex-1 overflow-scroll duration-300 ease-in-out content-start`}
      >
        {/* Loading state is now handled by shimmer placeholders */}
        
        {projects.length === 0 && !loading && searchText !== "" && (
          <div className="w-full text-center py-8 text-zinc-500">No matching projects found</div>
        )}

        {/* Project Files */}
        {isGridView ? (
          // Grid View
          projects.map((x) => (
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
          ))
        ) : (
          // List View
          <div className="w-full">
            {projects.map((x) => (
              <div 
                key={x.id}
                onClick={() => {
                  setRevisions([]);
                  setFileExpanded(x);
                }}
                className={`${x === fileExpanded ? "bg-zinc-700" : ""} hover:bg-zinc-900 transition-all w-full py-3 px-5 border-b border-zinc-800 flex items-center cursor-pointer`}
              >
                {/* Thumbnail */}
                {x.screenshot && (
                  <div className="w-14 h-14 rounded overflow-hidden mr-4 flex-shrink-0">
                    <Image
                      crossOrigin="anonymous"
                      alt="file thumbnail"
                      width="56"
                      height="56"
                      src={x.screenshot}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                
                {/* File info */}
                <div className="flex-grow">
                  <div className="text-sm font-medium">{x.name}</div>
                  <div className="flex items-center mt-1">
                    <div className="text-zinc-500 text-xs">{getTime(x.createdAt.toDate())}</div>
                    {x.isPublic && <div className="text-teal-500 text-xs ml-2">public</div>}
                    {x.tags?.map((tag) => (
                      <div key={tag} className="text-zinc-300 text-xs ml-2 px-1.5 py-0.5 rounded bg-zinc-800">
                        {tag}
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Revision count */}
                {x.commits && x.commits.length > 0 && (
                  <div className="flex items-center text-zinc-400 text-xs mr-4">
                    <CommitIcon className="w-4 h-4 mr-1" /> {x.commits.length}
                  </div>
                )}
                
                {/* Actions */}
                <div className="flex items-center ml-auto">
                  {/* Open button */}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      openFile(x);
                    }}
                    className="text-xs bg-zinc-800 hover:bg-zinc-700 rounded px-3 py-1 transition-colors mr-3"
                  >
                    Open
                  </button>
                  
                  {/* Favorite button */}
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      const documentRef = doc(db, "patches", x.id);
                      updateDoc(documentRef, { favorited: !x.favorited });
                      // Update local state
                      const updatedProjects = projects.map(project => 
                        project.id === x.id ? {...project, favorited: !x.favorited} : project
                      );
                      setProjects(updatedProjects);
                    }}
                    className="cursor-pointer"
                  >
                    {x.favorited ? (
                      <HeartFilledIcon color="red" className="w-5 h-5" />
                    ) : (
                      <HeartIcon className="w-5 h-5" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
          
        {/* Shimmer loading placeholders */}
        {loading && (
          <>
            {isGridView ? (
              // Grid view shimmer
              Array(3).fill(0).map((_, index) => (
                <div 
                  key={`shimmer-${index}`} 
                  className={`${isMini ? "w-32 h-32" : "w-64 h-40"} m-5 rounded-md bg-zinc-800 overflow-hidden relative`}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-zinc-700 to-transparent animate-shimmer" 
                       style={{ backgroundSize: '200% 100%' }}></div>
                </div>
              ))
            ) : (
              // List view shimmer
              <div className="w-full">
                {Array(3).fill(0).map((_, index) => (
                  <div 
                    key={`shimmer-${index}`} 
                    className="w-full py-3 px-5 border-b border-zinc-800 flex items-center"
                  >
                    {/* Thumbnail shimmer */}
                    <div className="w-14 h-14 rounded bg-zinc-800 overflow-hidden relative mr-4 flex-shrink-0">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-zinc-700 to-transparent animate-shimmer" 
                           style={{ backgroundSize: '200% 100%' }}></div>
                    </div>
                    
                    {/* Content shimmer */}
                    <div className="flex-grow">
                      {/* Title shimmer */}
                      <div className="h-5 w-40 rounded bg-zinc-800 overflow-hidden relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-zinc-700 to-transparent animate-shimmer" 
                             style={{ backgroundSize: '200% 100%' }}></div>
                      </div>
                      
                      {/* Details shimmer */}
                      <div className="flex mt-2">
                        <div className="h-3 w-20 rounded bg-zinc-800 overflow-hidden relative mr-2">
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-zinc-700 to-transparent animate-shimmer" 
                               style={{ backgroundSize: '200% 100%' }}></div>
                        </div>
                        <div className="h-3 w-12 rounded bg-zinc-800 overflow-hidden relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-zinc-700 to-transparent animate-shimmer" 
                               style={{ backgroundSize: '200% 100%' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        
        {/* Intersection observer target element */}
        {hasMoreResults && (
          <div ref={loadMoreRef} className="w-full h-1 opacity-0"></div>
        )}
        
        {/* End of results message */}
        {projects.length > 0 && !hasMoreResults && !loading && (
          <div className="w-full text-center py-4 text-zinc-500 text-sm">
            No more projects to load
          </div>
        )}
      </div>
    </>
  );
};

export default Files;
