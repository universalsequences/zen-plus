"use client";
import Skeleton from "./files/Skeleton";
import Files from "@/components/files/Files";
import { File } from "@/lib/files/types";
import { NavOption, useNav } from "@/contexts/NavContext";
import { Landing } from "./landing/Landing";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import React, { useState, useEffect } from "react";
import PatchComponent from "@/components/PatchComponent";
import { MessageProvider } from "@/contexts/MessageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { NavProvider } from "@/contexts/NavContext";
import { TilesProvider } from "@/contexts/TilesContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { useStorage } from "@/contexts/StorageContext";
import { PatchesProvider } from "@/contexts/PatchesContext";
import { SelectionProvider } from "@/contexts/SelectionContext";
import PatchesComponent from "@/components/PatchesComponent";
import { Theme } from "@radix-ui/themes";
import {
  Patch,
  IOlet,
  MessageNode,
  IOConnection,
  ObjectNode,
  Coordinate,
} from "@/lib/nodes/types";
import { PatchImpl } from "@/lib/nodes/Patch";
import "@/styles/radix.scss";
import "@rainbow-me/rainbowkit/styles.css";

import {
  getDefaultWallets,
  RainbowKitProvider,
  darkTheme,
} from "@rainbow-me/rainbowkit";
import { configureChains, createConfig, WagmiConfig } from "wagmi";
import {
  goerli,
  //zoraTestnet
} from "wagmi/chains";
import { alchemyProvider } from "wagmi/providers/alchemy";
import { infuraProvider } from "wagmi/providers/infura";
import { publicProvider } from "wagmi/providers/public";
import { WorkerProvider } from "@/contexts/WorkerContext";

const { chains, publicClient } = configureChains(
  [goerli],
  [
    infuraProvider({ apiKey: process.env.NEXT_PUBLIC_INFURA_ID as string }),
    publicProvider(),
  ],
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
  projectId?: string;
}

export default function App(props: Props) {
  let [basePatch, setBasePatch] = useState<Patch | null>(null);
  let [fileToOpen, setFileToOpen] = useState<any | null>(null);
  let [fileOpened, setFileOpened] = useState<any | null>(null);
  const { fetchProject } = useStorage();
  useEffect(() => {
    setBasePatch(new PatchImpl(new AudioContext({ sampleRate: 44100 })));
  }, [setBasePatch]);

  useEffect(() => {
    if (fileToOpen) {
      setFileOpened(fileToOpen);
    }
  }, [fileToOpen, setFileOpened]);

  const { user } = useAuth();
  const { setNavOption, navOption } = useNav();

  useEffect(() => {
    // Ensure the worker is only loaded on the client side
    const worker = new Worker(new URL("../workers/core", import.meta.url));

    worker.onmessage = (event: MessageEvent) => {
      console.log("Worker result:", event.data);
    };

    worker.postMessage(42); // Send data to the worker
  }, []);

  useEffect(() => {
    if (user && props.projectId) {
      setNavOption(NavOption.Editor);
      fetchProject(props.projectId, user.email).then((file) => {
        if (file) {
          setFileToOpen(file);
        }
      });
    }
  }, [setFileToOpen, user]);

  const [fileExpanded, setFileExpanded] = useState<File | null>(null);

  if (
    navOption === NavOption.Home ||
    navOption === NavOption.Works ||
    navOption === NavOption.Docs
  ) {
    return <Landing />;
  }
  if (!basePatch) {
    return <></>;
  }
  if (navOption === NavOption.Files && user) {
    return (
      <Skeleton>
        <Files
          setPatchOpened={() => 0}
          isMini={false}
          fileOpened={fileOpened}
          setFileToOpen={setFileToOpen}
          fileExpanded={fileExpanded}
          setFileExpanded={setFileExpanded}
        />
      </Skeleton>
    );
  }

  return (
    <SettingsProvider>
      <MessageProvider>
        <SelectionProvider>
          <PatchesProvider basePatch={basePatch}>
            <TilesProvider>
              <main className="flex min-h-screen flex-col h-full w-full">
                <PatchesComponent
                  fileToOpen={fileToOpen}
                  setFileToOpen={setFileToOpen}
                />
              </main>
            </TilesProvider>
          </PatchesProvider>
        </SelectionProvider>
      </MessageProvider>
    </SettingsProvider>
  );
}
