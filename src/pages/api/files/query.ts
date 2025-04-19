import type { NextApiRequest, NextApiResponse } from "next";
import { Timestamp } from "firebase/firestore";
import {
  or,
  and,
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
      let { filterFavorites, isSubPatch, searchText, hasScreenshot } = req.body;
      let _limit = req.body.limit;
      if (!_limit) {
        _limit = 20;
      }

      const collectionRef = collection(db, "patches");
      // Base query conditions
      let baseConditions = [];
      
      // Determine query conditions based on filters
      if (searchText && searchText !== "") {
        console.log("Search query for:", searchText);
        let conditions = [
          where("user", "==", email),
          where("isSubPatch", "==", isSubPatch !== undefined ? isSubPatch : false),
          where("name", ">=", searchText),
          where("name", "<=", searchText + "\uf8ff"),
        ];
        
        // Add screenshot filter if requested
        if (hasScreenshot) {
          console.log("Filtering for screenshots");
          conditions.push(where("screenshot", "!=", null));
        }
        
        baseConditions = conditions;
      } else if (filterFavorites && hasScreenshot) {
        console.log("Filter by favorites with screenshots");
        baseConditions = [
          where("user", "==", email),
          where("favorited", "==", filterFavorites),
          where("screenshot", "!=", null),
        ];
      } else if (filterFavorites) {
        console.log("Filter by favorites");
        baseConditions = [
          where("user", "==", email),
          where("favorited", "==", filterFavorites),
        ];
      } else if (hasScreenshot) {
        console.log("Filter by screenshots only");
        baseConditions = [
          and(
            or(where("user", "==", email), where("isPublic", "==", true)),
            where("isSubPatch", "==", isSubPatch),
            where("hasNewVersion", "==", false),
            where("screenshot", "!=", null)
          ),
        ];
      } else {
        console.log("No filters applied");
        baseConditions = [
          and(
            or(where("user", "==", email), where("isPublic", "==", true)),
            where("isSubPatch", "==", isSubPatch),
            where("hasNewVersion", "==", false),
          ),
        ];
      }
      
      // Always order by createdAt for consistent pagination
      const orderByField = "createdAt";
      
      // Create the full query with pagination
      const queryArgs = [
        collectionRef,
        ...baseConditions,
        orderBy(orderByField, "desc"),
      ];
      
      // Add cursor for pagination if provided
      if (req.body.cursor) {
        console.log("Using cursor:", req.body.cursor);
        try {
          const timestamp = Timestamp.fromMillis(req.body.cursor.seconds * 1000);
          queryArgs.push(startAfter(timestamp));
        } catch (err) {
          console.error("Error using cursor:", err);
          // If there's an error with the cursor, don't use it
        }
      } else {
        console.log("No cursor provided, starting from beginning");
      }
      
      // Add limit
      queryArgs.push(limit(isSubPatch ? 1000 : _limit));
      
      const q = query(...queryArgs);

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
        
        // Only include cursor in response if we have documents and it's different from the current cursor
        let newCursor = documents.length > 0 ? documents[documents.length - 1]?.createdAt : null;
        let cursorChanged = false;
        
        if (newCursor && req.body.cursor) {
          // Check if cursor has changed (different timestamp)
          cursorChanged = 
            newCursor.seconds !== req.body.cursor.seconds || 
            newCursor.nanoseconds !== req.body.cursor.nanoseconds;
            
          console.log("Cursor comparison:", {
            oldCursor: `${req.body.cursor.seconds}.${req.body.cursor.nanoseconds}`,
            newCursor: `${newCursor.seconds}.${newCursor.nanoseconds}`,
            changed: cursorChanged
          });
        } else if (newCursor) {
          cursorChanged = true; // New cursor and no previous cursor
          console.log("New cursor with no previous cursor");
        } else {
          console.log("No new cursor available");
        }
        
        // Determine if there are more results
        const hasMore = documents.length > 0 && documents.length >= _limit && cursorChanged;
        
        console.log("Response:", {
          hasCursor: !!newCursor && cursorChanged,
          hasMore,
          documentsCount: documents.length
        });
        
        res.status(200).json({
          cursor: cursorChanged ? newCursor : null,
          hasMore,
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
    tags: x.tags,
    isPublic: x.isPublic,
  };
};
