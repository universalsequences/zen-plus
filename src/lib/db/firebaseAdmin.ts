import * as admin from 'firebase-admin';

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: "zen-plus-eaed2",
            clientEmail: process.env.GOOGLE_CLIENT_EMAIL,
            privateKey: (process.env.GOOGLE_PRIVATE_KEY as string).replace(/\\n/g, '\n')
        }),
        // ...other configuration
        storageBucket: "zen-plus-eaed2.appspot.com",
    });
}

export default admin;

