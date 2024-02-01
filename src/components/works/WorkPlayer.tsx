import React, { useEffect, useState } from 'react';
import { abi } from '@/lib/abi/erc721-abi';
import { usePublicClient, useContractRead, useSwitchNetwork } from 'wagmi'
import { ethers } from 'ethers';
import WorkEditor from './WorkEditor';
import { ArrowLeftIcon, CaretSortIcon } from '@radix-ui/react-icons'
import MintButton from './MintButton';
import { WorkOption } from './Works';
import { Step } from './enum';

const WorkPlayer: React.FC<{ close: () => void, work: WorkOption }> = ({ work, close }) => {
    console.log(work);
    const [opened, setOpened] = useState(false);
    const [step, setStep] = useState(Step.None);
    const [mintedToken, setMintedToken] = useState<number | null>(null);
    const [activeAnimation, setActiveAnimation] = useState<number | null>(null);
    //const publicClient = usePublicClient();
    const { switchNetwork } = useSwitchNetwork();

    useEffect(() => {
        if (switchNetwork) {
            let chainId = work.chainId || 5;
            switchNetwork(chainId);
        }
    }, [work, switchNetwork]);

    console.log('work drop address=', work.dropAddress);
    const { data: totalSupply, isError, isLoading } = useContractRead({
        address: work.dropAddress as `0x${string}`,
        abi: abi,
        functionName: 'totalSupply',
    })

    let _totalSupply = totalSupply ? parseInt(totalSupply.toString()) : 0;
    useEffect(() => {
        if (_totalSupply > 0) {
            setActiveAnimation(1);
        }
    }, [_totalSupply]);

    useEffect(() => {
        if (mintedToken) {
            setActiveAnimation(mintedToken);
        }
    }, [mintedToken, setActiveAnimation]);

    let url = `/api/getHTML?contractAddress=${work.dropAddress}&tokenId=${activeAnimation}`;

    return (<div className="flex flex-col w-full min-h-screen h-full max-h-screen">
        <ArrowLeftIcon onClick={() => close()} className="w-8 h-8 cursor-pointer absolute bottom-2 left-5" />
        <div className="w-full flex">
            <iframe
                style={{ width: "100vw", height: "100vh" }}
                src={url} className="w-full mx-auto" />
        </div>
        {/*
        */}

        {activeAnimation ? <WorkEditor tokenId={activeAnimation} contractAddress={work.dropAddress} /> : ''}
        <div
            style={{
                backgroundColor: "#0b0a0a66",
                border: "1px solid #343232",
                width: 500,
                borderTopRightRadius: 20,
                borderTopLeftRadius: 20,
            }}
            className=" fixed left-0 right-0 mx-auto bottom-0  h-10 bg-zinc-950 pl-10 flex text-sm  ">
            <div className="w-48 my-auto">
                {work.name}
            </div>
            <div
                className="text-zinc-300 ml-10 w-50 my-auto text-center">
                {trunc(work.ownerAddress)}
            </div>
            <div
                onClick={() => setOpened(!opened)}
                style={{
                    borderTopRightRadius: 20,
                    borderLeft: "1px solid #ffffff1f",
                }}
                className={(opened ? "bg-zinc-900 " : "") + " ml-10 w-32 my-auto h-full flex text-center cursor-pointer relative"}>
                {opened && <div
                    style={{
                        borderRadius: "10px",
                        backgroundColor: "#0b0a0a66",
                        backdropFilter: "blur(16px)",
                        border: "1px solid #ffffff1f",
                    }}
                    className="absolute bottom-10 -left-10 p-3 flex flex-col w-56 h-64 bg-zinc-950 border border-zinc-600">
                    <div className="text-zinc-300">
                        {_totalSupply} minted tokens
                    </div>
                    <div className="flex flex-wrap text-base">
                        {totalSupply ? new Array(mintedToken ? mintedToken : _totalSupply).fill(0).map((a, i) => <span key={i} onClick={() => setActiveAnimation(i + 1)} className={activeAnimation === i + 1 ? " w-6 bg-white text-black mr-3 " : " text-center w-6 mr-2 cursor-pointer"}>{i + 1}</span>) : ""}
                    </div>
                </div>}

                <div
                    className="my-auto pl-4 w-full flex">
                    <div>Work #{activeAnimation}</div>
                    <CaretSortIcon className="ml-auto mr-4" />
                </div>
            </div>
        </div>
        <div className="mx-auto fixed bottom-0 right-10 table">
            <MintButton
                work={work}
                tokenPrice={work.price}
                mintedToken={mintedToken}
                setMintedToken={setMintedToken}
                totalSupply={_totalSupply}
                balanceOf={1000000}
                step={step}
                setStep={setStep}
                contractAddress={work.dropAddress as `0x{string}`}
                hide={false} />
        </div>
    </div >);
};

export default WorkPlayer;

const trunc = (x: string) => x.slice(0, 5) + '...' + x.slice(x.length - 4);
