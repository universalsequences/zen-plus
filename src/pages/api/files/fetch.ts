import type { NextApiRequest, NextApiResponse } from "next";
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
import admin from "@/lib/db/firebaseAdmin";

import { db } from "@/lib/db/firebase";
import { File } from "@/lib/files/types";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    const token = req.headers.authorization?.split("Bearer ")[1];
    const decodedToken = await admin.auth().verifyIdToken(token as string);

    let email = decodedToken.email;

    try {
      // Assuming the JSON data is sent in the request body
      const { projectId } = req.body;
      const docRef = doc(db, "patches", projectId);
      try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          let document = docSnap.data();
          if (document.user !== email) {
            return res.status(401).json({ error: "Unauthorized" });
          }
          res.status(200).json(docToFile(projectId, document));
        }
      } catch (error) {}
    } catch (error) {
      throw error;
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
    commits: x.commits,
    patch: x.patch,
    createdAt: x.createdAt,
    user: x.user,
    screenshot: x.screenshot,
    favorited: x.favorited,
  };
};
