import { decoders } from "audio-decode";

// Helper function to resample audio
function resampleAudio(
  inputBuffer: Float32Array,
  inputRate: number,
  outputRate: number,
): Float32Array {
  const ratio = inputRate / outputRate;
  const newLength = Math.round(inputBuffer.length / ratio);
  const result = new Float32Array(newLength);

  for (let i = 0; i < newLength; i++) {
    const position = i * ratio;
    const index = Math.floor(position);
    const fraction = position - index;

    if (index + 1 < inputBuffer.length) {
      result[i] =
        inputBuffer[index] * (1 - fraction) + inputBuffer[index + 1] * fraction;
    } else {
      result[i] = inputBuffer[index];
    }
  }

  return result;
}

self.onmessage = async (e: MessageEvent) => {
  const { raw, id } = e.data;
  try {
    const arr = new Uint8Array(raw);
    const audioBuffer = await decoders.mp3(arr); // decode
    console.log("audiobuffer.samplerate", audioBuffer.sampleRate);

    const targetSampleRate = 44100;
    const duration = 85; // 85 seconds

    let left = audioBuffer.getChannelData(0);
    let right = audioBuffer.getChannelData(1);

    // Resample if necessary
    if (audioBuffer.sampleRate !== targetSampleRate) {
      left = resampleAudio(left, audioBuffer.sampleRate, targetSampleRate);
      right = resampleAudio(right, audioBuffer.sampleRate, targetSampleRate);
    }

    // Trim to 85 seconds
    left = left.slice(0, duration * targetSampleRate);
    right = right.slice(0, duration * targetSampleRate);

    self.postMessage({ data: [left, right], id });
  } catch (error) {
    self.postMessage({ error: "error decoding mp3 file" });
  }
};
