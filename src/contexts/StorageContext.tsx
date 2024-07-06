import React, { createContext, useState, useContext, useCallback, useEffect } from "react";
import { Timestamp } from "firebase/firestore";
import { useAuth } from "./AuthContext";
import { applyDiffs } from "@/lib/onchain/merge";
import { File } from "@/lib/files/types";
import { decompress } from "@/lib/onchain/fetch";
import {
  documentId,
  addDoc,
  doc,
  DocumentData,
  getDoc,
  getFirestore,
  updateDoc,
  collection,
  query,
  orderBy,
  where,
  getDocs,
} from "firebase/firestore";

import { db } from "@/lib/db/firebase";
import { v4 as uuidv4 } from "uuid";
import { Patch, SubPatch, IOlet, SerializedPatch } from "@/lib/nodes/types";
import { storage } from "@/lib/db/firebase";
import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";
import { abi } from "@/lib/abi/minter-abi";
import { MINTER_CONTRACT, DROP_CONTRACT } from "@/components/WriteOnChain";
import { usePublicClient, useContractRead } from "wagmi";
import { OnchainSubPatch, fetchOnchainSubPatch } from "@/lib/onchain/fetch";
import jsonpatch from "fast-json-patch";

export interface Project {
  name: string;
  json: SerializedPatch;
}

interface IStorageContext {
  getPatches: (key: string) => Project[];
  onchainSubPatches: File[];
  storePatch: (
    name: string,
    patch: Patch,
    isSubPatch: boolean,
    email: string,
    screenshot?: string,
  ) => Promise<void>;
  fetchPatchesForEmail: (
    email: string,
    isSubPatch?: boolean,
    isFavorited?: boolean,
    cursor?: Timestamp,
    searchText?: string,
  ) => Promise<FilesQueryResult>;
  fetchProject: (id: string, email: string) => Promise<File | null>;
  fetchPatch: (x: any) => Promise<SerializedPatch>;
  fetchSubPatchForDoc: (id: string) => Promise<SerializedPatch | null>;
  fetchRevisions: (head: any) => Promise<File[]>;
  loadSubPatches: () => void;
}

interface Props {
  children: React.ReactNode;
}

const StorageContext = createContext<IStorageContext | undefined>(undefined);

export const useStorage = (): IStorageContext => {
  const context = useContext(StorageContext);
  if (!context) throw new Error("useMessageHandler must be used within MessageProvider");
  return context;
};

