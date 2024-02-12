// pages/api/upload.js
import { storage } from '@/lib/db/firebase';
import axios from 'axios';
import { NextApiRequest, NextApiResponse } from 'next';
import FormData from 'form-data';
import fs from 'fs';
import * as admin from 'firebase-admin';

const formidable = require('formidable');

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


export const config = {
    api: {
        bodyParser: false, // Disable the default body parser
    },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'POST') {
        console.log("upload image...");
        const form = new formidable.IncomingForm();
        form.parse(req, async (err: any, fields: any, files: any) => {
            if (err) {
                console.error('Error parsing the form data:', err);
                return res.status(500).json({ message: 'Error parsing form data' });
            }

            try {
                let privateKey = (process.env.NEXT_PUBLIC_GOOGLE_API_KEY || "").replace(/\\n/g, '\n');
                const [imageFile] = files.file; // Adjust based on your input field
                console.log(files);
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
        console.log('wut');
        // Handle any non-POST requests
        res.setHeader('Allow', ['POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
