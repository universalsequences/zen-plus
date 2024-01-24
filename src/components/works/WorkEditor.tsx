import React, { useState } from 'react';
import ModuleConnector from './ModuleConnector';
import { MixerVerticalIcon } from '@radix-ui/react-icons'
import { usePublicClient, useContractRead } from 'wagmi'
import { abi } from '@/lib/abi/zen-module-abi';

export const ZEN_MODULE = "0xc22cd00cfa6e1b272fc75dc3f4940d8b833a7c76";

const WorkEditor: React.FC<{ contractAddress: string, tokenId: number }> = ({ contractAddress, tokenId }) => {
    // work editor shows what is connected already and lets you connect them 

    const [selectedInput, setSelectedInput] = useState<number | null>(null);

    const { data, isError, isLoading } = useContractRead({
        address: ZEN_MODULE as `0x${string}`,
        abi: abi,
        functionName: 'getWorkToken',
        args: [contractAddress, tokenId]
    })

    console.log("WORK TOKEN RECEIVED=", data, isError);
    // if is Error then we have no inputs

    if (data) {
        return <>
            <div
                style={{
                    backgroundColor: "#0b0a0a66",
                    border: "1px solid #343232",
                    width: 180,
                    borderTopRightRadius: 20,
                    borderTopLeftRadius: 20,
                }}
                className="p-2 flex text-white fixed bottom-0 left-20">
                {selectedInput !== null &&
                    <div
                        style={{
                            backgroundColor: "#0b0a0a66",
                            border: "1px solid #343232",
                        }}
                        className="absolute flex flex-col -top-64 w-64 h-56 p-2 text-xs rounded-lg">
                        <div className="text-zinc-400">Available Modules to Connect</div>
                        <ModuleConnector inputNumber={selectedInput} contractAddress={contractAddress} tokenId={tokenId} />
                    </div>}
                <MixerVerticalIcon className="w-7 h-7 my-auto" />
                <div className="flex flex-col">
                    <div className="flex">
                        <div
                            onClick={() => setSelectedInput(selectedInput === 0 ? null : 0)}
                            className={(selectedInput === 0 ? "bg-zinc-800" : "") + " w-16 text-center m-1 border border-zinc-800 cursor-pointer p-1 rounded-md"}>
                            <div>
                                1
                            </div>
                            <div className="">
                                empty
                            </div>
                        </div>
                        <div
                            onClick={() => setSelectedInput(selectedInput === 1 ? null : 1)}
                            className={(selectedInput === 1 ? "bg-zinc-800" : "") + " w-16 text-center m-1 border border-zinc-800 cursor-pointer p-1 rounded-md"}>
                            <div>
                                2
                            </div>
                            <div>
                                empty
                            </div>
                        </div>
                    </div>
                    <div className="text-center text-xs text-zinc-700">
                        inputs
                    </div>
                </div>
            </div >
        </>
    }
    return <div>
    </div>;
};

export default WorkEditor;
