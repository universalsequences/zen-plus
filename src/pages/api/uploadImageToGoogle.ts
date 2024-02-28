// pages/api/upload.js
import { NextApiRequest, NextApiResponse } from 'next';
import * as admin from 'firebase-admin';
const formidable = require('formidable');


export const config = {
    api: {
        bodyParser: false, // Disable the default body parser
    },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: "zen-plus-eaed2",
                clientEmail: process.env.GOOGLE_CLIENT_EMAIL,
                privateKey: (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, '\n'),
            }),
            storageBucket: "zen-plus-eaed2.appspot.com",
        });
    }


    if (req.method === 'POST') {
        const form = new formidable.IncomingForm();
        form.parse(req, async (err: any, fields: any, files: any) => {
            if (err) {
                return res.status(500).json({ message: 'Error parsing form data' });
            }

            try {
                let privateKey = (process.env.NEXT_PUBLIC_GOOGLE_API_KEY || "").replace(/\\n/g, '\n');
                const [imageFile] = files.file; // Adjust based on your input field
                let og = imageFile.originalFilename;
                const bucket = admin.storage().bucket();

                // Uploads a file to the bucket
                const filePath = imageFile.filepath;
                const destFileName = new Date().getTime() + '_' + Math.floor(Math.random() * 100000) + og;
                const [file] = await bucket.upload(filePath, {
                    destination: destFileName,
                });

                await file.makePublic();
                const publicUrl = `https://storage.googleapis.com/${bucket.name}/${destFileName}`;

                res.status(200).json({ message: 'Image uploaded successfully', url: publicUrl });

            } catch (error) {
                res.status(500).json({ message: 'Error uploading file' });
            }
        });
    } else {
        // Handle any non-POST requests
        res.setHeader('Allow', ['POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
