import React, { useEffect, useCallback, useState } from 'react';
import MintSound from './MintSound';
import { usePatches } from '@/contexts/PatchesContext';
import Attributes from './Attributes';
import { ObjectNode } from '@/lib/nodes/types';
import { Share1Icon } from '@radix-ui/react-icons'
import { useSelection } from '@/contexts/SelectionContext';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';

const Sidebar = () => {
    const { zenCode } = usePatches();
    const account = useAccount();
    const [minting, setMinting] = useState(false);
    const [dropAddress, setDropAddress] = useState<string | null>(null);

    const inner = React.useMemo(() => {
        return (
            <div>
                {minting && zenCode ? <MintSound setDropAddress={setDropAddress} dsp={zenCode} /> : ''}
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
    }, [zenCode, minting]);

    let [opened, setOpened] = useState(false);

    return <div
        style={{ zIndex: 100000000 }}
        onMouseDown={(e: any) => e.stopPropagation()}
        onClick={(e: any) => e.stopPropagation()}
        className={
            "bg-toolbar fixed top-40 right-0 flex sidebar " + (opened ? "opened-sidebar" : "")}
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
