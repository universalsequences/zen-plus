import React, { useEffect, useState } from 'react';
import { documentId, addDoc, doc, getDoc, getFirestore, updateDoc, collection, query, orderBy, where, getDocs } from "firebase/firestore";
import { db } from '@/lib/db/firebase';
import WorkPlayer from './WorkPlayer';

export interface WorkOption {
    createdAt: any;
    editionSize: number;
    description: string;
    dropAddress: string;
    name: string;
    ownerAddress: string;
    user: string;
    price: string;
    chainId: number;
    patchId: string;
};

const Works: React.FC<{ setShowNav: (x: boolean) => void }> = ({ setShowNav }) => {
    let [works, setWorks] = useState<WorkOption[]>([]);
    let [selectedWork, setSelectedWork] = useState<WorkOption | null>(null);

    useEffect(() => {
        setShowNav(selectedWork === null);
    }, [setShowNav, selectedWork]);

    useEffect(() => {
        // fetch all works
        const collectionRef = collection(db, 'drops');
        const q = query(collectionRef);
        try {
            getDocs(q).then(
                querySnapshot => {
                    const documents: WorkOption[] = [];
                    querySnapshot.forEach(doc => {
                        if (!doc.data().hasNewVersion) {
                            documents.push({ ...doc.data() } as WorkOption);
                        }
                    });
                    documents.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);
                    setWorks(documents);
                });
        } catch (e) {
        }

    }, []);

    if (selectedWork) {
        return <WorkPlayer close={() => setSelectedWork(null)} work={selectedWork} />;
    }
    return <div className="px-24  flex flex-wrap items-start content-start">
        {works.map(x => <Work select={() => setSelectedWork(x)} work={x} />)}
    </div>;
};


const Work: React.FC<{ select: () => void, work: WorkOption }> = ({ select, work }) => {
    return (
        <div
            onClick={() => select()}
            className="border border-zinc-600 m-1 w-64 h-24 cursor-pointer">
            <div className="p-2">
                {work.name}
            </div>
            <div className="flex">
                <div className="p-2">
                    <div>
                        {work.price} ETH
                    </div>

                    <div className="text-center text-zinc-400 text-xs">
                        price
                    </div>
                </div>
                <div className="ml-auto p-2">
                    <div>
                        {trunc(work.ownerAddress)}
                    </div>
                    <div className="text-center text-zinc-400 text-xs">
                        author
                    </div>
                </div>
            </div>
        </div>
    );
};
export default Works;

export const trunc = (x: string) => x.slice(0, 5) + '...' + x.slice(x.length - 4);
