import pako from 'pako';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'POST') {
        const base64Compressed = req.body;
        if (!base64Compressed) {
            throw new Error('No compressed data provided');
        }

        // Convert the Base64 string back to a binary buffer
        const binaryBuffer = Buffer.from(base64Compressed, 'base64');

        // Decompress the data using Pako
        const decompressed = pako.inflate(binaryBuffer, { to: 'string' });

        res.status(200).json({ decompressed: JSON.parse(decompressed) });
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}
