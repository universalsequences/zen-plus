import React, { useEffect, useState, useRef, useCallback } from "react";
import { useSelection } from "@/contexts/SelectionContext";
import { ObjectNode } from "@/lib/nodes/types";
import { arrayBufferToArray } from "@/lib/audio/arrayBufferToArray";

export type ByteTypeNames = {
  [x: string]: Int8ArrayConstructor | Int32ArrayConstructor;
};

export const BYTE_TYPE_NAMES: ByteTypeNames = {
  byte: Int8Array,
  int32: Int32Array,
};

const Audio: React.FC<{ objectNode: ObjectNode }> = ({ objectNode }) => {
  let [buffer, setBuffer] = useState<Float32Array | null>(null);
  let { updateAttributes, attributesIndex } = useSelection();
  let [editing, setEditing] = useState(false);
  let [text, setText] = useState<string>(objectNode.attributes["external-URL"] as string);

  useEffect(() => {
    setText(objectNode.attributes["external-URL"] as string);
  }, [setText, objectNode.attributes["external-URL"]]);

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setText(e.target.value);
    },
    [setText],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      console.log("on keyDown called...");
      if (!editing) {
        return;
      }
      if (e.key === "Enter") {
        objectNode.buffer = undefined;
        objectNode.setAttribute("external-URL", text);
        setEditing(false);
        //objectNode.receive(objectNode.inlets[0], "bang");
      }
    },
    [text, editing, setEditing],
  );

  const onDrop = useCallback(
    async (ev: React.DragEvent<HTMLDivElement>) => {
      console.log("on drop");
      ev.stopPropagation();
      ev.preventDefault();
      ev.dataTransfer.effectAllowed = "none";
      ev.dataTransfer.dropEffect = "none";

      if (ev.dataTransfer.items && ev.dataTransfer.items.length > 0) {
        let promises = [];
        let len = ev.dataTransfer.items.length;
        let file: File = ev.dataTransfer.items[0].getAsFile() as File;
        let audioContext = objectNode.patch.audioContext;
        let [buffer, length] = await getBlob(
          file,
          audioContext,
          objectNode.attributes["data format"] as string,
        );
        objectNode.receive(objectNode.inlets[0], buffer);
        setBuffer(buffer);
      }
    },
    [setBuffer],
  );

  let hasName = objectNode.attributes["external-URL"] !== "";
  return (
    <div
      onDragOver={(e: any) => e.preventDefault()}
      onDrop={onDrop}
      className={(!hasName ? "w-44" : "") + " bg-zinc-700 text-white p-2 rounded-lg"}
    >
      {objectNode.attributes["external-URL"] !== "" ? (
        editing ? (
          <input
            onKeyDown={onKeyDown}
            value={text}
            onChange={onChange}
            type="text"
            className="overflow-hidden bg-zinc-900 p-2"
          />
        ) : (
          <div className="overflow-hidden bg-zinc-900 p-2 w-64" onClick={() => setEditing(true)}>
            {objectNode.attributes["external-URL"]}
          </div>
        )
      ) : buffer ? (
        <div className="bg-zinc-900 p-2 overflow-hidden">{buffer.length / 44100 + " seconds"}</div>
      ) : (
        <div className="bg-zinc-900 p-2">Drop Audio Here</div>
      )}
    </div>
  );
};

export default Audio;

export const getBlob = (
  file: File,
  audioContext: AudioContext,
  dataFormat?: string,
): Promise<[Float32Array, number]> => {
  console.log("getting blob...");
  return new Promise((resolve) => {
    let reader = new FileReader();
    reader.readAsArrayBuffer(file);
    reader.onloadend = async () => {
      let raw: ArrayBuffer = reader.result as ArrayBuffer;
      resolve(arrayBufferToArray(raw, audioContext, dataFormat));
    };
  });
};
