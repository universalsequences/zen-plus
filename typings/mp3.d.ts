declare module "mp3.js" {
  export interface PCMData {
    sampleRate: number;
    numberOfChannels: number;
    length: number;
    channelData: Float32Array[];
  }

  export function decode(
    buffer: ArrayBuffer,
    callback: (err: Error | null, pcm: PCMData) => void,
  ): void;
}
