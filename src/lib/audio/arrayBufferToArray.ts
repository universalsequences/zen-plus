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
  [key: string]: [Float32Array, number];
};

const cache: Cache = {};

const detectAudioType = (header: Uint8Array): string => {
  // Check for "RIFF" (WAV format)
  if (header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46) {
    return "RIFF";
  }
  // Check for "ID3" (MP3 format)
  if (header[0] === 0x49 && header[1] === 0x44 && header[2] === 0x33) {
    return "ID3";
  }
  if (header[0] === 255 && header[1] === 251 && header[2] === 144 && header[3] === 100) {
    return "ID3";
  }
  // Check for "ftyp" (MP4 format)
  if (header[4] === 0x66 && header[5] === 0x74 && header[6] === 0x79 && header[7] === 0x70) {
    return "ftyp";
  }
  // Check for MP3 frame sync (0xFFFB or 0xFFF3 or similar)
  if (header[0] === 0xff && (header[1] & 0xe0) === 0xe0) {
    return "ID3";
  }
  return "";
};

const workerPool: Worker[] = [];
const taskQueue: (() => void)[] = [];
const MAX_WORKERS = 2; // Adjust based on your needs
let activeWorkers = 0;

const createWorker = (): Worker => {
  const worker = new Worker(new URL("../../workers/mp3Worker", import.meta.url));
  workerPool.push(worker);
  return worker;
};

const getWorker = (): Worker | null => {
  if (workerPool.length < MAX_WORKERS) {
    return createWorker();
  }

  return workerPool.find((worker) => worker) || null;
};

const processQueue = () => {
  if (taskQueue.length > 0 && activeWorkers < MAX_WORKERS) {
    const task = taskQueue.shift();
    if (task) {
      activeWorkers++;
      task();
    }
  }
};

export const arrayBufferToArray = async (
  raw: ArrayBuffer,
  audioContext: AudioContext,
  dataFormat?: string,
  channels = 1,
): Promise<[Float32Array, number]> => {
  const ArrayType = dataFormat ? BYTE_TYPE_NAMES[dataFormat] || Int8Array : Int8Array;
  const blob = new ArrayType(raw);
  const header = new Uint8Array(raw.slice(0, 10));
  const type = detectAudioType(header);

  if (type.includes("RIFF")) {
    // Handle WAV format
    const audioBuffer = await audioContext.decodeAudioData(blob.buffer);
    const left = audioBuffer.getChannelData(0);
    const right = audioBuffer.getChannelData(1);

    const combined = combineBuffers([left, right]);
    console.log("returning RIFF combined=", combined);
    const ret = [combined, left.length];
    console.log("to return=", ret);
    return ret as [Float32Array, number];
  }

  if (type.includes("ID3")) {
    // Use worker for mp3 decoding
    const key = hashFloat32Array(new Uint8Array(raw));
    if (cache[key]) {
      return cache[key];
    }

    return new Promise((resolve, reject) => {
      const task = () => {
        const worker = getWorker();

        const handleMessage = (e: MessageEvent) => {
          const { data, id, error } = e.data;
          if (id !== key) return; // Ignore messages for other requests

          worker?.removeEventListener("message", handleMessage);

          activeWorkers--;
          processQueue(); // Process the next task in the queue

          if (error) {
            reject(error);
          } else {
            console.log("about to do so...");
            const buffer = combineBuffers(data);
            console.log("combined ret", buffer);
            cache[key] = [buffer, data[0].length];
            resolve(cache[key]);
          }
        };

        worker?.addEventListener("message", handleMessage);
        worker?.postMessage({ raw, id: key });
      };

      taskQueue.push(task);
      processQueue();
    });
  }

  // Default case, treat as raw PCM data
  const buf = new Float32Array(blob);
  return [buf, buf.length];
};

const combineBuffers = (data: [Float32Array, Float32Array]) => {
  // TODO - remove max length
  const MAX_LENGTH = 3980000;
  const buffer = new Float32Array(MAX_LENGTH * 2);
  console.log("combine buffers=", data);
  buffer.set(data[0].subarray(0, MAX_LENGTH), 0);
  buffer.set(data[1].subarray(0, MAX_LENGTH), MAX_LENGTH);
  console.log("finished combining...");
  return buffer;
};
