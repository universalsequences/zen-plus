import React, { useEffect, useCallback, useState } from 'react';
import MintSound from './MintSound';
import { usePatches } from '@/contexts/PatchesContext';
import Attributes from './Attributes';
import { SubPatch, Patch, ObjectNode } from '@/lib/nodes/types';
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
    const { patches, zenCode } = usePatches();
    const account = useAccount();
    const [minting, setMinting] = useState(false);
    const [dropAddress, setDropAddress] = useState<string | null>(null);

    const [parameters, setParameters] = useState<Parameters | null>(null);

    useEffect(() => {
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
            if (param.attributes["onchain"] && param.attributes["max"] !== undefined && param.attributes["min"] !== undefined) {
                names.push(param.arguments[0] as string);
                maxValues.push(param.attributes["max"] as number);
                minValues.push(param.attributes["min"] as number);
            }
        }
        setParameters({
            parameterNames: names,
            maxValues,
            minValues
        });

    }, [patches, setParameters, minting]);


    const inner = React.useMemo(() => {
        return (
            <div>
                {minting && parameters && zenCode ? <MintSound parameterNames={parameters.parameterNames} minValues={parameters.minValues} maxValues={parameters.maxValues} setDropAddress={setDropAddress} dsp={zenCode} /> : ''}
                {!account ? <div
                    className="absolute top-2 right-2 px-2 py-1  cursor-pointer z-30 ">
                    <ConnectButton />
                </div>
                    :
                    minting ?
                        <div
                            onClick={() => setMinting(true)}
                            className="absolute top-2 right-2 bg-white px-2 py-1 rounded-full text-black cursor-pointer z-30 active:bg-red-500">
                            deploying onchain</div> :
                        <button
                            onClick={() => setMinting(true)}
                            className="absolute top-2 right-2 bg-white px-2 py-1 rounded-full text-black cursor-pointer z-30 active:bg-red-500">
                            Mint Onchain
                        </button>}
                <div
                    style={{ maxHeight: 500, minHeight: 100 }}
                    className="w-full h-full text-xs overflow-scroll relative">
                    <pre className="p-1">
                        {zenCode}
                    </pre>
                </div>
            </div>
        );
    }, [zenCode, minting, parameters]);

    let [opened, setOpened] = useState(false);

    return <div
        style={{ zIndex: 100000000 }}
        onMouseDown={(e: any) => e.stopPropagation()}
        onClick={(e: any) => e.stopPropagation()}
        className={
            "bg-toolbar fixed top-40 right-0 flex sidebar " + (opened ? "opened-sidebar2 " : "")}
    >
        <div
            onClick={() => {
                setOpened(!opened);
            }}
            style={{
                top: "-1px",
                left: "-40px",
                borderTop: "1px solid white", borderLeft: "1px solid white", borderBottom: "1px solid white"
            }}

            className="cursor-pointer absolute p-2 w-10 h-10 bg-toolbar">
            <Share1Icon
                className="w-6 h-6 " />
        </div>
        {dropAddress ? <div className="h-32">Deployed on <a className="underline text-blue-500" href={"https://testnet.zora.co/collect/zgor:" + dropAddress}>zora</a> </div> : opened ? inner : ""}
    </div >
}
export default Sidebar;
