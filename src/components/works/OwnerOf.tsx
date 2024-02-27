import React, { memo } from 'react';
import { trunc } from './WorkPlayer';
import {
    mainnet
} from 'wagmi/chains';
import { abi } from '@/lib/abi/erc721-abi';
import { usePublicClient, useContractRead, useSwitchNetwork } from 'wagmi'
import { useEnsName } from 'wagmi';

const OwnerOf: React.FC<{ chainId: number, dropAddress: string, tokenId: number }> = ({ tokenId, dropAddress, chainId }) => {
    const { data: ownerOf, isError: _isError, isLoading: _isLoading } = useContractRead({
        address: dropAddress as `0x${string}`,
        abi: abi,
        functionName: 'ownerOf',
        args: [tokenId],
        chainId: chainId
    })

    console.log("resolving ownerOF=", ownerOf);
    const ensName = useEnsName({ address: ownerOf as any, chainId: mainnet.id });
    console.log("chainId=%s dropAddress=%s tokenId=%s", chainId, dropAddress, tokenId);
    console.log("ens =", ensName);

    let data = ensName.data;
    console.log('data =', data);
    if (ownerOf) {
        return <div className="text-white flex">{data ? data : trunc(ownerOf as string) as string} <span className="ml-2 text-zinc-400">owner</span> </div>;
    }
    return <></>;
};

export default OwnerOf;
