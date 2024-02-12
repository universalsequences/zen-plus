import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { CommitIcon } from '@radix-ui/react-icons'
import { ArrowDownIcon, MagnifyingGlassIcon, Cross2Icon, PlusCircledIcon } from '@radix-ui/react-icons'
import { getTime } from '@/components/ProjectOption';
import { useNav, NavOption } from '@/contexts/NavContext';
import Nav from '@/components/landing/Nav';
import { Project, useStorage } from '@/contexts/StorageContext';
import { useAuth } from '@/contexts/AuthContext';
import Skeleton from './Skeleton';

const Files: React.FC<{ fileOpened: any | null, setFileToOpen: (x: any) => void }> = ({ setFileToOpen, fileOpened }) => {
    let [fileExpanded, setFileExpanded] = useState<any | null>(null);
    let [projects, setProjects] = useState<any[]>([]);
    let [searchText, setSearchText] = useState("");
    const { navOption, setNavOption } = useNav();

    const { fetchPatch, fetchPatchesForEmail } = useStorage();
    let { user } = useAuth();

    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (fileOpened && projects) {
            let found = projects.find(x => x.id === fileOpened.id);
            if (found && found.commits) {
                setFileExpanded(found);
            }
        }
    }, [projects, fileOpened, setFileExpanded]);

    useEffect(() => {
        if (user) {
            setLoading(true);
            fetchPatchesForEmail(user.email).then((x) => {
                setLoading(false);
                setProjects(x);
            });
        }
    }, [user, setLoading]);

    let { fetchRevisions } = useStorage();
    let [revisions, setRevisions] = useState<any[]>([]);

    useEffect(() => {
        if (fileExpanded && fileExpanded.commits) {
            setLoading(true);
            fetchRevisions(fileExpanded).then((x) => {
                setLoading(false);
                setRevisions(x);
            });
        }
    }, [fileExpanded, setLoading]);


    const goToEditor = useCallback(() => {
        setNavOption(NavOption.Editor);
    }, []);

    const openFile = useCallback((file: any) => {
        setRevisions([]);
        setFileToOpen(file);
        setNavOption(NavOption.Editor);
    }, []);

    if (!user) {
        return <></>;
    }

    return <Skeleton>
        <div className="w-full h-32 border-b border-b-zinc-700 flex flex-col">
            <div className="flex pl-5 pr-10 content-start my-auto">

                <div className="ml-5 relative my-auto">
                    <input value={searchText} onChange={(e: any) => setSearchText(e.target.value)} className="pl-10 rounded-lg bg-zinc-800 border border-zinc-700 outline-none py-2 w-64" type="text" />
                    <MagnifyingGlassIcon className="absolute left-2 top-0 bottom-0 my-auto w-6 h-6" />
                </div>
                <button onClick={goToEditor} className="ml-10 active:scale-105 bg-violet-700 text-xs rounded-md px-3 py-1 flex cursor-pointer transition-colors hover:bg-violet-500">

                    <PlusCircledIcon className="w-5 h-5 mr-3 my-auto" />
                    <div className="my-auto">
                        New Project
                    </div>
                </button>
                <div className="text-base ml-auto mr-8 my-auto text-zinc-400 bg-zinc-400 rounded-xl p-2">
                    <img src="/zendotdash.svg" className="h-8" />
                </div>
            </div>
        </div>
        <div className={(!fileExpanded ? "h-0 " : " h-80  border-b ") + ("transition-all flex flex-col object-start w-full border-b-zinc-700 duration-300 ease-in-out relative")}>
            {fileExpanded && <div className="text-zinc-500 p-5 flex">
                <div className="my-auto">Revision History</div>
                <div className="my-auto text-white ml-5">{fileExpanded.name}</div>
                <button onClick={() => {
                    openFile(fileExpanded);
                }} className="active:scale-105 ml-10 my-auto bg-zinc-700 text-white text-xs rounded-md px-3 py-2 flex cursor-pointer transition-colors hover:bg-violet-500">
                    <PlusCircledIcon className="w-5 h-5 mr-3 my-auto" />
                    <div className="my-auto">
                        Open Latest Edit
                    </div>
                </button>
                {fileExpanded.screenshot && <button
                    className="ml-5 active:scale-105 ml-10 my-auto bg-zinc-700 text-white text-xs rounded-md px-3 py-2 flex cursor-pointer transition-colors hover:bg-violet-500"
                    onClick={() => {

                        const anchor = document.createElement('a');
                        // Set the href to the URL of the image
                        anchor.href = fileExpanded.screenshot;
                        // Use the 'download' attribute to set the new filename
                        anchor.download = 'screenshot.png';
                        // Append the anchor to the body (required for Firefox)
                        document.body.appendChild(anchor);
                        // Programmatically click the anchor to trigger the download
                        anchor.click();
                        // Remove the anchor from the body
                        document.body.removeChild(anchor);
                    }}>
                    <ArrowDownIcon className="w-5 h-5 mr-3 my-auto" />
                    <div className="my-auto">
                        Download Image
                    </div>
                </button>}
            </div>}
            {fileExpanded && <Cross2Icon onClick={() => {
                setRevisions([]);
                setFileExpanded(null);
            }} className="hover:scale-105 transition-all cursor-pointer absolute top-5 right-5 w-6 h-6" />}

            <div className="flex overflow-x-scroll content-start">
                {fileExpanded && [fileExpanded, ...[...revisions]].map(
                    x => <div key={x.id} onClick={() => openFile(x)} className={"flex flex-col m-3 text-sm border-zinc-800 border hover:border-zinc-200 transition-all p-5 cursor-pointer"}>
                        <div className="w-56 h-40  mb-5 hover:bg-zinc-700 transition-colors bg-zinc-800 rounded-lg relative overflow-hidden">
                            {x.screenshot && <Image width={96} height={70} alt="test" src={x.screenshot} className="w-full h-full object-cover" />}
                            {x.commits && <div
                                style={x.screenshot ? { backgroundColor: "#ffffffa3", backdropFilter: "blur(9px)", color: "#3d3d3d" } : {}}
                                className="hover:scale-105 transition-all absolute bottom-5 right-5 text-zinc-400 text-xs flex w-12 rounded-full px-1"><CommitIcon className="my-auto ml-1 w-5 mr-2" color="gray" /> {x.commits.length}</div>}
                        </div>
                        <div>{x.name}</div>
                        <div className="text-zinc-500">{getTime(x.createdAt.toDate())}</div>

                    </div>)}

                {loading && <div className="ml-20 my-auto spinner" aria-label="Loading"></div>}
            </div>
        </div>
        <div className="transition-all flex flex-wrap object-start flex-1 overflow-scroll duration-300 ease-in-out content-start ">
            {!fileExpanded && loading && <div className="m-auto spinner" aria-label="Loading"></div>}

            {[...projects].reverse().filter(x => searchText === "" || x.name.toLowerCase().includes(searchText.toLowerCase())).map(
                x => <div
                    key={x.id}
                    onClick={() => {
                        if (fileExpanded) {
                            setRevisions([]);
                            setFileExpanded(x);
                        } else {
                            openFile(x);
                        }
                    }} className={(x === fileExpanded ? "bg-zinc-700 rounded-lg " : "") + "flex flex-col m-3 text-sm border-zinc-800 border hover:border-zinc-200 transition-all p-5 cursor-pointer"}>
                    <div className="w-72 h-40  mb-5 hover:bg-zinc-700 transition-colors bg-zinc-800 rounded-lg relative overflow-hidden">
                        {/*x.screenshot && <Image alt="test" width={126} height={70} src={x.screenshot} className="w-full h-full object-cover" />*/}
                        {x.screenshot && <img src={x.screenshot} className="w-full h-full object-cover" />}
                        {x.commits && <div
                            onClick={(e: any) => { e.stopPropagation(); setRevisions([]); setFileExpanded(x) }}
                            style={x.screenshot ? { backgroundColor: "#ffffffa3", backdropFilter: "blur(9px)", color: "#3d3d3d" } : {}}
                            className="hover:scale-105 transition-all absolute bottom-5 right-5 text-zinc-400 text-xs flex w-12 rounded-full px-1"><CommitIcon className="my-auto ml-1 w-5 mr-2" color="gray" /> {x.commits.length}</div>}
                    </div>
                    <div>{x.name}</div>
                    <div className="text-zinc-500">{getTime(x.createdAt.toDate())}</div>

                </div>)}
        </div>
    </Skeleton >
    /*
return <div className="flex flex-1 w-full h-full bg-zinc-900 min-h-screen max-h-screen">
    <div className="min-h-screen w-64 border-r border-r-zinc-700">
        <div className="text-sm text-zinc-400 p-5 mb-10">
            {user.email}
        </div>
        <div className="w-40"><Nav /></div>
    </div>
    <div style={{}} className="flex flex-1  flex-col overflow-hidden">
    </div>
</div >
*/
};


export default Files;
