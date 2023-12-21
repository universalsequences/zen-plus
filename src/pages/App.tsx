"use client"
import '@/styles/styles.scss';
import Image from 'next/image'
import React, { useState, useEffect } from 'react';
import PatchComponent from '@/components/PatchComponent';
import { MessageProvider } from '@/contexts/MessageContext';
import { StorageProvider } from '@/contexts/StorageContext';
import { PatchesProvider } from '@/contexts/PatchesContext';
import { SelectionProvider } from '@/contexts/SelectionContext';
import PatchesComponent from '@/components/PatchesComponent';
import { Theme } from '@radix-ui/themes';
import { Patch, IOlet, MessageNode, IOConnection, ObjectNode, Coordinate } from '@/lib/nodes/types';
import { PatchImpl } from '@/lib/nodes/Patch';


export default function App() {
    let [basePatch, setBasePatch] = useState<Patch | null>(null);
    useEffect(() => {
        setBasePatch(new PatchImpl());
    }, [setBasePatch]);
    if (!basePatch) {
        return <></>;
    }
    return (
        <Theme appearance="dark" >
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
        </Theme>
    )
}
