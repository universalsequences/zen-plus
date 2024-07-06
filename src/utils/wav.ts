import { WaveFile } from "wavefile";

type Chunk = {
  recLength: number;
  buffers: Float32Array[];
};

const mergeBuffers = (chunks: Chunk[]): Float32Array[] | undefined => {
  let recLength = 0;
  for (const chunk of chunks) {
    recLength += chunk.recLength;
  }

  const buffers: Float32Array[] = [];
  const channels = 2;
  for (let channel = 0; channel < channels; channel++) {
    const arr = new Float32Array(recLength);
    let off = 0;
    for (const chunk of chunks) {
      if (!chunk.buffers[channel]) {
        return undefined;
      }
      for (const buffer of chunk.buffers[channel]) {
        arr.set(buffer, off);
        off += buffer.length;
      }
    }
    buffers.push(arr);
  }
  return buffers;
};

export const mergeAndExportToWav = async (
  chunks: Chunk[],
  sampleRate: number,
) => {
  const worker = new Worker(new URL("../workers/mergeWorker", import.meta.url));
  // Wrap worker operations in a Promise for async handling
  const result = await new Promise<Blob | null>((resolve) => {
    worker.onmessage = (e) => {
      resolve(e.data);
    };

    // Start the worker with data
    worker.postMessage({ chunks, sampleRate });
  });

  // Terminate the worker after it completes
  worker.terminate();

  return result;
};

export const _mergeAndExportToWav = (
  chunks: Chunk[],
  sampleRate: number,
): Blob | undefined => {
  const buffers = mergeBuffers(chunks);
  if (buffers) {
    return bufferToWavBlob(buffers, sampleRate);
  }
  return undefined;
};

export const bufferToWavBlob = (
  buffers: Float32Array[],
  sampleRate: number,
): Blob => {
  // Assuming mono audio for simplicity, adjust as needed
  const wav = new WaveFile();
  wav.fromScratch(2, sampleRate, "32f", buffers);

  const wavBuffer = wav.toBuffer();
  return new Blob([wavBuffer], { type: "audio/wav" });
};
