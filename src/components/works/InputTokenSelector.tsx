import React, { useState, useEffect, useCallback } from 'react';
import { abi } from '@/lib/abi/erc721-abi';
import { trunc } from './Works';
import { WorkOption, fetchWorkOptions } from '@/lib/works/fetchWorks';
import { MixerVerticalIcon } from '@radix-ui/react-icons'
import { useContractRead, usePublicClient, usePrepareContractWrite, useContractWrite, useWalletClient, useAccount } from 'wagmi'
import * as ZenModule from '@/lib/abi/zen-module-abi';
import { contracts } from '@/lib/onchain/contracts';

const InputTokenSelector: React.FC<{ inputNumber: number, destinationContract: string, sourceContract: string, tokenId: number }> = ({ sourceContract, destinationContract, tokenId, inputNumber }) => {
    const [selectedToken, setSelectedToken] = useState<number | null>(null);
    const { data: totalSupply, isError, isLoading } = useContractRead({
        address: sourceContract as `0x${string}`,
        abi: abi,
        functionName: 'totalSupply',
    })

    let args = [destinationContract, tokenId, inputNumber, sourceContract, selectedToken, 0];
    console.log("args =", args);
    const { data: writerData, isLoading: isLoadingWriter, isSuccess: isSuccessWriter, write } = useContractWrite({
        address: contracts[5].ZenModule as `0x${string}`,
        abi: ZenModule.abi,
        functionName: "configureToken",
        args: [destinationContract, tokenId, inputNumber, sourceContract, selectedToken, 0]
    })

    const onClick = useCallback(async () => {
        if (selectedToken !== null) {
            // we then write the contract call
            if (write) {
                console.log('writing...');
                await write()
                console.log('wrote');
            }
        }
    }, [selectedToken, write]);

    let _totalSupply = totalSupply ? parseInt(totalSupply.toString()) : 0;

    return <div className="flex-1 flex flex-col">
        <div className="flex-wrap flex p-3 overflow-scroll">
            {new Array(_totalSupply).fill(0).map((a, i) => <div
                onClick={() => setSelectedToken(i + 1)}
                key={i}
                className={(selectedToken === i + 1 ? "bg-white text-black" : "") + " text-center text-base w-4 cursor-pointer"}>{i + 1}</div>)}
        </div>
        {selectedToken && <button onClick={onClick} className="bg-zinc-300 text-zinc-600 cursor-pointer rounded-full px-4 py-1 mx-auto">
            Connect to Input# {inputNumber + 1}
        </button>}
    </div >;
};


export default InputTokenSelector; 
