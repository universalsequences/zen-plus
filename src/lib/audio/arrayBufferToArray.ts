export type ByteTypeNames = {
    [x: string]: Int8ArrayConstructor | Int32ArrayConstructor
}

export const BYTE_TYPE_NAMES: ByteTypeNames = {
    "byte": Int8Array,
    "int32": Int32Array
};

export const arrayBufferToArray = async (raw: ArrayBuffer, audioContext: AudioContext, dataFormat?: string): Promise<Float32Array> => {
    let ArrayType = dataFormat ? (BYTE_TYPE_NAMES[dataFormat] || Int8Array) : Int8Array;
    let blob = new ArrayType(raw)
    let type = new TextDecoder().decode(blob.slice(0, 4));
    if (type === "RIFF") {
        let audioBuffer = await audioContext.decodeAudioData(blob.buffer);
        return audioBuffer.getChannelData(0);
    } else {
        return new Float32Array(blob);
    }

};

