import pako from "pako";
import type { NextApiRequest, NextApiResponse } from "next";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "20mb", // Set desired size limit here
    },
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method === "POST") {
    try {
      // Assuming the JSON data is sent in the request body
      const jsonData = req.body;

      const compressed = pako.deflate(jsonData); //, { to: 'string' });
      const base64Compressed = Buffer.from(compressed).toString("base64");
      console.log("compression called", compressed.length);

      res.status(200).json({ compressed: base64Compressed });
    } catch (error) {
      res.status(500).json({ error: "Error compressing data" });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
