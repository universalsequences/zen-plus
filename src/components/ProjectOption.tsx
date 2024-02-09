import React, { useEffect, useState } from 'react';
import { useStorage } from "@/contexts/StorageContext";
import { CommitIcon } from '@radix-ui/react-icons'
import { Revision, fetchRevisions } from '@/lib/onchain/fetch';
import { usePublicClient } from 'wagmi';

const ProjectOption: React.FC<{ head: any, loadPatchToken: (x: number) => void }> = ({ head, loadPatchToken }) => {
    let [opened, setOpened] = useState(false);
    let { fetchRevisions } = useStorage();
    let [revisions, setRevisions] = useState<any[]>([]);
    let publicClient = usePublicClient();

    useEffect(() => {
        if (opened) {
            fetchRevisions(head).then(setRevisions);
        }
    }, [opened, publicClient]);

    return (<div className="flex flex-col">
        <div
            onClick={() => loadPatchToken(head)}
            className="flex hover:bg-zinc-300 hover:text-black p-1 cursor-pointer">
            {head.tokenId && <div className="w-10 text-zinc-600">
                #{head.tokenId.toString()}
            </div>}
            <div>{head.name}</div>
            <div className="ml-auto text-zinc-600">{getTime(head.createdAt.toDate())}</div>
            <div
                onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                    e.stopPropagation();
                    setOpened(true);
                }}
                className="ml-2 flex w-12"><CommitIcon className="mr-2" /> {head.commits ? head.commits.length + 1 : head.revisionNumber ? head.revisionNumber.toString() : 1}</div>
        </div>
        {opened && <div className="flex flex-col ml-7 py-1 pl-1 ">
            {revisions.map(
                (head, index) =>
                    <div
                        key={index}
                        onClick={() => loadPatchToken(head)}
                        className="flex hover:bg-zinc-300 hover:text-black p-1 cursor-pointer">
                        <div>{head.name}</div>
                        <div className="ml-auto text-zinc-600">{getTime(head.createdAt.toDate())}</div>
                        <div
                            className="ml-2 text-zinc-400 flex w-12"><CommitIcon className="ml-1 w-2 mr-2" color="gray" /> {revisions.length - index}</div>
                    </div>

            )}
        </div>}

    </div>
    );
};

export default ProjectOption;

export const getTime = (_time: Date): string => {
    let time = new Date().getTime() - _time.getTime();
    let minutes = time / 1000 / 60;
    if (minutes < 60) {
        return Math.ceil(minutes) + " min. ago";
    }

    let hours = minutes / 60;
    if (hours < 48) {
        return Math.ceil(hours) + " hours ago "
    }

    let days = hours / 24;
    if (days > 14) {
        return (_time.getMonth() + 1) + "/" + _time.getDay();
    }
    return Math.round(days) + " days ago";
};

