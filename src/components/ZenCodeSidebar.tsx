import React, { useEffect, useCallback, useState } from 'react';
import { parseEther } from 'viem'
import { db } from '@/lib/db/firebase';
import { documentId, addDoc, doc, getDoc, getFirestore, updateDoc, collection, query, orderBy, where, getDocs } from "firebase/firestore";
import {
    goerli,
} from 'wagmi/chains';
import { useAuth } from '@/contexts/AuthContext';
import MintSound from './MintSound';
import { usePatches } from '@/contexts/PatchesContext';
import Attributes from './Attributes';
import { SubPatch, Patch, ObjectNode } from '@/lib/nodes/types';
import { useSwitchNetwork } from 'wagmi';
import { Share1Icon } from '@radix-ui/react-icons'
import { useSelection } from '@/contexts/SelectionContext';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';

interface Parameters {
    parameterNames: string[];
    maxValues: number[];
    minValues: number[];
}

const Sidebar = () => {
    const { selectedPatch, patches, visualsCode } = usePatches();
    let zenCode = selectedPatch ? selectedPatch.zenCode : "";
    const account = useAccount();
    const [minting, setMinting] = useState(false);
    const [dropAddress, setDropAddress] = useState<string | null>(null);

    const [parameters, setParameters] = useState<Parameters | null>(null);
    const [price, setPrice] = useState("0");
    const [numEditions, setNumEditions] = useState(30);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");

    let [opened, setOpened] = useState(false);
    const { switchNetwork } = useSwitchNetwork();

    const { user } = useAuth();

    useEffect(() => {
        if (user && dropAddress && account && patches[0]) {
            // write to firebase
            let document: any = {
                ownerAddress: account.address,
                createdAt: new Date(),
                dropAddress,
                user: user.email,
                name,
                description,
                price,
                numEditions,
                patchId: patches[0].previousDocId
            };
            addDoc(collection(db, 'drops'), document).then((snap) => {
            });
        }
    }, [user, dropAddress, name, description, price, numEditions, patches]);

    useEffect(() => {
        if (opened && switchNetwork) {
            switchNetwork(goerli.id);
        }
    }, [opened, switchNetwork]);

    useEffect(() => {
        if (!opened) {
            return;
        }
        let patch = patches[0];
        if (patch) {
            while ((patch as SubPatch).parentPatch) {
                patch = (patch as SubPatch).parentPatch;
            }
        }
        let params = patch.getAllNodes().filter(x => (x as ObjectNode).name === "param");
        let names = [];
        let minValues = [];
        let maxValues = [];
        for (let param of params) {
            if (param.attributes["onchain"]) {
                names.push(param.arguments[0] as string);
                let { max, min } = param.attributes;
                maxValues.push(max === undefined ? 1 : Math.round(max as number));
                minValues.push(min === undefined ? 0 : Math.round(min as number));
            }
        }
        setParameters({
            parameterNames: names,
            maxValues,
            minValues
        });

    }, [patches, opened, setParameters, minting]);


    const inner = React.useMemo(() => {
        return (
            <div>
                {minting && parameters && visualsCode && zenCode ?
                    <MintSound numEditions={numEditions} price={parseEther(price)} name={name} description={description} visuals={visualsCode} parameterNames={parameters.parameterNames} minValues={parameters.minValues} maxValues={parameters.maxValues} setDropAddress={setDropAddress} dsp={zenCode} /> : ''}
                {!account ? <div>
                    <ConnectButton />
                </div>
                    :
                    minting ?
                        <div
                            className="bg-white px-2 py-1 rounded-full text-black cursor-pointer z-30 active:bg-red-500">
                            deploying onchain</div> :
                        <div className="flex flex-col items-start">
                            <input style={{ borderBottom: "1px solid #2d2d2d" }} value={name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)} placeholder="Name for work" className="px-2 outline-none" />
                            <input style={{ borderBottom: "1px solid #2d2d2d" }} value={description} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDescription(e.target.value)} placeholder="Desciption for work" className="px-2 outline-none" />
                            <div className="relative"><input style={{ borderBottom: "1px solid #2d2d2d" }} value={price} onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                let float = parseFloat(e.target.value)
                                if (e.target.value === "." || e.target.value === "0." || e.target.value === "") {
                                    float = 0;
                                }
                                if (!isNaN(float) && float >= 0) {
                                    setPrice(e.target.value);
                                }
                            }} placeholder="Price" className="px-2 outline-none" />
                                <div className="absolute top-1 right-5 z-30">eth</div>
                            </div>
                            <div className="relative"><input style={{ borderBottom: "1px solid #2d2d2d" }} value={numEditions} onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                let float = parseInt(e.target.value)
                                if (!isNaN(float) && float > 0) {
                                    setNumEditions(float);
                                }
                            }} placeholder="Editions" className="px-2 outline-none" />
                                <div className="absolute top-1 right-5 z-30">editions</div>
                            </div>
                            <button
                                onClick={() => {
                                    if (name !== "" && description !== "") {
                                        setMinting(true);
                                    }
                                }}
                                className=" bg-white px-2 py-1 rounded-full text-black cursor-pointer z-30 active:bg-red-500">
                                Mint Onchain
                            </button>
                        </div>
                }
                <div
                    style={{ maxHeight: 500, minHeight: 100 }}
                    className="w-full h-full text-xs overflow-scroll relative">
                    <pre className="p-1">
                        {zenCode}
                    </pre>
                </div>
            </div>
        );
    }, [zenCode, visualsCode, minting, parameters, name, description, price, numEditions]);


    return <div
        style={{ zIndex: 100000000 }}
        onMouseDown={(e: any) => e.stopPropagation()}
        onClick={(e: any) => e.stopPropagation()}
        className={
            "bg-toolbar fixed top-40 right-0 flex sidebar  " + (opened ? "opened-sidebar2 " : "")}
    >
        <div
            onClick={() => {
                setOpened(!opened);
            }}
            style={{
                top: "0px",
                left: "-40px",
            }}

            className="cursor-pointer absolute p-2 w-10 h-10 bg-toolbar sidebar-btn">
            <Share1Icon
                className="w-6 h-6 " />
        </div>
        {dropAddress ? <div className="h-32">Deployed on <a className="underline text-blue-500" href={"https://testnet.zora.co/collect/gor:" + dropAddress}>zora</a> </div> : opened ? inner : ""}
    </div >
}
export default Sidebar;
