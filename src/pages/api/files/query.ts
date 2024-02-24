import type { NextApiRequest, NextApiResponse } from 'next';
import { documentId, addDoc, doc, DocumentData, getDoc, getFirestore, updateDoc, collection, query, orderBy, where, getDocs } from "firebase/firestore";
import admin from '@/lib/db/firebaseAdmin';
import { db } from '@/lib/db/firebase';
import { File } from '@/lib/files/types';


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'POST') {
        const token = req.headers.authorization?.split('Bearer ')[1];
        const decodedToken = await admin.auth().verifyIdToken(token as string);

        let email = decodedToken.email;

        try {
            // Assuming the JSON data is sent in the request body
            const { filterFavorites, isSubPatch } = req.body;
            const collectionRef = collection(db, 'patches');
            const q = filterFavorites ? query(collectionRef, where('user', '==', email), where('favorited', '==', filterFavorites)) : query(collectionRef, where('user', '==', email), where('isSubPatch', '==', isSubPatch));

            try {
                const querySnapshot = await getDocs(q);
                const documents: File[] = [];
                querySnapshot.forEach(doc => {
                    if (filterFavorites || !doc.data().hasNewVersion) {
                        let data = doc.data();
                        if (data.moduleType) {
                            console.log(data);
                        }
                        documents.push(docToFile(doc.id, data));
                    }
                });
                documents.sort((a: any, b: any) => a.createdAt.seconds - b.createdAt.seconds);
                res.status(200).json({ projects: documents });
            } catch (error) {
                throw error;
            }

        } catch (error) {
            res.status(500).json({ error: 'Error compressing data' });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
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
        moduleType: x.moduleType
    };
};

