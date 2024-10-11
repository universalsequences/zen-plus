import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "@/lib/db/firebase";

export const tagDoc = async (docId: string, tag: string): Promise<void> => {
  const docRef = doc(db, "patches", docId);

  try {
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      await updateDoc(docRef, {
        tags: arrayUnion(tag),
      });
    } else {
      console.log("Document does not exist!");
    }
  } catch (error) {
    console.error("Error adding tag:", error);
  }
};

export const deleteTagFromDoc = async (docId: string, tag: string): Promise<void> => {
  const docRef = doc(db, 'patches', docId);

  try {
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      await updateDoc(docRef, {
        tags: arrayRemove(tag)
      });
      console.log(`Tag "${tag}" removed from document ${docId}`);
    } else {
      console.log('Document does not exist!');
    }
  } catch (error) {
    console.error('Error removing tag:', error);
  }
};
