import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';
import { SerializedPatch } from '@/lib/nodes/types';

export interface Project {
    name: string;
    json: SerializedPatch;
}

interface IStorageContext {
    savePatch: (x: string, patch: SerializedPatch) => void;
    saveSubPatch: (x: string, patch: SerializedPatch) => void;
    getPatches: (key: string) => Project[];
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
    const getPatches = (key: string) => {
        let projects = JSON.parse(window.localStorage.getItem(key) || "[]")
        let _projects: Project[] = [];
        for (let name of projects) {
            let payload = window.localStorage.getItem(`${key}.${name}`);
            if (payload) {
                let payloadJSON: SerializedPatch = JSON.parse(payload);
                _projects.push({
                    name: name,
                    json: payloadJSON
                });
            }
        }
        return _projects;
    };

    const savePatch = useCallback((name: string, patchToSave: SerializedPatch) => {
        let payload = JSON.stringify(patchToSave);
        let storageName = `patch.${name}`;
        let projects = JSON.parse(window.localStorage.getItem("patch") || "[]")
        window.localStorage.setItem("patch", JSON.stringify([...projects, name]));
        window.localStorage.setItem(storageName, payload);
    }, []);

    const saveSubPatch = useCallback((name: string, patchToSave: SerializedPatch) => {
        let payload = JSON.stringify(patchToSave);
        let storageName = `subpatch.${name}`;
        let projects = JSON.parse(window.localStorage.getItem("subpatch") || "[]")
        window.localStorage.setItem("subpatch", JSON.stringify([...projects, name]));
        window.localStorage.setItem(storageName, payload);
    }, []);

    return <StorageContext.Provider
        value={{
            saveSubPatch,
            getPatches,
            savePatch,
        }}>
        {children}
    </StorageContext.Provider>;
};

