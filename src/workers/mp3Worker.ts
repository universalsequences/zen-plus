import { decoders } from "audio-decode";

self.onmessage = async (e: MessageEvent) => {
  const { raw, id } = e.data;
  try {
    const arr = new Uint8Array(raw);
    const audioBuffer = await decoders.mp3(arr); // decode
    const left = audioBuffer.getChannelData(0).slice(0, 85 * 44100);
    const right = audioBuffer.getChannelData(1).slice(0, 85 * 44100);
    self.postMessage({ data: [left, right], id });
  } catch (error) {
    self.postMessage({ error: "error decoding mp3 file" });
  }
};
