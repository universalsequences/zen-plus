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
  const [highlightedText, setHighlightedText] = useState(text); // New state to manage highlighted text

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

  // Check for Lisp special forms and common functions
  const isSpecialForm = (line: string) => {
    const specialForms = ["defun", "let", "if", "lambda", "setq"];
    return specialForms.some((form) => line.trim().startsWith(`(${form}`));
  };

  // Calculate indentation based on Lisp structure, including special forms
  const getIndentation = (
    line: string,
    previousIndentLevel: number,
    isInSpecialForm: boolean,
  ): number => {
    const openParenCount = (line.match(/\(/g) || []).length;
    const closeParenCount = (line.match(/\)/g) || []).length;

    // Reset indentation level for top-level forms like defun
    if (isSpecialForm(line)) {
      return 0;
    }

    // If inside a special form (e.g., defun, if), increase indentation on the next line
    if (isInSpecialForm) {
      return Math.max(0, previousIndentLevel + openParenCount - closeParenCount + 1);
    }

    return Math.max(0, previousIndentLevel + openParenCount - closeParenCount);
  };

  // Re-indent the buffer based on structure and Lisp forms
  const autoIndentBuffer = (inputText: string, caretPosition: number) => {
    const lines = inputText.split("\n");
    let newBuffer = "";
    let indentLevel = 0;
    let newCaretPosition = caretPosition;
    let caretOffset = 0;
    let inSpecialForm = false;

    lines.forEach((line, index) => {
      // Detect if this line is a special form
      const specialFormDetected = isSpecialForm(line);

      // Calculate the correct indentation for the current line
      const currentIndentLevel = getIndentation(line.trim(), indentLevel, inSpecialForm);
      indentLevel = currentIndentLevel;

      // Track if we are inside a special form block (e.g., after defun or if)
      inSpecialForm = specialFormDetected;

      const trimmedLine = line.trim();
      const indentedLine = "  ".repeat(indentLevel) + trimmedLine;

      // Append the indented line to the new buffer
      newBuffer += indentedLine + (index < lines.length - 1 ? "\n" : "");

      // If the caret is within this line, adjust its position based on the indentation
      if (caretPosition >= caretOffset && caretPosition <= caretOffset + line.length) {
        const relativeCaretPos = caretPosition - caretOffset;
        newCaretPosition = caretOffset + "  ".repeat(indentLevel).length + relativeCaretPos;
      }

      caretOffset += line.length + 1; // +1 for the newline character
    });

    return { newBuffer, newCaretPosition };
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter") {
      //e.preventDefault();

      const { selectionStart } = e.currentTarget;
      const currentValue = e.currentTarget.value;

      // Re-indent the entire buffer and calculate the new caret position
      const { newBuffer, newCaretPosition } = autoIndentBuffer(currentValue, selectionStart);

      // Update the text in the textarea with the re-indented buffer
      setText(newBuffer);
      const { currentTarget } = e;

      // Move the caret to the correct position after re-indenting
      setTimeout(() => {
        currentTarget.selectionStart = currentTarget.selectionEnd = newCaretPosition + 1;
      }, 0);
    }
  };
  const highlightMatchingParentheses = (text: string, cursorPos: number) => {
    const openIndex = text.lastIndexOf("(", cursorPos);
    const closeIndex = text.indexOf(")", openIndex);

    if (openIndex !== -1 && closeIndex !== -1) {
      const beforeOpen = text.slice(0, openIndex);
      const between = text.slice(openIndex + 1, closeIndex);
      const afterClose = text.slice(closeIndex + 1);

      return `${beforeOpen}(<mark>${between}</mark>)${afterClose}`;
    }
    return text;
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const cursorPos = e.currentTarget.selectionStart;
    const highlighted = highlightMatchingParentheses(text, cursorPos);
    setHighlightedText(highlighted);
  };

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
          {text + " "}
        </SyntaxHighlighter>
      </div>
      <textarea
        ref={textAreaRef}
        spellCheck="false"
        className="outline-none w-full h-full bg-transparent text-transparent caret-white p-2"
        value={text}
        onChange={handleChange}
        onKeyUp={handleKeyUp} // Handle parentheses highlighting
        onKeyDown={handleKeyDown} // Handle Enter key for auto-indent
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
