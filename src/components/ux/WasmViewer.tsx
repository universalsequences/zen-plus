import React, { useRef } from "react";
import { FixedSizeList as List } from "react-window";

import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { materialDark } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { usePatch } from "@/contexts/PatchContext";
import { usePatches } from "@/contexts/PatchesContext";
import { usePosition } from "@/contexts/PositionContext";
import type { ObjectNode } from "@/lib/nodes/types";
import { CopyIcon } from "@radix-ui/react-icons";

export const WasmViewer: React.FC<{ objectNode: ObjectNode }> = ({
  objectNode,
}) => {
  const { patch } = usePatch();
  const { zenCode } = usePatches();

  const { sizeIndex } = usePosition();

  const { width, height } = objectNode.size || { width: 500, height: 500 };
  let text = patch.wasmCode
    ? patch.wasmCode.slice(patch.wasmCode.indexOf("void process"))
    : "";
  const lines = patch.wasmCode ? patch.wasmCode.split("\n") : [];
  // Ref to measure line height
  const measureRef = useRef(null);

  const Row = ({ index, style }) => (
    <div className="relative" style={style}>
      <div className="absolute text-zinc-600 left-2 z-30 left-0 my-auto flex w-16">
        <div>{index + 1}</div>
        <div className="w-1 h-full bg-zinc-600"></div>
      </div>
      <SyntaxHighlighter
        language="c"
        style={materialDark}
        PreTag="span"
        customStyle={{
          display: "inline",
          paddingLeft: "50px",
          width: width,
        }}
      >
        {lines[index]}
      </SyntaxHighlighter>
    </div>
  );

  return (
    <div
      className="overflow-scroll w-500 h-500 bg-zinc-800"
      style={{ width, height }}
    >
      <CopyIcon
        color="white"
        onClick={() => {
          // copy text to clipboard
          navigator.clipboard.writeText(patch.wasmCode as string);
        }}
        className="z-30 absolute top-5 right-5 cursor-pointer active:scale-105 transition-all"
      />
      <List
        height={height}
        itemCount={lines.length}
        itemSize={30} // Adjust this based on line height
        width={width}
      >
        {Row}
      </List>
    </div>
  );
};

export default WasmViewer;
