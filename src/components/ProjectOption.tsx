import React, { useEffect, useState } from 'react';
import { CommitIcon } from '@radix-ui/react-icons'
import { Revision, fetchRevisions } from '@/lib/onchain/fetch';
import { usePublicClient } from 'wagmi';

const ProjectOption: React.FC<{ head: any, loadPatchToken: (x: number) => void }> = ({ head, loadPatchToken }) => {
    let [opened, setOpened] = useState(false);
    let [revisions, setRevisions] = useState<Revision[]>([]);
    let publicClient = usePublicClient();

    useEffect(() => {
        if (opened) {
            let token = head.tokenId;
            fetchRevisions(publicClient, token).then(setRevisions);
        }
    }, [opened, publicClient]);

    return (<div className="flex flex-col">
        <div
            onClick={() => loadPatchToken(head.tokenId)}
            className="flex hover:bg-zinc-300 hover:text-black p-1 cursor-pointer">
            <div className="w-10 text-zinc-600">
                #{head.tokenId.toString()}
            </div> <div>{head.name}</div> <div
                onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                    e.stopPropagation();
                    setOpened(true);
                }}
                className="ml-auto flex w-12"><CommitIcon className="mr-2" /> {head.revisionNumber.toString()}</div>
        </div>
        <div className="flex flex-col ml-3">
            {revisions.slice(1).map(
                (revision, index) =>
                    <div
                        onClick={() => loadPatchToken(revision.tokenId)}
                        className="flex hover:bg-zinc-300 hover:text-black p-1 cursor-pointer">
                        <div className="w-10 text-zinc-600">
                            #{revision.tokenId.toString()}
                        </div> <div>{revision.name}</div> <div
                            className="ml-auto flex w-12 opacity-50"><CommitIcon className="mr-2" /> {parseInt(head.revisionNumber.toString()) - index - 1}</div>
                    </div>)}
        </div>

    </div>
    );
};

export default ProjectOption;
