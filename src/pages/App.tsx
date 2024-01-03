"use client"
import '@/styles/styles.scss';
import Image from 'next/image'
import React, { useState, useEffect } from 'react';
import PatchComponent from '@/components/PatchComponent';
import { MessageProvider } from '@/contexts/MessageContext';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { StorageProvider } from '@/contexts/StorageContext';
import { PatchesProvider } from '@/contexts/PatchesContext';
import { SelectionProvider } from '@/contexts/SelectionContext';
import PatchesComponent from '@/components/PatchesComponent';
import { Theme } from '@radix-ui/themes';
import { Patch, IOlet, MessageNode, IOConnection, ObjectNode, Coordinate } from '@/lib/nodes/types';
import { PatchImpl } from '@/lib/nodes/Patch';
import '@rainbow-me/rainbowkit/styles.css';
import '@/styles/radix.scss';
import {
    getDefaultWallets,
    RainbowKitProvider,
} from '@rainbow-me/rainbowkit';
import { configureChains, createConfig, WagmiConfig } from 'wagmi';
import {
    zoraTestnet,
} from 'wagmi/chains';
import { alchemyProvider } from 'wagmi/providers/alchemy';
import { infuraProvider } from 'wagmi/providers/infura';
import { publicProvider } from 'wagmi/providers/public';


const { chains, publicClient } = configureChains(
    [zoraTestnet],
    [
        infuraProvider({ apiKey: process.env.INFURA_ID as string }),
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

export default function App() {
    let [basePatch, setBasePatch] = useState<Patch | null>(null);
    useEffect(() => {
        setBasePatch(new PatchImpl());
    }, [setBasePatch]);
    if (!basePatch) {
        return <></>;
    }
    return (
        <WagmiConfig config={wagmiConfig}>
            <RainbowKitProvider chains={chains}>
                <Theme appearance="dark" >
                    <SettingsProvider>
                        <MessageProvider>
                            <StorageProvider>
                                <SelectionProvider>
                                    <PatchesProvider basePatch={basePatch}>
                                        <main className="flex min-h-screen flex-col h-full w-full">
                                            <PatchesComponent />
                                        </main>
                                    </PatchesProvider>
                                </SelectionProvider>
                            </StorageProvider>
                        </MessageProvider>
                    </SettingsProvider>
                </Theme>
            </RainbowKitProvider>
        </WagmiConfig>
    )
}
