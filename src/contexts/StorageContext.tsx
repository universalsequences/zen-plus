import React, { createContext, useState, useContext, useCallback, useEffect } from "react";
import { Timestamp } from "firebase/firestore";
import { useAuth } from "./AuthContext";
import { applyDiffs } from "@/lib/onchain/merge";
import { File } from "@/lib/files/types";
import { decompress } from "@/lib/onchain/fetch";
import { addDoc, doc, DocumentData, getDoc, updateDoc, collection } from "firebase/firestore";

import { db } from "@/lib/db/firebase";
import { v4 as uuidv4 } from "uuid";
import { Patch, SubPatch, IOlet, SerializedPatch } from "@/lib/nodes/types";
import { storage } from "@/lib/db/firebase";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import jsonpatch, { Operation } from "fast-json-patch";
import { PatchDoc } from "../lib/org/types";

export interface Project {
  name: string;
  json: SerializedPatch;
}

interface IStorageContext {
  getPatches: (key: string) => Project[];
  onchainSubPatches: File[];
  fetchPatchesForEmail: (
    email: string,
    isSubPatch?: boolean,
    isFavorited?: boolean,
    cursor?: Timestamp,
    searchText?: string,
  ) => Promise<FilesQueryResult>;
  fetchProject: (id: string, email: string) => Promise<File | null>;
  fetchPatch: (x: any, y?: boolean) => Promise<SerializedPatch>;
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
  let [subpatches, setSubPatches] = useState<File[]>([]);

  const { user } = useAuth();

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

  const loadSubPatches = useCallback(() => {
    if (user) {
      if (subpatches.length === 0) {
        // TODO - don't load every single patch at start
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
          const json = await resp.json();
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
            tags: x.tags,
            isPublic: x.isPublic,
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
        let doc = docSnap.data();
        let document: PatchDoc = {
          patch: doc.patch,
          commit: doc.commit,
          commits: doc.commits,
          tags: doc.tags,
          isPublic: doc.isPublic,
        };
        const patch = await fetchPatch(document, true);
        patch.docId = id;
        patch.doc = document;
        return patch;
      }
    } catch (e) {}
    return null;
  };

  const fetchPatch = async (x: PatchDoc, isSubPatch = false): Promise<SerializedPatch> => {
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

      if (commits.length === 0 || isSubPatch) {
        return decompressed;
      } else {
        let _commits = [decompressed];
        for (let c of commits) {
          _commits.push(await fetchCommit(c));
        }
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
      tags: x.tags,
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
