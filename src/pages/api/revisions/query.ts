import type { NextApiRequest, NextApiResponse } from 'next';
import { Timestamp } from 'firebase/firestore';
import { documentId, addDoc, doc, limit, startAfter, DocumentData, getDoc, getFirestore, updateDoc, collection, query, orderBy, where, getDocs } from "firebase/firestore";
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
            let { start, commits } = req.body;
            let _limit = req.body.limit;
            if (!_limit) {
                _limit = 10;
            }

            console.log("req.body cursor=", req.body.start);

            try {


                let documents: File[] = [];
                let cursor = 0;
                for (let i = start; i < Math.min(start + _limit, commits.length); i++) {
                    let commit = commits[i];
                    console.log("commit =", commit);
                    const docRef = doc(db, 'patches', commit);
                    try {
                        const docSnap = await getDoc(docRef);
                        if (docSnap.exists()) {
                            let document = docSnap.data();
                            documents.push(docToFile(docRef.id, document));
                        }
                        cursor = i + 1;
                    } catch (e) {
                    }
                }

                // documents.sort((a: any, b: any) => a.createdAt.seconds - b.createdAt.seconds);
                res.status(200).json({
                    cursor,
                    revisions: documents,
                });
            } catch (error) {
                console.log(error);
                throw error;
            }

        } catch (error) {
            console.log(error);
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

