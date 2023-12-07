import React, { useEffect, useState, useRef, useCallback } from 'react';
import { ObjectNode } from '@/lib/nodes/types';

const bufferToArrayBuffer = require('buffer-to-arraybuffer');

export type ByteTypeNames = {
    [x: string]: Int8ArrayConstructor | Int32ArrayConstructor
}

const BYTE_TYPE_NAMES: ByteTypeNames = {
    "byte": Int8Array,
    "int32": Int32Array
};

const Audio: React.FC<{ objectNode: ObjectNode }> = ({ objectNode }) => {
    let [buffer, setBuffer] = useState<Float32Array | null>(null);

    const onDrop = useCallback(async (ev: React.DragEvent<HTMLDivElement>) => {
        ev.stopPropagation();
        ev.preventDefault();
        ev.dataTransfer.effectAllowed = "none";
        ev.dataTransfer.dropEffect = "none";

        if (ev.dataTransfer.items && ev.dataTransfer.items.length > 0) {
            let promises = [];
            let len = ev.dataTransfer.items.length;
            let file: File = ev.dataTransfer.items[0].getAsFile() as File;
            let audioContext = objectNode.patch.audioContext;
            let buffer = await getBlob(file, audioContext, objectNode.attributes["data format"] as string);
            objectNode.receive(objectNode.inlets[0], buffer);
            setBuffer(buffer);
        }
    }, [setBuffer]);

    return <div
        onDragOver={(e: any) => e.preventDefault()}
        onDrop={onDrop}
        className="w-44 bg-zinc-700 text-white p-2 rounded-lg">
        {buffer ? <div className="bg-zinc-900 p-2">
            {buffer.length / 44100} seconds
        </div> : <div className="bg-zinc-900 p-2">
            Drop Audio Here
        </div>}
    </div>;
};

export default Audio;

export const getBlob = (file: File, audioContext: AudioContext, dataFormat?: string): Promise<Float32Array> => {
    return new Promise((resolve) => {
        let reader = new FileReader();
        reader.readAsArrayBuffer(file)
        reader.onloadend = async () => {
            let raw: ArrayBuffer = reader.result as ArrayBuffer;
            let ArrayType = dataFormat ? (BYTE_TYPE_NAMES[dataFormat] || Int8Array) : Int8Array;
            console.log("data format=", dataFormat, ArrayType);
            let blob = new ArrayType(raw)
            console.log(blob);
            let type = new TextDecoder().decode(blob.slice(0, 4));
            if (type === "RIFF") {
                let audioBuffer = await audioContext.decodeAudioData(bufferToArrayBuffer(blob));
                resolve(audioBuffer.getChannelData(0));
            } else {
                resolve(new Float32Array(blob));
            }
        }
    });

};

