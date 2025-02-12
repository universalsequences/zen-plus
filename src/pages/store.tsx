"use client";
import "@/styles/styles.scss";
import "./globals.css";
import React, { useState, useEffect } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { StorageProvider } from "@/contexts/StorageContext";
import { Theme } from "@radix-ui/themes";
import "@/styles/radix.scss";
import "@rainbow-me/rainbowkit/styles.css";

import { getDefaultWallets, RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { configureChains, createConfig, WagmiConfig } from "wagmi";
import { mainnet, zora, zoraSepolia, baseSepolia } from "wagmi/chains";
import { infuraProvider } from "wagmi/providers/infura";
import { publicProvider } from "wagmi/providers/public";
import { AudioContextProvider } from "@/contexts/AudioContextContext";

const { chains, publicClient } = configureChains(
  [zoraSepolia, zora, mainnet, baseSepolia],
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
          <AudioContextProvider>
            <AuthProvider>
              <StorageProvider>{children}</StorageProvider>
            </AuthProvider>
          </AudioContextProvider>
        </RainbowKitProvider>
      </WagmiConfig>
    </Theme>
  );
}
