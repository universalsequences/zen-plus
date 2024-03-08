import React, { useEffect, useCallback, useState } from 'react';
import { useBalance } from 'wagmi';
import EditionSize from './EditionSize';
import { useNetwork, useSwitchNetwork } from 'wagmi';
import { DividerHorizontalIcon, DividerVerticalIcon } from '@radix-ui/react-icons';
import { ethers } from 'ethers';
import { usePublicClient, useWaitForTransaction } from 'wagmi'
import { parseEther } from 'viem'
import { abi } from '@/lib/abi/erc721-drops';
import { ConnectButton, lightTheme } from '@rainbow-me/rainbowkit';
import { Step } from './enum';
import { usePrepareContractWrite, useContractWrite, useWalletClient, useAccount } from 'wagmi'
import { useInterval } from '@/hooks/useInterval';
import { calculateTotalPrice, ZORA_FEE } from '@/lib/purchase';
import { WorkOption } from './Works';

interface Props {
    work: WorkOption;
    mintedToken: number | null;
    setMintedToken: (x: number) => void;
    contractAddress: `0x${string}`;
    hide?: boolean;
    balanceOf: number | null;
    step: Step,
    setStep: (x: Step) => void,
    totalSupply: number | null;
    tokenPrice: string;
    chainId: number;
}

async function getBalance(provider: any, address: `0x${string}`) {
    console.log('getting balance = ', address);
    const balanceWei = await provider.getBalance(address);
    console.log('balance wei=', balanceWei);
    return balanceWei / 1000000000;
}

