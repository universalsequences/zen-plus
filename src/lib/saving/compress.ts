import { storage } from "@/lib/db/firebase";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { v4 as uuidv4 } from "uuid";

export const compress = async (json: any): Promise<string> => {
  // we gotta save it now
  // Convert the string to a Blob
  console.log(json);
  console.log("api compressed with json=", JSON.stringify(json).length);

  let resp = await fetch("/api/compress", {
    method: "POST",
    body: JSON.stringify(json),
  });
  let payload = await resp.json();
  let compressed = payload.compressed;
  return compressed;
};
export const uploadCompressedData = async (compressed: string): Promise<string> => {
  const diffBlob = new Blob([compressed], { type: "text/plain" });

  // Create a storage reference from our storage service
  const uniqueId = uuidv4(); // Generates a unique ID
  let path = `patches/${uniqueId}`;
  const diffRef = ref(storage, path);
  // Upload the Blob
  let snapshot = await uploadBytes(diffRef, diffBlob);
  return snapshot.ref.fullPath;
};
