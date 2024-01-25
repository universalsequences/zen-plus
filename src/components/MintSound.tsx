import React, { useEffect, useCallback, useRef, useState } from 'react';
import { contracts } from '@/lib/onchain/contracts';
import { usePublicClient, useWaitForTransaction } from 'wagmi'
import { parseEther } from 'viem'
import { abi } from '@/lib/abi/sound-drop-abi';

import { useContractWrite, usePrepareContractWrite, useAccount } from 'wagmi';

const MintSound: React.FC<{ numEditions: number, price: bigint, name: string, description: string, visuals: string, setDropAddress: (x: string | null) => void, dsp: string, parameterNames: string[], minValues: number[], maxValues: number[] }> = ({ dsp, setDropAddress, parameterNames, minValues, maxValues, visuals, name, description, numEditions, price }) => {
    let account = useAccount();
    const publicClient = usePublicClient();

    let args = [name, description, dsp, visuals, parameterNames, minValues, maxValues, [], ["left", "right"], price, numEditions];
    console.log("mint sound=", args);

    const { config } = usePrepareContractWrite({
        address: contracts.DropCreator,
        abi: abi,
        functionName: 'newDrop',
        args
    })

    const written = useRef(false);
    const { write, data } = useContractWrite(config)
    const { data: transactionData, isError: transactionError, isLoading: transactionLoading } = useWaitForTransaction(
        {
            hash: data ? data.hash : undefined
        });


    useEffect(() => {
        if (data && !transactionError && !transactionLoading) {
            console.log("waiting for trans data=", transactionData);
            fetchNewDrop(publicClient, data.hash).then(
                (x: any) => {
                    setDropAddress(x);
                });
        }
    }, [data, transactionLoading, transactionError, data, publicClient]);

    useEffect(() => {
        if (write && !written.current) {
            write();
            written.current = true;
        }
    }, [write]);

    return (<div></div>);
}



export default (MintSound);



export async function fetchNewDrop(provider: any, transactionHash: string): Promise<string | null> {
    const receipt = await provider.getTransactionReceipt({ hash: transactionHash });

    // Check if there are logs and the logs are from the expected contract
    if (receipt && receipt.logs && receipt.logs.length > 0) {
        return receipt.logs[0].address;
    }
    return null;
}

