import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { documentId, addDoc, doc, getDoc, getFirestore, updateDoc, collection, query, orderBy, where, getDocs } from "firebase/firestore";
import { db } from '@/lib/db/firebase';
import {
    zoraTestnet,
    goerli,
    zora
} from 'wagmi/chains';
import Skeleton from '@/components/files/Skeleton';
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
    chain: number;
    patchId: string;
    image?: string;
};

const Works: React.FC<{ setShowNav: (x: boolean) => void }> = ({ setShowNav }) => {
    let [works, setWorks] = useState<WorkOption[]>([]);
    let [selectedWork, setSelectedWork] = useState<WorkOption | null>(null);
    const { user } = useAuth();

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

    let [chain, setChain] = useState<number | null>(!user ? zora.id : goerli.id);
    console.log(works);
    if (selectedWork) {
        return <WorkPlayer close={() => setSelectedWork(null)} work={selectedWork} />;
    }
    return <Skeleton><div className="flex-1 flex-col flex overflow-hidden">
        <div className="w-full h-32 border-b border-b-zinc-700 flex">
            <div className="flex text-lg px-10 my-auto">
                {user && <div onClick={() => setChain(goerli.id)} className={(chain === goerli.id ? "text-white" : "text-zinc-500") + " mr-5 cursor-pointer hover:text-white transition-all hover:scale-105"} >
                    testnet
                </div>}
                <div onClick={() => setChain(zoraTestnet.id)} className={(chain === zoraTestnet.id ? "text-white" : "text-zinc-500") + " mr-5 cursor-pointer hover:text-white transition-all hover:scale-105"} >
                    zora testnet
                </div>
                <div onClick={() => setChain(zora.id)} className={(chain === zora.id ? "text-white" : "text-zinc-500") + " mr-5 cursor-pointer hover:text-white transition-all hover:scale-105"} >
                    zora
                </div>
            </div>
        </div>
        <div className="flex flex-wrap flex-1 items-start content-start overflow-y-scroll content-start">
            {works.filter(x => (!chain || x.chain === chain) && x.image).map((x, i) => <Work key={i} select={() => setSelectedWork(x)} work={x} />)}
        </div>
    </div>
    </Skeleton >
};


const Work: React.FC<{ select: () => void, work: WorkOption }> = ({ select, work }) => {
    return (
        <div
            onClick={() => select()}
            className="border  m-3  p-5 border-zinc-800 hover:border-zinc-500 transition-colors cursor-pointer">
            <div className="w-72 h-40 overflow-hidden rounded-lg">
                <img src={work.image} className="object-cover w-full h-full" />
            </div>
            <div className="flex pt-4 px-2 pb-2">
                <div className="text-sm">
                    {work.name}
                </div>
                {work.chain === goerli.id && <div className="text-zinc-400 text-sm ml-auto italic">testnet</div>}
            </div>

            <div className="flex text-xs text-zinc-300">
                <div className="px-2">
                    <div>
                        {work.price} ETH
                    </div>

                    <div className="text-center text-zinc-400 text-xs">
                        price
                    </div>
                </div>
                <div className="ml-auto px-2">
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
