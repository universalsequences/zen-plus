import React, { useRef, useEffect, useState, useCallback } from "react";
import { Buffer } from "@/lib/tiling/types";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { FixedSizeList as List } from "react-window";
import { CopyIcon } from "@radix-ui/react-icons";

interface WorkletCodeViewProps {
  buffer: Buffer;
}

/**
 * WorkletCodeView displays the current patch's worklet code with syntax highlighting
 * using virtualized rendering for performance
 */
const WorkletCodeView: React.FC<WorkletCodeViewProps> = ({ buffer }) => {
  const rootDivRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [height, setHeight] = useState(500);

  // Get the worklet code from the patch
  const workletCode = buffer.patch?.wasmCode || buffer.patch?.workletCode || "";
  // Split the code into lines for virtualized rendering
  const codeLines = workletCode ? workletCode.split("\n") : [];

  // Focus the container with a slight delay to ensure the DOM is fully rendered
  useEffect(() => {
    setTimeout(() => {
      if (rootDivRef.current) {
        rootDivRef.current.focus();
        setHeight(rootDivRef.current.clientHeight);
      }
    }, 100);
  }, []);

  // Function to copy the code to clipboard
  const copyToClipboard = useCallback(() => {
    if (workletCode) {
      navigator.clipboard
        .writeText(workletCode)
        .then(() => {
          setCopySuccess(true);
          // Reset the success message after 2 seconds
          setTimeout(() => setCopySuccess(false), 2000);
        })
        .catch((err) => {
          console.error("Failed to copy code:", err);
        });
    }
  }, [workletCode]);

  // Row renderer for virtualized list
  const Row = useCallback(
    ({ index, style }: { index: number; style: React.CSSProperties }) => (
      <div className="relative" style={style}>
        <div className="absolute text-zinc-600 left-2 z-10 left-0 my-auto flex w-10">
          <div className="text-left w-full pr-1 text-xs mt-1">{index + 1}</div>
        </div>
        <SyntaxHighlighter
          language="javascript"
          style={vscDarkPlus}
          PreTag="span"
          customStyle={{
            display: "inline",
            paddingLeft: "40px",
            background: "transparent",
          }}
        >
          {codeLines[index]}
        </SyntaxHighlighter>
      </div>
    ),
    [codeLines],
  );

  if (!workletCode) {
    return (
      <div className="w-full h-full flex items-center justify-center text-zinc-400 p-10 text-xs">
        No worklet code available for this patch. Make sure the patch has been compiled.
      </div>
    );
  }

  return (
    <div
      ref={rootDivRef}
      className="worklet-code-view w-full h-full overflow-hidden text-white flex flex-col focus:outline-none"
      tabIndex={0}
      style={{
        background: "#1c1c1c",
        height: "100%",
      }}
    >
      <div className="header flex items-center justify-between border-b border-zinc-700 bg-zinc-900 p-2">
        <div className="text-xs text-zinc-500">
          Worklet Code for Patch:{" "}
          <span className="text-zinc-200">{buffer.patch?.name || "Unnamed Patch"}</span>
        </div>

        <div className="flex items-center">
          <div className="relative">
            <button
              onClick={copyToClipboard}
              className="flex items-center text-xs text-zinc-400 hover:text-white"
              title="Copy code to clipboard"
            >
              <CopyIcon className="mr-1 h-4 w-4" />
              <span>Copy</span>
            </button>

            {copySuccess && (
              <div className="absolute right-0 -top-8 bg-green-800 text-white text-xs px-2 py-1 rounded">
                Copied!
              </div>
            )}
          </div>
        </div>
      </div>

      <div ref={containerRef} className="code-container flex-grow" style={{ height: "100px" }}>
        <List
          height={height}
          itemCount={codeLines.length}
          itemSize={24} // Line height
          width="100%"
          style={{ height: "100%" }}
          className="bg-zinc-900 h-full"
        >
          {Row}
        </List>
      </div>
    </div>
  );
};

export default WorkletCodeView;
