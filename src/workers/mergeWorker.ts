// mergeWorker.js
import { WaveFile } from "wavefile";

self.onmessage = (e: MessageEvent) => {
  const { chunks, sampleRate } = e.data;

  const buffers = mergeBuffers(chunks);
  if (buffers) {
    const wavBlob = bufferToWavBlob(buffers, sampleRate);
    postMessage(wavBlob);
  } else {
    postMessage(null);
  }
};

type Chunk = {
  recLength: number;
  buffers: Float32Array[];
};

function mergeBuffers(chunks: Chunk[]): Float32Array[] | undefined {
  let recLength = 0;
  for (const chunk of chunks) {
    recLength += chunk.recLength;
  }

  const buffers = [];
  const channels = 2;
  for (let channel = 0; channel < channels; channel++) {
    const arr = new Float32Array(recLength);
    let off = 0;
    for (const chunk of chunks) {
      if (!chunk.buffers[channel]) {
        return undefined;
      }
      for (let i = 0; i < chunk.buffers[channel].length; i++) {
        const buffer = chunk.buffers[channel][i] as unknown as ArrayLike<number>;
        arr.set(buffer, off);
        off += buffer.length;
      }
    }
    buffers.push(arr);
  }
  return buffers;
}

function bufferToWavBlob(buffers: Float32Array[], sampleRate: number) {
  const wav = new WaveFile();
  wav.fromScratch(2, sampleRate, "32f", buffers);

  const wavBuffer = wav.toBuffer();
  return new Blob([wavBuffer], { type: "audio/wav" });
}
