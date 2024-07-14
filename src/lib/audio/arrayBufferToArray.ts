import { hashFloat32Array } from "@/utils/waveform/hashFloat32Array";
import { decoders } from "audio-decode";

export type ByteTypeNames = {
  [x: string]: Int8ArrayConstructor | Int32ArrayConstructor;
};

export const BYTE_TYPE_NAMES: ByteTypeNames = {
  byte: Int8Array,
  int32: Int32Array,
};

type Cache = {
  [key: string]: Float32Array;
};

const cache: Cache = {};

const detectAudioType = (header: Uint8Array): string => {
  // Check for "RIFF" (WAV format)
  if (
    header[0] === 0x52 &&
    header[1] === 0x49 &&
    header[2] === 0x46 &&
    header[3] === 0x46
  ) {
    return "RIFF";
  }
  // Check for "ID3" (MP3 format)
  if (header[0] === 0x49 && header[1] === 0x44 && header[2] === 0x33) {
    return "ID3";
  }
  if (
    header[0] === 255 &&
    header[1] === 251 &&
    header[2] === 144 &&
    header[3] === 100
  ) {
    return "ID3";
  }
  // Check for "ftyp" (MP4 format)
  if (
    header[4] === 0x66 &&
    header[5] === 0x74 &&
    header[6] === 0x79 &&
    header[7] === 0x70
  ) {
    return "ftyp";
  }

  // Check for MP3 frame sync (0xFFFB or 0xFFF3 or similar)
  if (header[0] === 0xff && (header[1] & 0xe0) === 0xe0) {
    return "ID3";
  }
  return "";
};

let worker: Worker | undefined = undefined;
const pendingRequests: Record<
  string,
  {
    resolve: (value: Float32Array | PromiseLike<Float32Array>) => void;
    reject: (reason?: any) => void;
  }
> = {};

export const arrayBufferToArray = async (
  raw: ArrayBuffer,
  audioContext: AudioContext,
  dataFormat?: string,
  channels = 1,
): Promise<Float32Array> => {
  const ArrayType = dataFormat
    ? BYTE_TYPE_NAMES[dataFormat] || Int8Array
    : Int8Array;
  const blob = new ArrayType(raw);
  const header = new Uint8Array(raw.slice(0, 10));
  const type = detectAudioType(header);

  if (type.includes("RIFF")) {
    // Handle WAV format
    const audioBuffer = await audioContext.decodeAudioData(blob.buffer);
    return audioBuffer.getChannelData(0);
  }

  if (type.includes("ID3")) {
    // Use worker for mp3 decoding
    const key = hashFloat32Array(new Uint8Array(raw));
    if (cache[key]) {
      return cache[key];
    }
    return new Promise((resolve, reject) => {
      if (!worker) {
        worker = new Worker(
          new URL("../../workers/mp3Worker", import.meta.url),
        );
        worker.onmessage = (e: MessageEvent) => {
          const { data, id, error } = e.data;
          const buffer = new Float32Array(3980000 * 2);
          if (!data) {
            return;
          }
          buffer.set(data[0], 0);
          buffer.set(data[1], 3980000);
          const request = pendingRequests[id];
          if (request) {
            delete pendingRequests[id];
            if (error) {
              request.reject(error);
            } else {
              cache[id] = buffer;
              request.resolve(buffer);
            }
          }
        };
      }

      pendingRequests[key] = { resolve, reject };
      worker.postMessage({ raw, id: key });
    });
  }

  // Default case, treat as raw PCM data
  return new Float32Array(blob);
};
