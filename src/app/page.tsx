"use client"
import Image from 'next/image'
import PatchComponent from '@/components/PatchComponent';
import { PatchProvider } from '@/contexts/PatchContext';
import { PositionProvider } from '@/contexts/PositionContext';
import { Theme } from '@radix-ui/themes';


export default function Home() {
    return (
        <Theme appearance="dark" >
            <PositionProvider>
                <PatchProvider>
                    <main className="flex min-h-screen flex-col">
                        <PatchComponent />
                    </main>
                </PatchProvider>
            </PositionProvider>
        </Theme>
    )
}
