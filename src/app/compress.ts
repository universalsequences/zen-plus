import pako from 'pako';
import type { NextApiRequest, NextApiResponse } from 'next';


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    console.log("yo");
    if (req.method === 'POST') {
        try {
            // Assuming the JSON data is sent in the request body
            const jsonData = req.body;
            const compressed = pako.deflate(JSON.stringify(jsonData)); //, { to: 'string' });

            res.status(200).json({ compressed });
        } catch (error) {
            res.status(500).json({ error: 'Error compressing data' });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}
