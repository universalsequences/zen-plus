import type { NextApiRequest, NextApiResponse } from 'next';
import deflate from 'deflate-js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'POST') {
        try {
            // Assuming the JSON data is sent in the request body
            const originalString = req.body;

            var input = new TextEncoder().encode(originalString);
            console.log(input);
            var compressed = deflate.deflate(input); //pako.deflate(input);
            var compressedBase64 = Buffer.from(compressed).toString('base64');
            console.log("compressed base64=", compressedBase64);

            const decompressedSize = new Blob([originalString]).size;


            res.status(200).json({ compressed: decompressedSize + ',' + compressedBase64 });
        } catch (error) {
            res.status(500).json({ error: 'Error compressing data' });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}
