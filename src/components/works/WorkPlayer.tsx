import React, { useRef, useEffect, useState } from 'react';
import OwnerOf from './OwnerOf';
import {
    mainnet
} from 'wagmi/chains';
import { useAccount, useEnsName } from 'wagmi';
import { abi } from '@/lib/abi/erc721-abi';
import { ConnectButton, lightTheme } from '@rainbow-me/rainbowkit';
import { usePublicClient, useContractRead, useSwitchNetwork } from 'wagmi'
import { ethers } from 'ethers';
import WorkEditor from './WorkEditor';
import { TriangleDownIcon, EnterFullScreenIcon, ExitFullScreenIcon, Cross2Icon, InfoCircledIcon, DashboardIcon, ArrowLeftIcon, CaretSortIcon } from '@radix-ui/react-icons'
import MintButton from './MintButton';
import { WorkOption } from './Works';
import { Step } from './enum';

const WorkPlayer: React.FC<{ close: () => void, work: WorkOption }> = ({ work, close }) => {
    const account = useAccount();
    const [fullscreen, setFullScreen] = useState(false);
    const [opened, setOpened] = useState(false);
    const [step, setStep] = useState(Step.None);
    const [mintedToken, setMintedToken] = useState<number | null>(null);
    const [activeAnimation, setActiveAnimation] = useState<number | null>(null);
    const [parameters, setParameters] = useState<any | null>(null);
    //const publicClient = usePublicClient();
    const { switchNetwork } = useSwitchNetwork();

    useEffect(() => {
        window.history.pushState(null, '', `/${work.name}`);
    }, [work]);
    useEffect(() => {
        let version = work.version ? work.version : 1;
        let url = `/api/getParameters?contractAddress=${work.dropAddress}&tokenId=${activeAnimation}&chainId=${work.chain}&version=${version}`;
        fetch(url).then(
            async r => {
                let json = await r.json();
                setParameters(json);
            });
    }, [activeAnimation]);
    console.log("PARAMETERS =", parameters);

    /*
    useEffect(() => {
        if (switchNetwork) {
            let chainId = work.chain || 5;
            console.log('switch to chain=', chainId);
            switchNetwork(chainId);
        }
    }, [work, switchNetwork]);
    */

    let ref = useRef<any | null>(null);
    /*
    useEffect(() => {
        window.addEventListener("message", (e: MessageEvent) => {
            if (e.data === "ready") {
                console.log("received ready");
                setTimeout(() => {
                    if (ref.current) {
                        console.log("sending useC");
                        ref.current.contentWindow!.postMessage("useC", "*");
                    }
                }, 100);
            }
        });
    }, []);
    */

    const { data: totalSupply, isError, isLoading } = useContractRead({
        address: work.dropAddress as `0x${string}`,
        abi: abi,
        functionName: 'totalSupply',
        chainId: work.chain || 5
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

    const [hovered, setHovered] = useState<number | null>(null);
    const [showInfo, setShowInfo] = useState(false);

    let version = work.version ? work.version : 2;
    let url = `/api/getHTML?contractAddress=${work.dropAddress}&tokenId=${activeAnimation}&chainId=${work.chain}&version=${version}`;


    return (<div className="flex flex-col w-full min-h-screen h-full max-h-screen bg-zinc-950">
        <div className="absolute top-5 right-5">
            {account && account.address && !fullscreen && <ConnectButton accountStatus="avatar" showBalance={false} />}
        </div>
        {!fullscreen && <ArrowLeftIcon onClick={() => close()} className="w-8 h-8 cursor-pointer absolute bottom-5 left-5" />}
        <div className="absolute z-30 top-5 left-5 cursor-pointer">

            {fullscreen ? <ExitFullScreenIcon className="w-8 h-8" onClick={() => setFullScreen(false)} /> :
                <EnterFullScreenIcon className="w-8 h-8" onClick={() => setFullScreen(true)} />}
        </div>
        <div className="w-full flex m-auto">
            <iframe
                ref={ref}
                style={{
                    transform: fullscreen ? undefined : "translate(0px, -50px)",
                    boxShadow: fullscreen ? "" : "rgba(0, 0, 0, 0.35) 0px 5px 15px",
                    width: fullscreen ? "100vw" : "106vh", height: fullscreen ? "100vh" : "80vh"
                }}
                src={url} className={(fullscreen ? "" : "border-zinc-800 rounded-md border ") + "w-full mx-auto transition-all duration-300 ease-in-out"} />
        </div>
        {/*
        */}

        {!fullscreen && parameters && <div className="left-40 bottom-5 flex w-64 py-1 absolute flex-wrap">
            {Object.keys(parameters).map(
                (name) => <div key={name} className="flex flex-col text-white text-xs m-1 text-center">
                    <div>
                        {parameters[name]}
                    </div>
                    <div className="text-zinc-500">
                        {name}
                    </div>
                </div>)}
        </div>}


        {/* activeAnimation ? <WorkEditor tokenId={activeAnimation} contractAddress={work.dropAddress} /> : ''*/}
        <div
            style={{
                //overflow: "hidden",
                width: fullscreen ? ((showInfo || opened) ? 500 : "") : showInfo ? 400 : 500,
                borderRadius: 20,
                boxShadow: "rgba(0, 0, 0, 0.35) 0px 5px 15px",
                background: (fullscreen && opened) ? "#000000bd" : (fullscreen || opened || showInfo) ? "#00000074" : undefined,
                backdropFilter: fullscreen || opened || showInfo ? "blur(8px)" : "",
                border: (showInfo || opened) ? "1px solid #ffffff3f" : ""
            }}
            className={(fullscreen ? "right-10 " : "left-0 right-0 mx-auto ") + (opened ? (_totalSupply > 20 ? "h-64 pr-5" : "h-36 pr-5") : showInfo ? "h-32 pr-5 " : "h-10") + " fixed bottom-5  bg-zinc-900 pl-10 flex text-xs transition-all duration-300 ease-in-out "}>
            {opened ? <div className="flex flex-col w-full mt-5 items-start">
                <Cross2Icon onClick={() => setOpened(false)} className="absolute top-5 right-5 w-5 h-5 cursor-pointer" />
                <div className="flex flex-wrap text-base mt-2 w-full pr-5">
                    {totalSupply ? new Array(mintedToken ? mintedToken : _totalSupply).fill(0).map((a, i) => <span key={i} onClick={() => setActiveAnimation(i + 1)} className={activeAnimation === i + 1 ? " w-6 border-b border-b-zinc-300 mr-3 mb-1 text-center relative " : " text-center border border-zinc-800 w-6 mr-3 mb-1 cursor-pointer hover:border-b border-b-zinc-900 hover:border-b-zinc-300 relative  hover:bg-zinc-800 transition-colors"} onMouseLeave={() => setHovered(null)} onMouseOver={() => setHovered(i)} >
                        <span className={fullscreen && hovered !== i ? "text-zinc-200" : ""}>
                            {i + 1}
                        </span>
                        {hovered === i && <div className="absolute -top-10  text-xs bg-zinc-700 text-white px-3 py-2 rounded-md z-30 pointer-events-none">
                            <OwnerOf dropAddress={work.dropAddress} chainId={work.chain || 5} tokenId={i + 1} />
                            <TriangleDownIcon color="#3f3f3f" className="w-8 h-8 absolute -bottom-4 left-0" />
                        </div>}

                    </span>) : ""}
                </div>
                <div className="text-zinc-500 text-sm mx-auto text-center mt-auto mb-4 flex">
                    <DashboardIcon className="w-6 h-6 mr-3" /> <div className="my-auto">gallery</div>
                </div>
                <div className="absolute bottom-3 left-3 text-xs text-zinc-500 w-32">
                    each minted token, is a unique composition
                </div>
            </div> : showInfo ? <div className="flex my-auto pr-5">
                <Cross2Icon onClick={() => setShowInfo(false)} className="absolute top-5 right-5 w-5 h-5 cursor-pointer" />
                <div>
                    {work.description}
                </div>
                <div className="text-zinc-400 ml-5">
                    created with <span className="text-white">zen+</span>. all sounds and visuals stored directly onchain.

                </div>
            </div> : <>
                <div className="w-48 my-auto text-base flex">
                    {work.name}
                    <InfoCircledIcon onClick={() => setShowInfo(!showInfo)} className="w-4 h-4 ml-4 my-auto cursor-pointer  transition-all hover:stroke-zinc-100" />
                </div>
                {showInfo && <div
                    style={{
                        borderRadius: "10px",
                        backgroundColor: "#0b0a0a66",
                        backdropFilter: "blur(16px)",
                        border: "1px solid #ffffff1f",
                    }}
                    className="absolute bottom-20 w-64 text-sm p-5">
                    {work.description}
                </div>}


                {!fullscreen && <div
                    className={(fullscreen ? "w-24" : "w-50") + " text-zinc-300 ml-10 my-auto text-center flex"}>
                    <div className="text-zinc-400 mr-5 flex">
                        {activeAnimation ? <OwnerOf dropAddress={work.dropAddress} chainId={work.chain || 5} tokenId={activeAnimation} /> :
                            trunc(work.ownerAddress)}
                    </div>
                </div>}
                <div
                    onClick={() => setOpened(!opened)}
                    style={{
                        borderTopRightRadius: 20,
                        borderBottomRightRadius: 20,
                        borderLeft: "1px solid #ffffff1f",
                    }}
                    className={(opened ? "bg-zinc-700 " : "") + " ml-10 w-32 my-auto h-full flex text-center cursor-pointer relative hover:bg-zinc-700 transition-colors "}>
                    {opened && <div
                        style={{
                            borderRadius: "10px",
                            backgroundColor: "#0b0a0a66",
                            backdropFilter: "blur(16px)",
                            border: "1px solid #ffffff1f",
                        }}
                        className="absolute bottom-10 -left-10 p-3 flex flex-col w-56 h-64 bg-zinc-950 border border-zinc-600 hover:bg-zinc-200 transition-colors">
                    </div>}

                    <div
                        className="my-auto w-32 pl-4 flex">
                        <DashboardIcon className="w-4 h-4 my-auto mr-2" />
                        <div>Token #{activeAnimation}</div>
                        <CaretSortIcon className="ml-auto my-auto mr-4" />
                    </div>
                </div>
            </>}
        </div>
        {!fullscreen && <div className="mx-auto fixed bottom-0 right-10 table">
            <MintButton
                chainId={work.chain || 5}
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
        </div>}
    </div >);
};

export default WorkPlayer;

export const trunc = (x: string) => x.slice(0, 5) + '...' + x.slice(x.length - 4);
