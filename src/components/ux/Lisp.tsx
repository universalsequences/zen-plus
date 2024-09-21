import React, { useRef, useCallback, useEffect, useState } from "react";
import { useLocked } from "@/contexts/LockedContext";
import { useSelection } from "@/contexts/SelectionContext";
import { ObjectNode } from "@/lib/nodes/types";
import { usePosition } from "@/contexts/PositionContext";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { materialDark } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { useValue } from "@/contexts/ValueContext";

const Lisp: React.FC<{ objectNode: ObjectNode }> = ({ objectNode }) => {
  let { attributesIndex } = useSelection();
  let { lockedMode } = useLocked();
  usePosition();
  const [text, setText] = useState(objectNode.script || "");
  const [animate, setAnimate] = useState(false);

  const { value } = useValue();
  const current = useRef(0);
  useEffect(() => {
    setAnimate(false);
    current.current = value as number;
    setTimeout(() => {
      const element = textAreaRef.current;
      element && (element as any).offsetWidth; // This line triggers a reflow
      setAnimate(true);
      setTimeout(() => {
        if (current.current !== value) {
          setAnimate(false);
        }
      }, 500);
    }, 3);
  }, [value]);

  let { width, height } = objectNode.size || { width: 100, height: 100 };

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const t = e.target.value;
    objectNode.script = t;
    setText(t);
  }, []);
  let size = objectNode.size || { width: 100, height: 100 };
  const fontStyles = {
    fontFamily: "monospace", // Ensure consistent monospace font
    fontSize: `${objectNode.attributes["font-size"] as number}px`, // Use the same font size
    lineHeight: "1.5", // Line height consistency
  };

  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const syntaxHighlighterRef = useRef<HTMLDivElement>(null);
  // Synchronize scrolling between textarea and syntax highlighter
  const syncScroll = () => {
    if (textAreaRef.current && syntaxHighlighterRef.current) {
      syntaxHighlighterRef.current.scrollTop = textAreaRef.current.scrollTop;
      syntaxHighlighterRef.current.scrollLeft = textAreaRef.current.scrollLeft;
    }
  };

  useEffect(() => {
    const textarea = textAreaRef.current;
    if (textarea) {
      textarea.addEventListener("scroll", syncScroll);
      return () => {
        textarea.removeEventListener("scroll", syncScroll);
      };
    }
  }, []);
  return (
    <div style={{ width, height }} className={`bg-zinc-800 relative`}>
      <div
        ref={syntaxHighlighterRef}
        style={{
          padding: "5px",
          width: width,
          height: height,
          whiteSpace: "pre-wrap", // Ensure wrapping
          overflow: "hidden", // Prevent extra scrolling here
          pointerEvents: "none", // Disable interaction with the highlighted text
          ...fontStyles, // Apply the same font styles
          position: "absolute",
          top: 0,
          left: 0,
        }}
      >
        <SyntaxHighlighter
          language="lisp"
          style={materialDark}
          customStyle={{
            margin: 0,
            whiteSpace: "pre-wrap", // Ensure wrapping
            padding: 0,
            overflowX: "hidden",
width,
            overflowWrap: "break-word", // Break long words for wrapping
            wordWrap: "break-word", // Ensure long words wrap properly
            ...fontStyles,
          }}
        >
          {text + " "} {/* Adding a space to ensure proper wrapping */}
        </SyntaxHighlighter>
      </div>
      <textarea
        ref={textAreaRef}
        spellCheck="false"
        className="outline-none w-full h-full bg-transparent text-transparent caret-white p-2"
        value={text}
        onChange={handleChange}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: width,
          height: height,
          color: "transparent", // Hide the text in the textarea
          background: "transparent", // Transparent background
          caretColor: "white", // Keep caret visible
          padding: "5px", // Match padding with highlighter
          margin: 0, // Remove margin
          border: "none", // Remove border
          whiteSpace: "pre-wrap", // Ensure wrapping
          overflowWrap: "break-word", // Break long words for wrapping
          wordWrap: "break-word", // Ensure long words wrap properly
          overflow: "auto", // Enable scrolling for the textarea
          ...fontStyles, // Ensure consistent font styles
        }}
      />
      <div
        style={{ zIndex: 10000000 }}
        className={`w-2 h-2 rounded-full transition-all ${animate ? "bg-lime-500" : ""} top-1 right-1 absolute`}
      />
    </div>
  );
};

export default Lisp;
/*
   <textarea
   spellcheck={"false"}
   className="outline-none w-full h-full bg-transparent text-white p-0.5 border-box overflow-scroll p-2"
   value={text}
   onChange={handleChange}
   />
 */
