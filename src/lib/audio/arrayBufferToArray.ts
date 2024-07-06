export type ByteTypeNames = {
  [x: string]: Int8ArrayConstructor | Int32ArrayConstructor;
};

export const BYTE_TYPE_NAMES: ByteTypeNames = {
  byte: Int8Array,
  int32: Int32Array,
};

export const arrayBufferToArray = async (
  raw: ArrayBuffer,
  audioContext: AudioContext,
  dataFormat?: string,
  channels: number = 1,
): Promise<Float32Array> => {
  console.log("array buffer to array channels=", channels);
  let ArrayType = dataFormat ? BYTE_TYPE_NAMES[dataFormat] || Int8Array : Int8Array;
  let blob = new ArrayType(raw);
  let type = new TextDecoder().decode(blob.slice(0, 4));
  if (type === "RIFF") {
    let audioBuffer = await audioContext.decodeAudioData(blob.buffer);
    let size = audioBuffer.getChannelData(0).length;
    return audioBuffer.getChannelData(0);
    /*
    console.log("decoded size=", size);
    let buffer = new Float32Array(size * channels + 1000);
    for (let i = 0; i < channels; i++) {
      let channelNumber = i % audioBuffer.numberOfChannels;
      let channel = audioBuffer.getChannelData(i % audioBuffer.numberOfChannels);
      console.log("channel=%s", channelNumber, channel);
      buffer.set(channel, i * size);
      console.log("completed setting channel...");
    }
    console.log("buffer converted=", buffer);
    return buffer;
    */
  } else {
    return new Float32Array(blob);
  }
};
