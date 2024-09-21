import React, { useRef, useCallback, useEffect, useState } from "react";
import { useLocked } from "@/contexts/LockedContext";
import { useSelection } from "@/contexts/SelectionContext";
import { ObjectNode } from "@/lib/nodes/types";
import { usePosition } from "@/contexts/PositionContext";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { materialDark } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { useValue } from "@/contexts/ValueContext";

const Lisp: React.FC<{ objectNode: ObjectNode }> = ({ objectNode }) => {
  const { attributesIndex } = useSelection();
  const { lockedMode } = useLocked();
  usePosition();
  const [text, setText] = useState(objectNode.script || "");
  const [animate, setAnimate] = useState(false);
  const { value } = useValue();
  const current = useRef(0);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const syntaxHighlighterRef = useRef<HTMLDivElement>(null);

  const { width, height } = objectNode.size || { width: 100, height: 100 };
  const fontStyles = {
    fontFamily: "monospace",
    fontSize: `${objectNode.attributes["font-size"] as number}px`,
    lineHeight: "1.5",
  };

  useEffect(() => {
    setAnimate(false);
    current.current = value as number;
    setTimeout(() => {
      const element = textAreaRef.current;
      element && (element as any).offsetWidth;
      setAnimate(true);
      setTimeout(() => {
        if (current.current !== value) {
          setAnimate(false);
        }
      }, 500);
    }, 3);
  }, [value]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newText = e.target.value;
      objectNode.script = newText;
      setText(newText);
    },
    [objectNode],
  );

  const isSpecialForm = (line: string): boolean => {
    const specialForms = [
      "defun",
      "let",
      "if",
      "lambda",
      "setq",
      "progn",
      "cond",
      "when",
      "unless",
    ];
    return specialForms.some((form) => line.trim().startsWith(`(${form}`));
  };

  const getIndentation = (
    line: string,
    previousIndentLevel: number,
    isInSpecialForm: boolean,
  ): number => {
    const trimmedLine = line.trim();
    const openParenCount = (trimmedLine.match(/\(/g) || []).length;
    const closeParenCount = (trimmedLine.match(/\)/g) || []).length;

    if (isSpecialForm(trimmedLine)) {
      return previousIndentLevel;
    }

    if (isInSpecialForm) {
      return Math.max(0, previousIndentLevel + 1);
    }

    return Math.max(0, previousIndentLevel + openParenCount - closeParenCount);
  };

  const getLineIndentation = (line: string): number => {
    const match = line.match(/^\s*/);
    return match ? match[0].length : 0;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();

      const { selectionStart, value } = e.currentTarget;
      const lines = value.split("\n");
      let currentLineIndex = 0;
      let currentPosition = 0;

      // Find the current line
      while (currentPosition + lines[currentLineIndex].length < selectionStart) {
        currentPosition += lines[currentLineIndex].length + 1;
        currentLineIndex++;
      }

      const currentLine = lines[currentLineIndex];
      const currentLineIndentation = getLineIndentation(currentLine);

      // Determine the indentation level for the new line
      let newLineIndentation = currentLineIndentation;
      if (isSpecialForm(currentLine.trim())) {
        newLineIndentation += 2; // Increase indentation for special forms
      } else if (currentLine.trim().endsWith("(")) {
        newLineIndentation += 2; // Increase indentation after opening parenthesis
      }

      // Insert the new line with proper indentation
      const newLine = "\n" + " ".repeat(newLineIndentation);
      const newValue = value.slice(0, selectionStart) + newLine + value.slice(selectionStart);
      setText(newValue);

      // Set the new cursor position
      setTimeout(() => {
        if (textAreaRef.current) {
          const newCursorPosition = selectionStart + newLine.length;
          textAreaRef.current.selectionStart = textAreaRef.current.selectionEnd = newCursorPosition;
        }
      }, 0);
    } else if (e.key === "Tab") {
      e.preventDefault();
      const { selectionStart, selectionEnd, value } = e.currentTarget;
      const newValue = value.substring(0, selectionStart) + "  " + value.substring(selectionEnd);
      setText(newValue);
      setTimeout(() => {
        if (textAreaRef.current) {
          textAreaRef.current.selectionStart = textAreaRef.current.selectionEnd =
            selectionStart + 2;
        }
      }, 0);
    }
  };

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
  }, [text, lockedMode]);

  return (
    <div style={{ width, height }} className="bg-zinc-800 relative">
      <div
        ref={syntaxHighlighterRef}
        style={{
          padding: "5px",
          width,
          height,
          whiteSpace: "pre-wrap",
          overflow: "hidden",
          pointerEvents: "none",
          ...fontStyles,
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
            whiteSpace: "pre-wrap",
            padding: 0,
            overflowX: "hidden",
            width,
            overflowWrap: "break-word",
            wordWrap: "break-word",
            ...fontStyles,
          }}
        >
          {text + " "}
        </SyntaxHighlighter>
      </div>
      {lockedMode && (
        <textarea
          ref={textAreaRef}
          spellCheck={false}
          className="outline-none w-full h-full bg-transparent text-transparent caret-white p-2"
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width,
            height,
            color: "transparent",
            background: "transparent",
            caretColor: "white",
            padding: "5px",
            margin: 0,
            border: "none",
            whiteSpace: "pre-wrap",
            overflowWrap: "break-word",
            wordWrap: "break-word",
            overflow: "auto",
            ...fontStyles,
          }}
        />
      )}
      <div
        style={{ zIndex: 10000000 }}
        className={`w-2 h-2 rounded-full transition-all ${animate ? "bg-lime-500" : ""} top-1 right-1 absolute`}
      />
    </div>
  );
};

export default Lisp;