export interface FilesQueryResult {
  cursor?: Timestamp;
  files: File[];
}

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

  let [subpatches, setSubPatches] = useState<File[]>([]);

  const { user } = useAuth();

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
    let projects = JSON.parse(window.localStorage.getItem(key) || "[]");
    let _projects: Project[] = [];
    for (let name of projects) {
      let localStorageKey = `${key}.${name}`;
      let payload = window.localStorage.getItem(localStorageKey);
      try {
        if (payload) {
          let payloadJSON: SerializedPatch = JSON.parse(payload);
          _projects.push({
            name: name,
            json: payloadJSON,
          });
        }
      } catch (e) {}
    }
    return _projects;
  };

  console.log("STORAGE CONTEXT");

  const compress = async (json: any): Promise<string> => {
    // we gotta save it now
    // Convert the string to a Blob
    console.log(json);
    console.log("api compressed with json=", JSON.stringify(json).length);
    let resp = await fetch("/api/compress", {
      method: "POST",
      body: JSON.stringify(json),
    });
    let payload = await resp.json();
    let compressed = payload.compressed;
    return compressed;
  };

  const uploadCompressedData = async (compressed: string): Promise<string> => {
    const diffBlob = new Blob([compressed], { type: "text/plain" });

    // Create a storage reference from our storage service
    const uniqueId = uuidv4(); // Generates a unique ID
    let path = `patches/${uniqueId}`;
    const diffRef = ref(storage, path);
    // Upload the Blob
    let snapshot = await uploadBytes(diffRef, diffBlob);
    return snapshot.ref.fullPath;
  };

  const storePatch = async (
    name: string,
    patch: Patch,
    isSubPatch: boolean,
    email: string,
    screenshot?: string,
  ) => {
    let json: any = patch.getJSON();

    let originalCompressed = await compress(json);

    let prev = patch.previousSerializedPatch;
    let current = json;
    if (prev && current && patch.previousDocId) {
      const diff = jsonpatch.compare(prev, current);
      json = diff;
    }

    let compressed = await compress(json);

    // we have the patch so we need to genearte the data
    let auxData: any = {};
    let document: any = {
      createdAt: new Date(),
      name,
      patch: await uploadCompressedData(originalCompressed),
      commit: await uploadCompressedData(compressed),
      user: email,
      isSubPatch,
      hasNewVersion: false,
    };
    let parentNode = (patch as SubPatch).parentNode;
    if (parentNode) {
      let moduleType = parentNode.attributes.moduleType;
      let getIO = (iolets: IOlet[], name: string) => {
        let ios: any[] = [];
        iolets.forEach((inlet, inletNumber) => {
          let inletObject = patch.objectNodes.find(
            (x) => x.name === name && x.arguments[0] === inletNumber + 1,
          );
          if (inletObject) {
            ios[inletNumber] = inletObject.attributes.io;
          } else {
            ios[inletNumber] = "other";
          }
        });
        return ios;
      };
      let inputs = getIO(parentNode.inlets, "in");
      let outputs = getIO(parentNode.outlets, "out");
      document.inputs = inputs;
      document.outputs = outputs;
      document.moduleType = moduleType;
    }

    if (screenshot) {
      document.screenshot = screenshot;
    }
    console.log("document to store=", document);
    if (patch.previousDocId) {
      const docRef = doc(db, "patches", patch.previousDocId);
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
      } catch (error) {}
    }
    addDoc(collection(db, "patches"), document).then((doc) => {
      let docId = doc.id;
      patch.previousDocId = docId;
      patch.previousSerializedPatch = patch.getJSON();
      window.history.pushState(null, "", `/editor/${docId}`);
    });
  };

  const loadSubPatches = useCallback(() => {
    if (user) {
      if (subpatches.length === 0) {
        console.log("LOADING SUB PATCHES");
        fetchPatchesForEmail(user.email, true).then((docs) => {
          setSubPatches(docs.files);
        });
      }
    }
  }, [user, subpatches]);

  const fetchProject = async (projectId: string, email: string): Promise<File | null> => {
    console.log("fetchProject", projectId);
    return new Promise((resolve) => {
      user.getIdToken().then((token: string) => {
        fetch("/api/files/fetch", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            projectId,
          }),
        }).then(async (resp) => {
          let json = await resp.json();
          console.log("fetched=", json);
          resolve({
            ...json,
            createdAt: Timestamp.fromMillis(json.seconds * 1000 + json.nanoseconds / 1000000),
          });
        });
      });
    });
  };

  const fetchPatchesForEmail = (
    email: string,
    isSubPatch = false,
    filterFavorites?: boolean,
    cursor?: Timestamp,
    searchText?: string,
  ): Promise<FilesQueryResult> => {
    console.log("fetch patches for email = ", email, searchText);
    return new Promise((resolve) => {
      user.getIdToken().then((token: string) => {
        fetch("/api/files/query", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            isSubPatch,
            filterFavorites,
            cursor,
            searchText,
          }),
        }).then(async (resp) => {
          let json = await resp.json();
          let files: File[] = json.projects.map((x: any) => ({
            ...x,
            createdAt: Timestamp.fromMillis(
              x.createdAt.seconds * 1000 + x.createdAt.nanoseconds / 1000000,
            ),
          }));
          resolve({
            files,
            cursor: !json.cursor
              ? undefined
              : Timestamp.fromMillis(
                  json.cursor.seconds * 1000 + json.cursor.nanoseconds / 1000000,
                ),
          });
        });
      });
    });
  };

  /*
    const fetchCommitDocs = async (ids: string[]): Promise<any[]> => {

    };
    */

  const fetchCommit = async (id: string): Promise<any | null> => {
    const docRef = doc(db, "patches", id);
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
    } catch (e) {}
    return null;
  };

  const fetchSubPatchForDoc = async (id: string): Promise<SerializedPatch | null> => {
    const docRef = doc(db, "patches", id);
    try {
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        let document = docSnap.data();
        return fetchPatch(document);
      }
    } catch (e) {}
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

      console.log("fetching with commits=", x.commits);

      if (commits.length === 0) {
        return decompressed;
      } else {
        console.log("applying diffs.");
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

  const docToFile = (id: string, x: DocumentData): File => {
    return {
      id,
      name: x.name,
      patch: x.patch,
      commit: x.commit,
      commits: x.commits,
      createdAt: x.createdAt,
      user: x.user,
      screenshot: x.screenshot,
      favorited: x.favorited,
    };
  };

  const fetchRevisions = async (head: any): Promise<File[]> => {
    let list: File[] = [];
    for (let commit of head.commits) {
      const docRef = doc(db, "patches", commit);
      try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          let document = docSnap.data();
          list.push(docToFile(docRef.id, document));
        }
      } catch (e) {}
    }
    console.log("returning list =", list);
    return list;
  };

  return (
    <StorageContext.Provider
      value={{
        fetchPatchesForEmail,
        storePatch,
        getPatches,
        fetchPatch,
        fetchRevisions,
        fetchSubPatchForDoc,
        fetchProject,
        loadSubPatches,
        onchainSubPatches: (subpatches || []) as File[],
      }}
    >
      {children}
    </StorageContext.Provider>
  );
};
