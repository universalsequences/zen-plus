import { Patch, SubPatch, IOlet, SerializedPatch } from "@/lib/nodes/types";
import { db } from "@/lib/db/firebase";
import { addDoc, doc, getDoc, updateDoc, collection } from "firebase/firestore";
import jsonpatch, { Operation } from "fast-json-patch";
import { uploadCompressedData } from "./compress";
import { compress } from "./compress";

export const storePatch = async (
  name: string,
  patch: Patch,
  isSubPatch: boolean,
  email: string,
  screenshot?: string,
  isFork?: boolean,
) => {
  let json: SerializedPatch | Operation[] = patch.getJSON();

  let originalCompressed = await compress(json);

  let prev = patch.previousSerializedPatch;
  let current = json;
  if (prev && current && patch.previousDocId) {
    const diff = jsonpatch.compare(prev, current);
    json = diff;
  }

  let compressed = await compress(json);

  // we have the patch so we need to genearte the data
  const document: any = {
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
      iolets.forEach((_inlet, inletNumber) => {
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
  const docId = patch.previousDocId || patch.docId;
  if (docId) {
    const docRef = doc(db, "patches", docId);
    try {
      if (!isFork) {
        console.log("setting has new version!");
        await updateDoc(docRef, { hasNewVersion: true });
      }
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        let previousDoc = docSnap.data();
        let commits = [docId];
        if (previousDoc.commits) {
          commits = [...commits, ...previousDoc.commits];
        }
        document.commits = commits;
      }
    } catch (error) {}
  }
  addDoc(collection(db, "patches"), document).then((doc) => {
    let docId = doc.id;
    console.log("added doc=", docId);
    patch.previousDocId = docId;
    patch.previousSerializedPatch = patch.getJSON();
    window.history.pushState(null, "", `/editor/${docId}`);
  });
};
