import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';
import { abi } from '@/lib/abi/minter-abi';
import { MINTER_CONTRACT, DROP_CONTRACT } from '@/components/WriteOnChain';
import { usePublicClient, useContractRead } from 'wagmi'
import { OnchainSubPatch, fetchOnchainSubPatches } from '@/lib/onchain/fetch';
import { SerializedPatch } from '@/lib/nodes/types';

export interface Project {
    name: string;
    json: SerializedPatch;
}

interface IStorageContext {
    savePatch: (x: string, patch: SerializedPatch) => Promise<string>;
    saveSubPatch: (x: string, patch: SerializedPatch) => void;
    getPatches: (key: string) => Project[];
    onchainSubPatches: OnchainSubPatch[];
}

interface Props {
    children: React.ReactNode;
}

const StorageContext = createContext<IStorageContext | undefined>(undefined);

export const useStorage = (): IStorageContext => {
    const context = useContext(StorageContext);
    if (!context) throw new Error('useMessageHandler must be used within MessageProvider');
    return context;
};


export const StorageProvider: React.FC<Props> = ({ children }) => {

    const publicClient = usePublicClient();
    const { data: subpatches, isError, isLoading } = useContractRead({
        address: MINTER_CONTRACT,
        abi: abi,
        functionName: 'getPatchHeads',
        args: [true]
    })

    console.log('subpatches= ', subpatches);

    const getPatches = (key: string) => {
        let projects = JSON.parse(window.localStorage.getItem(key) || "[]")
        let _projects: Project[] = [];
        for (let name of projects) {
            let localStorageKey = `${key}.${name}`;
            let payload = window.localStorage.getItem(localStorageKey);
            try {
                if (payload) {
                    let payloadJSON: SerializedPatch = JSON.parse(payload);
                    _projects.push({
                        name: name,
                        json: payloadJSON
                    });
                }
            } catch (e) {

            }
        }
        return _projects;
    };

    const savePatch = useCallback((name: string, patchToSave: SerializedPatch): Promise<string> => {
        console.log(patchToSave);
        return new Promise(resolve => {
            fetch('/api/compress', {
                method: "POST",
                body: JSON.stringify(patchToSave)
            }).then(
                async r => {
                    let payload = await r.json();
                    /*
                    let storageName = `patch.${name}`;
                    let projects = JSON.parse(window.localStorage.getItem("patch") || "[]")
                    window.localStorage.setItem("patch", JSON.stringify([...projects, name]));
                    window.localStorage.setItem(storageName, JSON.stringify(payload));
                    */
                    resolve(payload.compressed);
                });
        });

    }, []);

    const saveSubPatch = useCallback((name: string, patchToSave: SerializedPatch) => {
        fetch('/api/compress', {
            method: "POST",
            body: JSON.stringify(patchToSave)
        }).then(
            async r => {
                let payload = await r.json();
                let storageName = `subpatch.${name}`;
                let projects = JSON.parse(window.localStorage.getItem("subpatch") || "[]")
                window.localStorage.setItem("subpatch", JSON.stringify([...projects, name]));
                window.localStorage.setItem(storageName, JSON.stringify(payload));
            });
    }, []);

    return <StorageContext.Provider
        value={{
            saveSubPatch,
            getPatches,
            savePatch,
            onchainSubPatches: subpatches as OnchainSubPatch[]
        }}>
        {children}
    </StorageContext.Provider>;
};

