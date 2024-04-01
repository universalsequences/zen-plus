import React, { useState, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { File } from '@/lib/files/types';
import { Timestamp } from 'firebase/firestore';

export const useRevisions = () => {

    let { user } = useAuth();
    let [revisionCursor, setRevisionCursor] = useState(0);
    let lastFileFetched = useRef<File | undefined>(undefined);

    const fetchRevisions = useCallback((file: File): Promise<File[]> => {
        return new Promise((resolve) => {
            user.getIdToken().then(
                (token: string) => {

                    fetch('/api/revisions/query', {
                        method: "POST",
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            commits: file.commits,
                            start: file === lastFileFetched.current ? revisionCursor : 0
                        })
                    }).then(
                        async r => {
                            lastFileFetched.current = file;
                            let json = await r.json();
                            let revisions: File[] = [];
                            for (let x of json.revisions) {
                                revisions.push({
                                    ...x,
                                    createdAt: Timestamp.fromMillis(x.createdAt.seconds * 1000 + x.createdAt.nanoseconds / 1000000)
                                });
                            }
                            setRevisionCursor(json.cursor);
                            resolve(revisions);

                        });
                });
        });
    }, [revisionCursor, setRevisionCursor]);


    return { fetchRevisions };
};
