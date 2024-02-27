'use client';
import dynamic from 'next/dynamic'
import React from 'react';
import { MessageProvider } from '@/contexts/MessageContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { NavProvider } from '@/contexts/NavContext';;
import { TilesProvider } from '@/contexts/TilesContext';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { StorageProvider } from '@/contexts/StorageContext';
import { PatchesProvider } from '@/contexts/PatchesContext';
import { SelectionProvider } from '@/contexts/SelectionContext';
import { Theme } from '@radix-ui/themes';
import { db } from '@/lib/db/firebase';
import { documentId, addDoc, doc, getDoc, getFirestore, updateDoc, collection, query, orderBy, where, getDocs } from "firebase/firestore";
import { WorkOption } from '@/components/works/Works';
const Works = dynamic(() => import('../components/works/Works'), { ssr: false })
import '@/styles/radix.scss';
import '@rainbow-me/rainbowkit/styles.css';
import '@/styles/styles.scss';
import './globals.css';
import {
    getDefaultWallets,
    RainbowKitProvider,
    darkTheme
} from '@rainbow-me/rainbowkit';
import { configureChains, createConfig, WagmiConfig } from 'wagmi';
import {
    mainnet,
    goerli,
    zora,
    zoraTestnet,
} from 'wagmi/chains';
import { alchemyProvider } from 'wagmi/providers/alchemy';
import { infuraProvider } from 'wagmi/providers/infura';
import { publicProvider } from 'wagmi/providers/public';


const { chains, publicClient } = configureChains(
    [mainnet, zoraTestnet, zora, goerli],
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



const CollectionPage: React.FC<{ collection: WorkOption }> = ({ collection }) => {
    if (!collection) {
        // If the collection does not exist, you can redirect, or return null
        // Redirecting in getServerSideProps is a better approach, though.
        return null;
    }

    // Render the component for the collection
    return <Theme appearance="dark" >
        <WagmiConfig config={wagmiConfig}>
            <RainbowKitProvider
                theme={darkTheme({
                    accentColor: 'black',
                    accentColorForeground: 'white',
                    borderRadius: 'large',
                })}
                chains={chains}>
                <AuthProvider>
                    <StorageProvider>
                        <NavProvider>
                            <Works setShowNav={() => 0} defaultWork={collection} />
                        </NavProvider>
                    </StorageProvider>
                </AuthProvider>
            </RainbowKitProvider>
        </WagmiConfig>
    </Theme>;

}

const fetchCollection = (name: string) => {
    return new Promise((resolve) => {
        const collectionRef = collection(db, 'drops');
        const q = query(collectionRef, where("name", "==", name));
        try {
            getDocs(q).then(
                querySnapshot => {
                    const documents: WorkOption[] = [];
                    querySnapshot.forEach(doc => {
                        let workOption = {
                            ...doc.data(),
                            createdAt: 0 as any
                        };
                        resolve(workOption as WorkOption);
                    });
                });
        } catch (e) {
        }
    }
    );
}


export async function getServerSideProps(context: any) {
    const { params } = context;
    const { name_of_collection } = params;

    // Fetch your collection from the database
    const collection = await fetchCollection(name_of_collection);
    // If the collection does not exist, return an empty props (or handle as needed)
    if (!collection) {
        return {
            props: {}, // You could also redirect to the landing page from here
            redirect: {
                destination: '/',
                permanent: false,
            },
        };
    }

    // If the collection exists, pass it as props to the page component
    return {
        props: { collection },
    };
}

export default CollectionPage;
