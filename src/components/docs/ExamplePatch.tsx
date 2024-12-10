import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { StepsProvider } from "@/contexts/StepsContext";
import { WindowsProvider } from "@/contexts/WindowsContext";
import React, { useState, useRef, useEffect } from "react";
import { WorkerProvider } from "@/contexts/WorkerContext";
import PatchComponent from "@/components/PatchComponent";
import { MessageProvider } from "@/contexts/MessageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { NavProvider } from "@/contexts/NavContext";
import { TilesProvider } from "@/contexts/TilesContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { StorageProvider } from "@/contexts/StorageContext";

import { PatchesProvider } from "@/contexts/PatchesContext";
import { SelectionProvider } from "@/contexts/SelectionContext";
import PatchesComponent from "@/components/PatchesComponent";
import { Theme } from "@radix-ui/themes";
import { Patch, IOlet, MessageNode, IOConnection, ObjectNode, Coordinate } from "@/lib/nodes/types";
import { PatchImpl } from "@/lib/nodes/Patch";

import { getDefaultWallets, RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { configureChains, createConfig, WagmiConfig } from "wagmi";
import {
  goerli,
  //zoraTestnet
} from "wagmi/chains";
import { alchemyProvider } from "wagmi/providers/alchemy";
import { infuraProvider } from "wagmi/providers/infura";
import { publicProvider } from "wagmi/providers/public";
import Toolbar from "../Toolbar";
import { File } from "@/lib/files/types";
import { Timestamp } from "firebase/firestore";

const { chains, publicClient } = configureChains(
  [goerli],
  [infuraProvider({ apiKey: process.env.NEXT_PUBLIC_INFURA_ID as string }), publicProvider()],
);

const { connectors } = getDefaultWallets({
  appName: "Zen+",
  projectId: "4cc51b0249dcd2b50657034d9058cf59",
  chains,
});

const wagmiConfig = createConfig({
  autoConnect: true,
  connectors,
  publicClient,
});

interface Props {
  docId?: string;
  commit?: string;
}

export default function ExamplePatch({ docId, commit }: Props) {
  const [basePatch, setBasePatch] = useState<Patch | null>(null);
  const patchRef = useRef<Patch | null>(null);

  useEffect(() => {
    const p = new PatchImpl(new AudioContext({ sampleRate: 44100 }));
    patchRef.current = p;
    setBasePatch(p);
  }, [setBasePatch]);

  const [fileToOpen, setFileToOpen] = useState<File | null>(null);

  useEffect(() => {
    if (docId && basePatch && commit) {
      const file: File = {
        id: docId,
        name: "example",
        commit,
        user: "example",
        createdAt: Timestamp.now(),
      };
      setFileToOpen(file);
    }
  }, [docId, basePatch]);

  useEffect(() => {
    return () => {
      if (patchRef.current) {
        patchRef.current.disconnectGraph();
      }
    };
  }, []);

  if (!basePatch || (!fileToOpen && docId)) {
    return <></>;
  }
  return (
    <SettingsProvider>
      <MessageProvider>
        <SelectionProvider>
          <PatchesProvider basePatch={basePatch}>
            <WindowsProvider>
              <WorkerProvider patch={basePatch}>
                <TilesProvider>
                  <StepsProvider>
                    <main className="flex w-full h-full example-patch">
                      <PatchesComponent fileToOpen={fileToOpen} setFileToOpen={(x: any) => {}} />
                    </main>
                  </StepsProvider>
                </TilesProvider>
              </WorkerProvider>
            </WindowsProvider>
          </PatchesProvider>
        </SelectionProvider>
      </MessageProvider>
    </SettingsProvider>
  );
}
