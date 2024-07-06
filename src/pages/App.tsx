"use client";
import Home from "@/components/Home";
import "@/styles/styles.scss";
import "./globals.css";
import Image from "next/image";
import React, { useState, useEffect } from "react";
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
import { mainnet, zora, zoraSepolia } from "wagmi/chains";
import { alchemyProvider } from "wagmi/providers/alchemy";
import { infuraProvider } from "wagmi/providers/infura";
import { publicProvider } from "wagmi/providers/public";

const { chains, publicClient } = configureChains(
  [zoraSepolia, zora, mainnet],
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
  return (
    <Theme appearance="dark">
      <WagmiConfig config={wagmiConfig}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: "black",
            accentColorForeground: "white",
            borderRadius: "large",
          })}
          chains={chains}
        >
      
          <AuthProvider>
            <StorageProvider>
              <NavProvider>
                <Home projectId={props.projectId} />
              </NavProvider>
            </StorageProvider>
          </AuthProvider>
        </RainbowKitProvider>
      </WagmiConfig>
    </Theme>
  );
}
