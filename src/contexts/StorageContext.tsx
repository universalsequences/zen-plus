import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { applyDiffs } from '@/lib/onchain/merge';
import { decompress } from '@/lib/onchain/fetch';
import { documentId, addDoc, doc, getDoc, getFirestore, updateDoc, collection, query, orderBy, where, getDocs } from "firebase/firestore";

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
    getPatches: (key: string) => Project[];
    onchainSubPatches: OnchainSubPatch[];
    storePatch: (name: string, patch: Patch, isSubPatch: boolean, email: string, screenshot?: string) => Promise<void>;
    fetchPatchesForEmail: (email: string) => Promise<any[]>;
    fetchProject: (id: string, email: string) => Promise<any | null>;
    fetchPatch: (x: any) => Promise<SerializedPatch>;
    fetchSubPatchForDoc: (id: string) => Promise<SerializedPatch | null>;
    fetchRevisions: (head: any) => Promise<any[]>;
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


    const compress = async (json: any): Promise<string> => {
        // we gotta save it now
        // Convert the string to a Blob
        let resp = await fetch('/api/compress', {
            method: "POST",
            body: JSON.stringify(json)
        })
        let payload = await resp.json();
        let compressed = payload.compressed;
        return compressed;
    };

    const uploadCompressedData = async (compressed: string): Promise<string> => {
        const diffBlob = new Blob([compressed], { type: 'text/plain' });

        // Create a storage reference from our storage service
        const uniqueId = uuidv4(); // Generates a unique ID
        let path = `patches/${uniqueId}`;
        const diffRef = ref(storage, path);
        // Upload the Blob
        let snapshot = await uploadBytes(diffRef, diffBlob);
        return snapshot.ref.fullPath;
    };

    const storePatch = async (name: string, patch: Patch, isSubPatch: boolean, email: string, screenshot?: string) => {
        let json: any = patch.getJSON();

        let originalCompressed = await compress(json);

        let prev = patch.previousSerializedPatch;
        let current = json;
        if (prev && current && patch.previousDocId) {
            const diff = jsonpatch.compare(prev, current);
            json = diff;
        }

        let compressed = await compress(json);
        let document: any = {
            createdAt: new Date(),
            name,
            patch: await uploadCompressedData(originalCompressed),
            commit: await uploadCompressedData(compressed),
            user: email,
            isSubPatch,
        };
        if (screenshot) {
            document.screenshot = screenshot;
        }
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
            }
        }
        addDoc(collection(db, 'patches'), document).then(
            doc => {
                let docId = doc.id
                patch.previousDocId = docId;
                patch.previousSerializedPatch = patch.getJSON();
                window.history.pushState(null, '', `/editor/${docId}`);
            });

    };

    const fetchProject = async (projectId: string, email: string): Promise<any | null> => {
        const docRef = doc(db, 'patches', projectId);
        try {
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                let document = docSnap.data();
                document.id = projectId;
                return document;
            }
        } catch (error) {
        }
        return null;

        /*
        const collectionRef = collection(db, 'patches');
        const q = query(collectionRef, where('id', '==', projectId));
        console.log('fetch project id=', projectId, email);
 
        try {
            const querySnapshot = await getDocs(q);
            const documents: any = [];
            querySnapshot.forEach(doc => {
                //if (!doc.data().hasNewVersion) {
                documents.push({ id: doc.id, ...doc.data() });
                // }
            });
            let date = new Date();
            console.log('documents=', documents, querySnapshot);
            documents.sort((a: any, b: any) => a.createdAt.seconds - b.createdAt.seconds);
            return documents[0] || null;
        } catch (error) {
            throw error;
            return null;
        }
        */
    }

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
            documents.sort((a: any, b: any) => a.createdAt.seconds - b.createdAt.seconds);
            return documents;
        } catch (error) {
            throw error;
        }
    }

    /*
    const fetchCommitDocs = async (ids: string[]): Promise<any[]> => {
 
    };
    */

    const fetchCommit = async (id: string): Promise<any | null> => {
        const docRef = doc(db, 'patches', id);
        try {
            let a = new Date().getTime();
            const docSnap = await getDoc(docRef);
            let b = new Date().getTime();
            if (docSnap.exists()) {
                let document = docSnap.data();
                let commit = document.commit;
                let fileRef = ref(storage, commit);
                const downloadUrl = await getDownloadURL(fileRef);
                let r = await fetch(downloadUrl);
                let text = await r.text();
                let decompressed: any = decompress(text);
                let c = new Date().getTime();
                return decompressed;
            }
        } catch (e) {
        }
        return null;

    };

    const fetchSubPatchForDoc = async (id: string): Promise<SerializedPatch | null> => {
        const docRef = doc(db, 'patches', id);
        try {
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                let document = docSnap.data();
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
            if (x.patch) {
                let fileRef = ref(storage, x.patch);
                const downloadUrl = await getDownloadURL(fileRef);
                let r = await fetch(downloadUrl);
                let text = await r.text();
                let decompressed: SerializedPatch = decompress(text);
                return decompressed;
            }
            const downloadUrl = await getDownloadURL(fileRef);
            let r = await fetch(downloadUrl);
            let text = await r.text();
            let decompressed: SerializedPatch = decompress(text);

            if (commits.length === 0) {
                return decompressed;
            } else {
                let _commits = [decompressed];
                let a = new Date().getTime();
                for (let c of commits) {
                    _commits.push(await fetchCommit(c));
                }
                let b = new Date().getTime();
                let applied: SerializedPatch = applyDiffs(_commits);
                return applied;

            }
        } catch (error) {
            throw error;
        }
    };

    const fetchRevisions = async (head: any): Promise<any[]> => {
        let list = [];
        for (let commit of head.commits) {
            const docRef = doc(db, 'patches', commit);
            try {
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    let document = docSnap.data();
                    list.push(document);
                }
            } catch (e) {
            }
        }
        console.log('returning list =', list);
        return list;
    };

    return <StorageContext.Provider
        value={{
            fetchPatchesForEmail,
            storePatch,
            getPatches,
            fetchPatch,
            fetchRevisions,
            fetchSubPatchForDoc,
            fetchProject,
            onchainSubPatches: (subpatches || []) as OnchainSubPatch[]
        }}>
        {children}
    </StorageContext.Provider>;
};

