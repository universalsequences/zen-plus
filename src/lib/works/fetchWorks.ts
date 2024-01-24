
import { db } from '@/lib/db/firebase';
import { documentId, addDoc, doc, getDoc, getFirestore, updateDoc, collection, query, orderBy, where, getDocs } from "firebase/firestore";
export interface WorkOption {
    createdAt: any;
    editionSize: number;
    description: string;
    dropAddress: string;
    name: string;
    ownerAddress: string;
    user: string;
    price: string;
    chainId: number;
    patchId: string;
};


export const fetchWorkOptions = (): Promise<WorkOption[]> => {
    return new Promise((resolve) => {
        // fetch all works
        const collectionRef = collection(db, 'drops');
        const q = query(collectionRef);
        try {
            getDocs(q).then(
                querySnapshot => {
                    const documents: WorkOption[] = [];
                    querySnapshot.forEach(doc => {
                        if (!doc.data().hasNewVersion) {
                            documents.push({ ...doc.data() } as WorkOption);
                        }
                    });
                    documents.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);
                    resolve(documents);
                });
        } catch (e) {
            resolve([]);
        }

    });
};

