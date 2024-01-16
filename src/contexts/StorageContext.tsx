import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { applyDiffs } from '@/lib/onchain/merge';
import { decompress } from '@/lib/onchain/fetch';
import { addDoc, doc, getDoc, getFirestore, updateDoc, collection, query, orderBy, where, getDocs } from "firebase/firestore";

import { db } from '@/lib/db/firebase';
import { v4 as uuidv4 } from 'uuid';
import {
    Patch, SubPatch, SerializedPatch
} from '@/lib/nodes/types';
import { storage } from "@/lib/db/firebase";
import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";
import { abi } from '@/lib/abi/minter-abi';
import { MINTER_CONTRACT, DROP_CONTRACT } from '@/components/WriteOnChain';
import { usePublicClient, useContractRead } from 'wagmi'
import { OnchainSubPatch, fetchOnchainSubPatch } from '@/lib/onchain/fetch';
import jsonpatch from 'fast-json-patch';

export interface Project {
    name: string;
    json: SerializedPatch;
}

interface IStorageContext {
    savePatch: (x: string, patch: SerializedPatch) => Promise<string>;
    saveSubPatch: (x: string, patch: SerializedPatch) => void;
    getPatches: (key: string) => Project[];
    onchainSubPatches: OnchainSubPatch[];
    storePatch: (name: string, patch: Patch, isSubPatch: boolean, email: string) => Promise<void>;
    fetchPatchesForEmail: (email: string) => Promise<any[]>;
    fetchPatch: (x: any) => Promise<SerializedPatch>;
    fetchSubPatchForDoc: (id: string) => Promise<SerializedPatch | null>;
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

    /*
    const publicClient = usePublicClient();
    const { data: subpatches, isError, isLoading } = useContractRead({
        address: MINTER_CONTRACT,
        abi: abi,
        functionName: 'getPatchHeads',
        args: [true]
    })
    */

    let [subpatches, setSubPatches] = useState<OnchainSubPatch[]>([]);

    const { user } = useAuth();
    useEffect(() => {
        if (user) {
            fetchPatchesForEmail(user.email, true).then(
                docs => {
                    console.log('subpatches we found=', docs);
                    if (docs) {
                        setSubPatches(docs.map((x: any) => ({ name: x.name, id: x.id } as OnchainSubPatch)));
                    }
                });
        }
    }, [user, setSubPatches]);

    /*
    useEffect(() => {
        if (subpatches) {
            fetchAll(subpatches);
        }
    }, [subpatches]);
    
    const fetchAll = async (list: any) => {
        let fetched: any[] = [];
        for (let elem of list) {
            let tokenId = elem.tokenId;
            let patch = await fetchOnchainSubPatch(publicClient, tokenId);
            fetched.push({
                tokenId: tokenId.toString(),
                name: elem.name,
                patch
            });
        }
    };
    */

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

    const storePatch = async (name: string, patch: Patch, isSubPatch: boolean, email: string) => {
        let json: any = patch.getJSON();
        let prev = patch.previousSerializedPatch;
        let current = json;
        if (prev && current && patch.previousDocId) {
            const diff = jsonpatch.compare(prev, current);
            console.log("DIFF=", diff);
            json = diff;
        }

        // we gotta save it now
        // Convert the string to a Blob
        let resp = await fetch('/api/compress', {
            method: "POST",
            body: JSON.stringify(json)
        })
        let payload = await resp.json();
        let compressed = (payload.compressed);

        const diffBlob = new Blob([compressed], { type: 'text/plain' });


        // Create a storage reference from our storage service
        const uniqueId = uuidv4(); // Generates a unique ID
        let path = `patches/${uniqueId}`;

        const diffRef = ref(storage, path);

        // Upload the Blob
        let snapshot = await uploadBytes(diffRef, diffBlob);
        let document: any = {
            createdAt: new Date(),
            name,
            commit: snapshot.ref.fullPath,
            user: email,
            isSubPatch
        };
        if (patch.previousDocId) {
            const docRef = doc(db, 'patches', patch.previousDocId);
            try {
                await updateDoc(docRef, { hasNewVersion: true });
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    let previousDoc = docSnap.data();
                    let commits = [patch.previousDocId];
                    if (previousDoc.commits) {
                        commits = [...commits, ...previousDoc.commits];
                    }
                    document.commits = commits;
                }
            } catch (error) {
                console.log('error fetching previous doc id');
            }
        }
        console.log('adding doc=', document);
        addDoc(collection(db, 'patches'), document).then(
            doc => {
                let docId = doc.id
                patch.previousDocId = docId;
                console.log('sertting previous doc id=', docId);
                patch.previousSerializedPatch = patch.getJSON();
            });

    };

    const fetchPatchesForEmail = async (email: string, isSubPatch = false): Promise<any[]> => {
        const collectionRef = collection(db, 'patches');
        const q = query(collectionRef, where('user', '==', email), where('isSubPatch', '==', isSubPatch));

        try {
            const querySnapshot = await getDocs(q);
            const documents: any = [];
            querySnapshot.forEach(doc => {
                if (!doc.data().hasNewVersion) {
                    documents.push({ id: doc.id, ...doc.data() });
                }
            });
            let date = new Date();
            console.log('documents matching=', email, documents);
            documents.sort((a: any, b: any) => a.createdAt.seconds - b.createdAt.seconds);
            return documents;
        } catch (error) {
            console.error('Error fetching documents:', error);
            throw error;
        }
    }

    const fetchCommit = async (id: string): Promise<any | null> => {
        console.log('fetch commit = ', id);
        const docRef = doc(db, 'patches', id);
        try {
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                let document = docSnap.data();
                let commit = document.commit;
                let fileRef = ref(storage, commit);
                const downloadUrl = await getDownloadURL(fileRef);
                let r = await fetch(downloadUrl);
                let text = await r.text();
                let decompressed: any = decompress(text);
                return decompressed;
            }
        } catch (e) {
        }
        return null;

    };

    const fetchSubPatchForDoc = async (id: string): Promise<SerializedPatch | null> => {
        console.log("fetch subpatch for doc=", id);
        const docRef = doc(db, 'patches', id);
        try {
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                let document = docSnap.data();
                console.log('document = ', document);
                return fetchPatch(document);
            }
        } catch (e) {
        }
        return null;
    };

    const fetchPatch = async (x: any): Promise<SerializedPatch> => {
        let commit = x.commit;
        let commits = x.commits || [];
        let fileRef = ref(storage, commit);
        try {
            const downloadUrl = await getDownloadURL(fileRef);
            let r = await fetch(downloadUrl);
            let text = await r.text();
            let decompressed: SerializedPatch = decompress(text);
            console.log('File download URL:', downloadUrl, text);
            console.log("decompressed = ", decompressed);

            if (commits.length === 0) {
                return decompressed;
            } else {
                let _commits = [decompressed];
                for (let c of commits) {
                    _commits.push(await fetchCommit(c));
                }
                console.log(_commits);
                let applied: SerializedPatch = applyDiffs(_commits);
                return applied;

            }
        } catch (error) {
            console.error('Error getting file download URL:', error);
            throw error;
        }
    };

    return <StorageContext.Provider
        value={{
            fetchPatchesForEmail,
            saveSubPatch,
            storePatch,
            getPatches,
            fetchPatch,
            savePatch,
            fetchSubPatchForDoc,
            onchainSubPatches: (subpatches || []) as OnchainSubPatch[]
        }}>
        {children}
    </StorageContext.Provider>;
};

