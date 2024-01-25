import React, { useState, useEffect } from 'react';
import { trunc } from './Works';
import { WorkOption, fetchWorkOptions } from '@/lib/works/fetchWorks';
import { MixerVerticalIcon } from '@radix-ui/react-icons'
import { usePublicClient, useContractRead } from 'wagmi'
import InputTokenSelector from './InputTokenSelector';

const ModuleConnector: React.FC<{ inputNumber: number, contractAddress: string, tokenId: number }> = ({ contractAddress, tokenId, inputNumber }) => {
    let [works, setWorks] = useState<WorkOption[]>([]);
    let [selected, setSelected] = useState<WorkOption | null>(null);

    useEffect(() => {
        fetchWorkOptions().then(
            x => {
                setWorks(x.filter(x => x.dropAddress !== contractAddress));
            });
    }, []);

    if (selected) {
        return <div className="flex-1 flex flex-col">
            <InputTokenSelector tokenId={tokenId} destinationContract={contractAddress} sourceContract={selected.dropAddress} inputNumber={inputNumber} />
        </div>
    }

    return <div className="flex-1 overflow-scroll">
        {works.map(
            (work, i) =>
                <div key={i} onClick={() => setSelected(work)} className="flex px-2 py-1 cursor-pointer">
                    <div>{work.name}</div>
                    <div className="ml-auto text-zinc-400">{trunc(work.ownerAddress)}</div>
                </div>)}
    </div>;
};

export default ModuleConnector;

