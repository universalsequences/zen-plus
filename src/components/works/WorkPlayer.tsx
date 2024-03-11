import React, { useRef, useEffect, useState } from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { isMobile } from 'react-device-detect';
import OwnerOf from './OwnerOf';
import { useRouter } from 'next/router';
import {
    mainnet
} from 'wagmi/chains';
import { useAccount, useEnsName } from 'wagmi';
import { abi } from '@/lib/abi/erc721-abi';
import { ConnectButton, lightTheme } from '@rainbow-me/rainbowkit';
import { usePublicClient, useContractRead, useSwitchNetwork } from 'wagmi'
import { ethers } from 'ethers';
import WorkEditor from './WorkEditor';
import { BoxIcon, VideoIcon, CopyIcon, ArrowTopRightIcon, TriangleDownIcon, EnterFullScreenIcon, ExitFullScreenIcon, Cross2Icon, InfoCircledIcon, DashboardIcon, ArrowLeftIcon, CaretSortIcon } from '@radix-ui/react-icons'
import MintButton from './MintButton';
import { WorkOption } from './Works';
import { Step } from './enum';

const WorkPlayer: React.FC<{ close: () => void, work: WorkOption }> = ({ work, close }) => {
    const account = useAccount();
    const [fullscreen, setFullScreen] = useState(false);
    const [opened, setOpened] = useState(false);
    const [step, setStep] = useState(Step.None);
    const [mintedToken, setMintedToken] = useState<number | null>(null);
    const router = useRouter();
    const { id } = router.query; // Accessing the tokenid directly
    const [activeAnimation, setActiveAnimation] = useState<number | null>(null);
    const [parameters, setParameters] = useState<any | null>(null);
    //const publicClient = usePublicClient();
    const { switchNetwork } = useSwitchNetwork();



    useEffect(() => {
        window.history.pushState(null, '', `/${work.name}`);
    }, [work]);

    useEffect(() => {
        if (activeAnimation) {
            window.history.pushState(null, '', `/${work.name}?id=${activeAnimation}`);
        }
    }, [work, activeAnimation]);

    const [video, setVideo] = useState<string | null>(null);
    const [audio, setAudio] = useState<string | null>(null);

    useEffect(() => {
        let version = work.version ? work.version : 1;
        let url = `/api/getParameters?contractAddress=${work.dropAddress}&tokenId=${activeAnimation}&chainId=${work.chain}&version=${version}`;
        fetch(url).then(
            async r => {
                let json = await r.json();
                setParameters(json);
            });
    }, [activeAnimation]);

    useEffect(() => {
        let version = work.version ? work.version : 1;
        let url = `/api/getVideo?contractAddress=${work.dropAddress}&tokenId=${activeAnimation}&chainId=${work.chain}&version=${version}`;
        fetch(url).then(
            async r => {
                let json = await r.json();
                setVideo(json.video || null);
                setAudio(json.audio || null);
            });
    }, [activeAnimation, setVideo, setAudio]);

    console.log("VIDEO=", video);
    console.log("audio=", audio);

    console.log("PARAMETERS =", parameters);

    const [isClientMobile, setIsClientMobile] = useState(false);

    const videoRef = useRef<HTMLVideoElement | null>(null);

    useEffect(() => {
        setIsClientMobile(isMobile);
    }, [isMobile]);

    /*
    useEffect(() => {
        if (switchNetwork) {
            let chainId = work.chain || 5;
            console.log('switch to chain=', chainId);
            switchNetwork(chainId);
        }
    }, [work, switchNetwork]);
    */

    let [copied, setCopied] = useState(false);

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
        if (id == null && _totalSupply > 0) {
            setActiveAnimation(1);
        }
    }, [_totalSupply]);

    useEffect(() => {
        if (_totalSupply && id && typeof id === "string") {
            if (_totalSupply >= parseInt(id)) {
                setActiveAnimation(parseInt(id));
            } else {
                setActiveAnimation(_totalSupply);
            }
        }
    }, [_totalSupply, id]);

    useEffect(() => {
        if (mintedToken) {
            setActiveAnimation(mintedToken);
        }
    }, [mintedToken, setActiveAnimation]);

    let [totalPrice, setTotalPrice] = useState<string | null>(null);
    const [hovered, setHovered] = useState<number | null>(null);
    const [showInfo, setShowInfo] = useState(false);
    const [showVideo, setShowVideo] = useState(true);

    useEffect(() => {
        if (!video) {
            setShowVideo(false);
        } else {
            setShowVideo(true);
        }
    }, [video]);

    let version = work.version ? work.version : 1;
    let url = `/api/getHTML?contractAddress=${work.dropAddress}&tokenId=${activeAnimation}&chainId=${work.chain}&version=${version}`;


    return (<div className="flex flex-col w-full min-h-screen h-full max-h-screen bg-zinc-950">
        {!fullscreen && !isMobile && <div className="fixed bottom-8 left-40 text-sm flex">
            <Tooltip.Provider
                disableHoverableContent={true}
                delayDuration={200}>
                <Tooltip.Root
                >
                    <Tooltip.Trigger asChild>

                        <div
                            onClick={() => setShowVideo(true)}
                            className={(!video ? "opacity-40 " : "") + "flex flex-row mr-5 cursor-pointer bg-zinc-900 rounded-xl p-2"}>
                            <VideoIcon className={(showVideo ? " stroke-green-200 " : " opacity-50 ") + "w-3 h-3 my-auto mr-2"} /> <span className={(showVideo ? " text-green-200 " : " text-zinc-400 ") + "my-auto"}>video</span>
                        </div>
                    </Tooltip.Trigger >
                    <Tooltip.Portal
                    >
                        <Tooltip.Content
                            style={{ zIndex: 100000000000, fontSize: 12 }}
                            side={"top"} className="pointer-events-none  bg-zinc-900 px-2 py-1 text-white rounded-lg w-64 " sideOffset={5}>
                            {video && "click to view the rendered video version."}
                            <div className="my-auto  italic">
                                {video ? "best for computers with weak GPU/CPU" : "video not available"}
                            </div>
                            < Tooltip.Arrow fill="white" className="TooltipArrow" />
                        </Tooltip.Content>
                    </Tooltip.Portal>
                </Tooltip.Root>
            </Tooltip.Provider>
            <Tooltip.Provider
                disableHoverableContent={true}
                delayDuration={200}>
                <Tooltip.Root
                >
                    <Tooltip.Trigger asChild>

                        <div
                            onClick={() => setShowVideo(false)}
                            className="flex flex-row cursor-pointer bg-zinc-900 p-2 rounded-xl">
                            <BoxIcon className={(showVideo ? "opacity-50 " : " stroke-green-200 ") + "w-3 my-auto h-3 mr-2"} /> <span className={(!showVideo ? " text-green-200 " : " text-zinc-400 ") + "my-auto"}>realtime</span>
                        </div>

                    </Tooltip.Trigger >
                    <Tooltip.Portal
                    >
                        <Tooltip.Content
                            style={{ zIndex: 100000000000, fontSize: 12 }}
                            side={"top"} className="pointer-events-none  w-64 bg-zinc-900 px-2 py-1 text-white rounded-lg " sideOffset={5}>
                            <div>
                                click to view the realtime version of piece, with full resolution & infinite duration.
                            </div>
                            <div className="mt-2 italic">
                                requires a strong GPU/CPU
                            </div>
                            < Tooltip.Arrow fill="white" className="TooltipArrow" />
                        </Tooltip.Content>
                    </Tooltip.Portal>
                </Tooltip.Root>
            </Tooltip.Provider>
        </div>}
        {
            totalPrice && isMobile &&
            <div
                onClick={() => setTotalPrice(null)}
                style={{ backgroundColor: "#0000008f", backdropFilter: "blur(8px)" }}
                className="w-full h-full bg-black absolute top-0 left-0 z-20" />
        }
        <div className="absolute top-5 right-5">
            {account && account.address && !fullscreen && <ConnectButton accountStatus="avatar" showBalance={false} />}
        </div>
        {!fullscreen && <ArrowLeftIcon onClick={() => close()} className={(isMobile ? "bottom-3" : "bottom-8") + " w-8 h-8 cursor-pointer absolute left-5"} />}
        <div className="absolute z-30 top-5 left-5 cursor-pointer">

            {fullscreen ? <ExitFullScreenIcon className="w-8 h-8" onClick={() => setFullScreen(false)} /> :
                <EnterFullScreenIcon className="w-8 h-8" onClick={() => setFullScreen(true)} />}
        </div>
        <div className="w-full flex m-auto">
            {showVideo && video !== null && video !== "" ?
                <video
                    ref={videoRef}
                    controls

                    src={video}
                    style={{
                        transform: fullscreen ? undefined : "translate(0px, -50px)",
                        boxShadow: fullscreen ? "" : "rgba(0, 0, 0, 0.35) 0px 5px 15px",
                        width: fullscreen ? "100vw" : isMobile ? "90vw" : "106vh", height: fullscreen ? "100vh" : isMobile ? "60vh" : "80vh"
                    }}
                    className={(fullscreen ? "" : "border-zinc-800 rounded-md border ") + "w-full mx-auto transition-all duration-300 ease-in-out"}
                /> :
                <iframe
                    ref={ref}
                    style={{
                        transform: fullscreen ? undefined : "translate(0px, -50px)",
                        boxShadow: fullscreen ? "" : "rgba(0, 0, 0, 0.35) 0px 5px 15px",
                        width: fullscreen ? "100vw" : isMobile ? "90vw" : "106vh", height: fullscreen ? "100vh" : isMobile ? "60vh" : "80vh"
                    }}
                    src={url} className={(fullscreen ? "" : "border-zinc-800 rounded-md border ") + "w-full mx-auto transition-all duration-300 ease-in-out"} />}
        </div>
        {/*
        */}

        {showInfo &&
            !isClientMobile && !fullscreen && parameters &&
            <Tooltip.Provider
                disableHoverableContent={true}
                delayDuration={200}>
                <Tooltip.Root
                >
                    <Tooltip.Trigger asChild>


                        <div className="left-10 bottom-0 top-0 my-auto table w-44 py-1 absolute  content-start">
                            <div className="flex flex-wrap">
                                {Object.keys(parameters).map(
                                    (name) => <div key={name} className="flex flex-col text-white text-xs m-1 text-center">
                                        <div>
                                            {parameters[name]}
                                        </div>
                                        <div className="text-zinc-500">
                                            {name}
                                        </div>
                                    </div>)}
                            </div>
                        </div>
                    </Tooltip.Trigger >
                    <Tooltip.Portal
                    >
                        <Tooltip.Content
                            style={{ zIndex: 100000000000, fontSize: 12 }}
                            side={"top"} className="bg-zinc-900 px-2 py-1 text-white rounded-lg w-64 " sideOffset={5}>
                            Randomized synthesis parameters for this piece (immutable & generated onchain)
                            < Tooltip.Arrow fill="white" className="TooltipArrow" />
                        </Tooltip.Content>
                    </Tooltip.Portal>
                </Tooltip.Root>
            </Tooltip.Provider>
        }


        {/* activeAnimation ? <WorkEditor tokenId={activeAnimation} contractAddress={work.dropAddress} /> : ''*/}
        <div
            style={{
                //overflow: "hidden",
                width: isMobile ? "70vw" : fullscreen ? ((showInfo || opened) ? 500 : "") : showInfo ? 400 : 500,
                borderRadius: 20,
                boxShadow: "rgba(0, 0, 0, 0.35) 0px 5px 15px",
                background: (fullscreen && opened) ? "#000000bd" : (fullscreen || opened || showInfo) ? "#00000074" : undefined,
                backdropFilter: fullscreen || opened || showInfo ? "blur(8px)" : "",
                border: (showInfo || opened) ? "1px solid #ffffff3f" : "",
                zIndex: 10
            }}
            className={(isMobile ? "left-3 bottom-16 " : fullscreen ? "right-10 bottom-8 " : "left-0 right-0 mx-auto bottom-8 ") + (opened ? (_totalSupply > 20 ? "h-64 pr-5" : "h-36 pr-5") : showInfo ? "h-44 pr-5 " : "h-10") + " fixed  bg-zinc-900 pl-10 flex text-xs transition-all duration-300 ease-in-out "}>
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
                    {!isMobile && "each minted token, is a unique composition"}
                </div>
            </div> : showInfo ? <div className="flex my-auto pr-5 flex-col">
                <div className="flex flex-1">
                    <Cross2Icon onClick={() => setShowInfo(false)} className="absolute top-5 right-5 w-5 h-5 cursor-pointer" />
                    <div>
                        {work.description}
                    </div>
                    <div className="text-zinc-400 ml-5 mt-auto">
                        created with <span className="text-white">zen+</span>. all sounds and visuals stored directly onchain.

                    </div>
                </div>
                <div className="flex mt-2">
                    <a className="text-zinc-300 underline" href={`https://explorer.zora.energy/address/${work.dropAddress}`}>contract</a><ArrowTopRightIcon className="w-3 h-3 ml-2" />
                    <a className="ml-5 text-zinc-300 underline" href={`https://zora.co/collect/zora:${work.dropAddress}/${activeAnimation}`}>zora</a><ArrowTopRightIcon className="w-3 h-3 ml-2" />
                    <div className="ml-auto text-zinc-300">{trunc(work.dropAddress)}</div><CopyIcon
                        onClick={() => {
                            navigator.clipboard.writeText(work.dropAddress);
                            setCopied(true);
                        }}
                        className={(copied ? "text-teal-300 " : "text-zinc-300 ") + "transition-colors w-4 h-4 ml-2 cursor-pointer"} />
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


                {!isMobile && !fullscreen && <div
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

                    <Tooltip.Provider
                        disableHoverableContent={true}
                        delayDuration={200}>
                        <Tooltip.Root
                        >
                            <Tooltip.Trigger asChild>

                                <div
                                    className="my-auto w-32 pl-4 flex">
                                    <DashboardIcon className="w-4 h-4 my-auto mr-2" />
                                    <div>Token #{activeAnimation}</div>
                                    <CaretSortIcon className="ml-auto my-auto mr-4" />
                                </div>
                            </Tooltip.Trigger >
                            <Tooltip.Portal
                            >
                                <Tooltip.Content
                                    style={{ zIndex: 100000000000, fontSize: 10 }}
                                    side={"top"} className="pointer-events-none  mb-4 bg-zinc-100 px-2 py-1 text-black rounded-lg " sideOffset={5}>
                                    view all minted variations of this piece
                                    < Tooltip.Arrow fill="white" className="TooltipArrow" style={{ transform: "translate(0px,-16px)" }} />
                                </Tooltip.Content>
                            </Tooltip.Portal>
                        </Tooltip.Root>
                    </Tooltip.Provider>
                </div>
            </>}
        </div>
        {
            !fullscreen && <div className={isMobile ? ((totalPrice ? "right-0 left-0 w-64 bottom-0 top-0 m-auto " : "right-0 w-32 ") + (isMobile && (!account || !account.address) ? " -top-5 w-44" : " bottom-14 ") + " mx-auto flex flex-col fixed z-30") : "mx-auto fixed bottom-0 right-2 flex flex-col  z-30 w-64"}>
                <MintButton
                    isMobile={isMobile}
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
                    totalPrice={totalPrice} setTotalPrice={setTotalPrice}
                    hide={false} />
            </div>
        }
        {
            isMobile && video && <div className="bottom-5 w-96 text-xs italic text-zinc-300 fixed mx-auto left-14 right-0">
                To view realtime version, please visit on Chrome/Arc desktop
            </div>
        }
    </div >);
};

export default WorkPlayer;

export const trunc = (x: string) => x.slice(0, 5) + '...' + x.slice(x.length - 4);