const MintBlock = (props: Props) => {

    let [minimized, setMinimized] = useState(false);
    let work = props.work;
    const TOKEN_PRICE = props.tokenPrice;
    const publicClient = usePublicClient();

    const { mintedToken, setMintedToken } = props;

    const { switchNetwork } = useSwitchNetwork();
    const network = useNetwork();
    let [totalPrice, setTotalPrice] = useState<string | null>(null);
    let { setStep, step } = props;
    let [seed, setSeed] = useState(1);
    let [editionSize, setEditionSize] = useState(1);
    //let [balance, setBalance] = useState<number | null>();

    let [comment, setComment] = useState<string>("");

    const { data: signer } = useWalletClient();
    const address = useAccount();

    const { data: balance } = useBalance(address);
    console.log('balance=', balance);

    let wrongNetwork = false;
    console.log('network = ', network);
    if (network && network.chain && network.chain.id !== props.chainId && address) {
        wrongNetwork = true;
    }


    /*
    useEffect(() => {
        if (address && address.address && publicClient) {
            getBalance(publicClient, address.address).then(
                setBalance);
        }
    }, [address, setBalance, publicClient]);
    */

    const totalPriceInEth = calculateTotalPrice(editionSize, TOKEN_PRICE);
    const { data, isLoading, isSuccess, write } = useContractWrite({
        address: props.contractAddress,
        abi: abi,
        functionName: comment !== "" ? "purchaseWithComment" : "purchase",
        args: comment !== "" ? [editionSize, comment] : [editionSize],
        value: parseEther(totalPriceInEth.toString())
    })

    const { data: transactionData, isError: transactionError, isLoading: transactionLoading } = useWaitForTransaction(
        {
            hash: data ? data.hash : undefined
        });

    useEffect(() => {
        if (transactionLoading) {
            setStep(Step.Waiting);
        }
    }, [transactionLoading, setStep, data]);

    useEffect(() => {
        if (data && !transactionError && !transactionLoading) {
            console.log("data=", transactionData);
            setStep(Step.Confirmed);
            fetchMintedTokenId(publicClient, data.hash, props.contractAddress, comment !== "").then(
                x => {
                    console.log('minted token=', mintedToken);
                    if (x !== null) {
                        setMintedToken(x + editionSize);
                    }
                });
        }
    }, [data, publicClient, comment, editionSize, transactionLoading, transactionError, setStep, data, setMintedToken]);

    useEffect(() => {
        if (isLoading) {
            setStep(Step.OpenWallet);
        }
    }, [isLoading, setStep]);

    const [checked, setChecked] = useState(false);
    const { balanceOf, hide } = props;

    const { accessAllowed, allowListEntry } = { accessAllowed: false, allowListEntry: null };
    const price = parseFloat(TOKEN_PRICE);

    useEffect(() => {
        setChecked(true);
    }, []);

    const onTick = useCallback(() => {
        if (step === Step.Waiting) {
            setSeed(seed + 1);
        }
    }, [seed, setSeed, step]);

    useInterval(onTick, 80);

    let showTotalPrice = useCallback(() => {
        setTotalPrice(calculateTotalPrice(editionSize, price.toString()));
    }, [editionSize, setTotalPrice, price, accessAllowed]);

    useEffect(() => {
        if (totalPrice !== null) {
            setTotalPrice(calculateTotalPrice(editionSize, price.toString()));
        }
    }, [editionSize, totalPrice, setTotalPrice, price, accessAllowed]);

    let mint = useCallback(async () => {
        // how can we purchase?
        if (write) {
            setStep(Step.OpenWallet);
            try {
                await write();
                setStep(Step.OpenWallet);
            } catch (e) {
                setStep(Step.None);
            }
        }
    }, [editionSize, write, signer, setStep, totalPrice, allowListEntry, price, accessAllowed]);

    const _hide = useCallback(() => {
        setTotalPrice(null);
    }, [setTotalPrice]);

    /*
    useEffect(() => {
        window.addEventListener("click", _hide);
        return () => window.removeEventListener("click", _hide);
    }, [setTotalPrice]);
    */

    let rectangles: JSX.Element[] = [];
    let binary = seed;
    let quad = seed;
    let delay = 0;
    for (let i = 0; i < 32; i++) {
        let mod = binary % 2;
        let qmod = binary % 4;

        rectangles.push(
            <rect x={i * 3} y={2} width={(i % 4) * 4 * qmod + 1} height={8} fill={"#0000008f"} className={"animated"} style={{ animationDelay: delay + 'ms' }} />);
        binary /= 2;
        quad /= 4;
        delay += 250;
    }

    binary = Math.floor(seed / 2);
    quad = Math.floor(seed / 2);

    const [isCustom, setIsCustom] = useState(true);
    let className = "p-2  text-white flex  flex-col mint-button-container select-none text-center w-50 text-center   z-10 bg-zinc-900 transition-all ";
    if (hide && totalPrice === null) {
        className += " disappear";
    }
    className += " showing-total-price";
    if (totalPrice !== null) {
        className += " checking-out";
    }

    if (props.totalSupply && props.totalSupply >= 1024) {
        return (
            <div className={className + ' w-full py-4 mt-4'}>
                Sold Out
            </div>
        );
    }
    if (Step.Confirmed === step) {
        return (
            <div style={{ backgroundColor: "#0b0a0a66" }} className={className + ' w-full py-4 my-4'}>
                You successfully minted {work.name} #{mintedToken}
                <div
                    onClick={() => setStep(Step.None)}
                    className="bg-white px-4 py-1 text-black rounded-full cursor-pointer w-32 text-sm mx-auto my-2">
                    Mint Another?
                </div>

            </div>
        );
    }

    return (
        <>
            <div
                onClick={(e: any) => e.stopPropagation()}
                style={{
                    borderTopLeftRadius: "30px",
                    borderTopRightRadius: "10px",
                }}
                className={className + ' mt-4 relative bg-zinc-900 pt-5 transition-all'}>
                {/*<div className={(minimized ? "top-3  " : " top-3 ") + "cursor-pointer absolute right-2 px-1 rounded-full border border-zinc-400 bg-zinc-900 transition-all duration-300 ease-in-out"}>
                    {minimized ?
                        <DividerVerticalIcon color="white" onClick={() => setMinimized(false)} className="w-3 h-3" /> :
                        <DividerHorizontalIcon
                            color="white"
                            onClick={() => setMinimized(true)}
                            className="w-3 h-3" />}</div>*/}
                {minimized ? <div className="h-4 w-16 " /> : <>
                    <div className={(step !== Step.None ? "opacity-30 pointer-events-none " : "") + " flex flex-col"} >
                        {!address.address ? <div className="w-44 h-2" /> : <div className="flex py-2 mb-1 text-sm md:text-xl text-zinc-200">
                            {totalPrice != null && <EditionSize editionSize={editionSize} setEditionSize={setEditionSize} maxEditionSize={props.totalSupply as number} />}
                        </div>}
                        {totalPrice !== null && <textarea placeholder="add a comment" className="rounded-lg p-3 outline-none text-white bg-zinc-700" value={comment} onChange={e => setComment(e.target.value)} />}
                        {totalPrice !== null && <>
                            <div className="flex border-b border-slate-900 py-1 mb-1 text-sm mt-5">
                                <div className="">{editionSize}x <span className="text-zinc-400">{editionSize === 1 ? "NFT" : "NFTs"}</span> {accessAllowed ? " (allowlist)" : ""}</div>
                                <div className="ml-auto">{round(editionSize * price)} ETH</div>
                            </div>
                            <div className="flex border-b border-slate-900 py-1 mb-1 text-sm">
                                <div>
                                    Zora Mint Fee
                                </div>
                                <div className="ml-auto">
                                    {round(editionSize * (ZORA_FEE))} ETH
                                </div>
                            </div>
                            <div className="flex py-1 mb-1 text-sm">
                                <div>
                                    Total
                                </div>
                                <div className="ml-auto">
                                    {round(parseFloat(totalPrice))} ETH
                                </div>
                            </div>
                        </>}
                    </div>
                    {checked && address.address === undefined ?
                        <div className="mx-auto items-start">
                            <ConnectButton /></div> : wrongNetwork ? <div
                                onClick={() => switchNetwork ? switchNetwork(props.chainId) : 0}
                                className="py-1 bg-light-100 text-zinc-200 cursor-pointer rounded-full active:scale-105 transition-all mx-5 px-5">Switch to Zora</div> : <div onClick={balance && totalPrice && parseFloat(balance.formatted) < parseFloat(totalPrice) ? () => 0 : totalPrice == null ? showTotalPrice : mint} className={(step !== Step.None ? "bg-zinc-100 text-zinc-700 " : " bg-zinc-100 text-zinc-700") + " mint-button hover:scale-105 transition-all select-none text-center text-center  md:mb-5  mb-1 rounded-full px-3 py-1 text-zinc-200 bg-light-100 cursor-pointer object-start w-40 mx-auto  w-full items-start z-10 left-0 right-0 relative "}


                                    style={{ minWidth: 170 + 'px' }}
                                >
                            {/*<div className="blur-2xl opacity-20 bg-white w-32 h-32 absolute -top-11 -left-4 rounded-full" />*/}
                            {balance && totalPrice && parseFloat(balance.formatted) < parseFloat(totalPrice) ? <a href="https://bridge.zora.energy">Bridge to Zora ↗</a> :
                                step === Step.OpenWallet ? "Confirm in Wallet" :
                                    step === Step.Waiting ? <div className="flex w-44 mx-auto hover:scale-105 transition-all"><span className="mr-2">Processing</span> <svg className="mt-2" width={150} height="15">{rectangles}</svg></div> :
                                        step === Step.None ? "Mint" : 'Completed'
                            }

                        </div>}
                    <div className="flex mx-auto">
                        <div className="w-1 h-1 rounded-full bg-white mt-3 mx-2" />
                        {
                            totalPrice === null && <div className="flex text-xs mt-1.5 ">
                                {props.totalSupply} minted
                            </div>
                        }
                    </div>
                </>}
            </div >
        </>
    );
}

const round = (price: number) => {
    return Math.round(price * 1000000) / 1000000;
};

export async function fetchMintedTokenId(provider: any, transactionHash: string, contractAddress: string, isComment: boolean): Promise<number | null> {
    const ABI = [
        'event Sale(address indexed to, uint256 indexed quantity, uint256 indexed pricePerToken, uint256 firstPurchasedTokenId)'
    ];

    console.log("provider =", provider);
    const receipt = await provider.getTransactionReceipt({ hash: transactionHash });

    console.log('receipt=', receipt);

    // Check if there are logs and the logs are from the expected contract
    if (receipt && receipt.logs && receipt.logs.length > 0) {
        let num = isComment ? 2 : 1;
        let token = parseInt(receipt.logs[receipt.logs.length - num].data, 16);

        console.log("token=", token);
        return token;
    }

    return null;
}



export default MintBlock;

