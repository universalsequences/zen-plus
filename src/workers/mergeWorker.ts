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

function bufferToWavBlob_old(buffers: Float32Array[], sampleRate: number) {
  const wav = new WaveFile();
  wav.fromScratch(2, sampleRate, "32f", buffers);

  const wavBuffer = wav.toBuffer();
  return new Blob([wavBuffer], { type: "audio/wav" });
}

function bufferToWavBlob(buffers: Float32Array[], sampleRate: number): Blob {
  // Calculate total number of samples
  const totalSamples = buffers[0].length;
  const numChannels = buffers.length;

  // WAV header is 44 bytes
  const dataSize = totalSamples * numChannels * 4; // 4 bytes per sample (32-bit float)
  const totalSize = 44 + dataSize;

  // Create buffer for the entire file
  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);

  // Write WAV header
  // "RIFF" chunk descriptor
  writeString(view, 0, "RIFF");
  view.setUint32(4, totalSize - 8, true);
  writeString(view, 8, "WAVE");

  // "fmt " sub-chunk
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 3, true); // Format code: 3 for IEEE float
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 4, true); // Byte rate
  view.setUint16(32, numChannels * 4, true); // Block align
  view.setUint16(34, 32, true); // Bits per sample

  // "data" sub-chunk
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  // Write interleaved audio data
  let offset = 44;
  const float32Array = new Float32Array(buffer, offset);

  for (let sample = 0; sample < totalSamples; sample++) {
    for (let channel = 0; channel < numChannels; channel++) {
      float32Array[sample * numChannels + channel] = buffers[channel][sample];
    }
  }

  return new Blob([buffer], { type: "audio/wav" });
}

// Helper function to write strings to DataView
function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
