import React, { useEffect, useCallback, useRef, useState } from 'react';
import { usePublicClient, useWaitForTransaction } from 'wagmi'
import { parseEther } from 'viem'
import { abi } from '@/lib/abi/sound-drop-abi';

import { useContractWrite, usePrepareContractWrite, useAccount } from 'wagmi';

export const SOUND_CONTRACT = "0xf918Ab3443342b769D597ba3127f483294027dda";

const MintSound: React.FC<{ setDropAddress: (x: string | null) => void, dsp: string, parameterNames: string[], minValues: number[], maxValues: number[] }> = ({ dsp, setDropAddress, parameterNames, minValues, maxValues }) => {
    let account = useAccount();
    console.log('mint sound account=', account);

    const publicClient = usePublicClient();

    console.log('setting new drop =', dsp);
    let args = [dsp, parameterNames, minValues, maxValues, 0, 100];
    console.log('args =', args);

    const { config } = usePrepareContractWrite({
        address: SOUND_CONTRACT,
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


    console.log('config/write', config, write);
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
    console.log('waiting for receipt...', transactionHash);
    const receipt = await provider.getTransactionReceipt({ hash: transactionHash });

    console.log('receipt got=', receipt);

    // Check if there are logs and the logs are from the expected contract
    if (receipt && receipt.logs && receipt.logs.length > 0) {
        return receipt.logs[0].address;
    }
    return null;
}

