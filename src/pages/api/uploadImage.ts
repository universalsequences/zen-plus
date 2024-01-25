// pages/api/upload.js
import axios from 'axios';
import { NextApiRequest, NextApiResponse } from 'next';
import FormData from 'form-data';
import fs from 'fs';

const formidable = require('formidable');

export const config = {
    api: {
        bodyParser: false, // Disable the default body parser
    },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'POST') {
        // Parse the form data
        const form = new formidable.IncomingForm();
        form.parse(req, async (err: any, fields: any, files: any) => {
            if (err) {
                console.error('Error parsing the form data:', err);
                return res.status(500).json({ message: 'Error parsing form data' });
            }

            try {
                const imageFile = files.file[0]; // Adjust based on your input field

                // Create form data for Pinata
                const data = new FormData();
                data.append('file', fs.createReadStream(imageFile.filepath));

                // Pinata API endpoint
                const url = 'https://api.pinata.cloud/pinning/pinFileToIPFS';

                // Pinata API credentials
                const pinataApiKey = process.env.PINATA_API_KEY;
                const pinataSecretApiKey = process.env.PINATA_SECRET_API_KEY;

                // Axios headers
                const headers: any = {
                    'Content-Type': `multipart/form-data`,
                    pinata_api_key: pinataApiKey,
                    pinata_secret_api_key: pinataSecretApiKey,
                };

                // Make the request to Pinata
                const response = await axios.post(url, data, { headers });

                console.log("uploaded to pinata");

                // Handle the Pinata response
                res.status(200).json({ message: 'Image uploaded successfully', data: response.data });
            } catch (error) {
                console.error('Error uploading image:', error);
                res.status(500).json({ message: 'Error uploading image' });
            }
        });
    } else {
        // Handle any non-POST requests
        res.setHeader('Allow', ['POST']);
        res.status(405).end(`Method  Not Allowed`);
    }
}
