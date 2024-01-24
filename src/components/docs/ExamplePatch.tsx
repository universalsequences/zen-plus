import Image from 'next/image'
import { useAuth } from '@/contexts/AuthContext';
import React, { useState, useRef, useEffect } from 'react';
import PatchComponent from '@/components/PatchComponent';
import { MessageProvider } from '@/contexts/MessageContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { NavProvider } from '@/contexts/NavContext';;
import { TilesProvider } from '@/contexts/TilesContext';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { StorageProvider } from '@/contexts/StorageContext';
import { PatchesProvider } from '@/contexts/PatchesContext';
import { SelectionProvider } from '@/contexts/SelectionContext';
import PatchesComponent from '@/components/PatchesComponent';
import { Theme } from '@radix-ui/themes';
import { Patch, IOlet, MessageNode, IOConnection, ObjectNode, Coordinate } from '@/lib/nodes/types';
import { PatchImpl } from '@/lib/nodes/Patch';

import {
    getDefaultWallets,
    RainbowKitProvider,
    darkTheme
} from '@rainbow-me/rainbowkit';
import { configureChains, createConfig, WagmiConfig } from 'wagmi';
import {
    goerli,
    //zoraTestnet
} from 'wagmi/chains';
import { alchemyProvider } from 'wagmi/providers/alchemy';
import { infuraProvider } from 'wagmi/providers/infura';
import { publicProvider } from 'wagmi/providers/public';


const { chains, publicClient } = configureChains(
    [goerli],
    [
        infuraProvider({ apiKey: process.env.NEXT_PUBLIC_INFURA_ID as string }),
        publicProvider()
    ]
);

const { connectors } = getDefaultWallets({
    appName: 'Zen+',
    projectId: '4cc51b0249dcd2b50657034d9058cf59',
    chains
});

const wagmiConfig = createConfig({
    autoConnect: true,
    connectors,
    publicClient
})

export default function ExamplePatch() {
    let [basePatch, setBasePatch] = useState<Patch | null>(null);
    let patchRef = useRef<Patch | null>(null);
    useEffect(() => {
        let p = new PatchImpl(new AudioContext({ sampleRate: 44100 }));
        patchRef.current = p;
        setBasePatch(p);
    }, [setBasePatch]);

    useEffect(() => {
        return () => {
            if (patchRef.current) {
                patchRef.current.disconnectGraph();
            }
        };
    }, []);

    if (!basePatch) {
        return <></>;
    }
    return (
        <SettingsProvider>
            <MessageProvider>
                <StorageProvider>
                    <SelectionProvider>
                        <PatchesProvider basePatch={basePatch}>
                            <TilesProvider>
                                <main className="flex w-full h-full example-patch">
                                    <PatchesComponent />
                                </main>
                            </TilesProvider>
                        </PatchesProvider>
                    </SelectionProvider>
                </StorageProvider>
            </MessageProvider>
        </SettingsProvider>
    )
}
