import type { NextApiRequest, NextApiResponse } from "next";
import { Timestamp } from "firebase/firestore";
import {
  limit,
  startAfter,
  DocumentData,
  collection,
  query,
  orderBy,
  where,
  getDocs,
} from "firebase/firestore";
import admin from "@/lib/db/firebaseAdmin";
import { db } from "@/lib/db/firebase";
import { File } from "@/lib/files/types";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    const token = req.headers.authorization?.split("Bearer ")[1];
    const decodedToken = await admin.auth().verifyIdToken(token as string);

    let email = decodedToken.email;

    try {
      let { filterFavorites, isSubPatch, searchText } = req.body;
      let _limit = req.body.limit;
      if (!_limit) {
        _limit = 20;
      }

      const collectionRef = collection(db, "patches");
      const q =
        searchText && searchText !== ""
          ? query(
              collectionRef,
              limit(_limit),
              where("user", "==", email),
              where("isSubPatch", "==", false),
              where("name", ">=", searchText), // Adjust this condition as per your search logic
              where("name", "<=", searchText + "\uf8ff"),
              orderBy("createdAt", "desc"),
            )
          : filterFavorites
            ? query(
                collectionRef,
                limit(_limit),
                where("user", "==", email),
                where("favorited", "==", filterFavorites),
                orderBy("createdAt", "desc"),
              )
            : query(
                collectionRef,
                where("user", "==", email),
                where("isSubPatch", "==", isSubPatch),
                orderBy("createdAt", "desc"),
                startAfter(
                  req.body.cursor
                    ? Timestamp.fromMillis(req.body.cursor.seconds * 1000)
                    : Timestamp.fromMillis(new Date().getTime()),
                ),
                limit(isSubPatch ? 1000 : _limit),
                where("hasNewVersion", "==", false),
              );

      try {
        const querySnapshot = await getDocs(q);
        const documents: File[] = [];
        for (let doc of querySnapshot.docs) {
          if (!doc.data().hasNewVersion) {
            //await updateDoc(doc.ref, { hasNewVersion: false });
          }
          if ((searchText && searchText !== "") || filterFavorites || !doc.data().hasNewVersion) {
            let data = doc.data();
            documents.push(docToFile(doc.id, data));
          }
        }

        console.log("docs=", documents.length);
        res.status(200).json({
          cursor: documents[documents.length - 1]?.createdAt,
          projects: documents,
        });
      } catch (error) {
        console.log(error);
        throw error;
      }
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: "Error compressing data" });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
const docToFile = (id: string, x: DocumentData): File => {
  return {
    id,
    name: x.name,
    commit: x.commit,
    patch: x.patch,
    commits: x.commits,
    createdAt: x.createdAt,
    user: x.user,
    screenshot: x.screenshot,
    favorited: x.favorited,
    inputs: x.inputs,
    outputs: x.outputs,
    moduleType: x.moduleType,
    tags: x.tags
  };
};
