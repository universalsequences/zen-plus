import React, { useRef, useCallback, useEffect, useState } from "react";
import { useLocked } from "@/contexts/LockedContext";
import { useSelection } from "@/contexts/SelectionContext";
import type { ObjectNode } from "@/lib/nodes/types";
import { usePosition } from "@/contexts/PositionContext";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { nightOwl } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { useValue } from "@/contexts/ValueContext";
import { Syntax } from "./Syntax";

const Lisp: React.FC<{ objectNode: ObjectNode; fullscreen: boolean }> = ({
  objectNode,
  fullscreen,
}) => {
  useSelection();
  const { lockedMode: _lockedMode } = useLocked();
  const lockedMode = fullscreen ? true : _lockedMode;
  usePosition();
  const [text, setText] = useState(objectNode.script || "");
  const { selectedNodes, setSelectedNodes } = useSelection();
  const current = useRef(0);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const syntaxHighlighterRef = useRef<HTMLDivElement>(null);
  const syntaxRef = useRef<HTMLPreElement>(null);

  const { width, height } = fullscreen
    ? { width: "100%", height: "100%" }
    : objectNode.size || { width: 100, height: 100 };
  const fontStyles = {
    fontFamily: "monospace",
    fontSize: `${objectNode.attributes["font-size"] as number}px`,
    lineHeight: "1.5",
  };

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

  const [flash, setFlash] = useState(false);

  const getLineIndentation = (line: string): number => {
    const match = line.match(/^\s*/);
    return match ? match[0].length : 0;
  };

  const [cursor, setCursor] = useState(0);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();

      if (e.metaKey) {
        console.log("sending code");
        // in this case we want to flash and re-send
        setFlash(true);
        setTimeout(() => {
          setFlash(false);
        }, 500);
        objectNode.receive(objectNode.inlets[0], objectNode.inlets[0].lastMessage || "bang");
        return;
      }

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
    } else {
    }
  };

  const handleKeyUp = useCallback(() => {
    setTimeout(() => {
      if (textAreaRef.current) {
        setCursor(textAreaRef.current.selectionStart);
      }
      syncScroll();
    }, 0);
  }, []);

  const syncScroll = (e?: Event) => {
    e?.stopPropagation();
    if (textAreaRef.current && syntaxHighlighterRef.current && syntaxRef.current) {
      const child = syntaxHighlighterRef.current.childNodes[0] as HTMLDivElement;
      if (child) {
        child.scrollTop = textAreaRef.current.scrollTop;
        child.scrollLeft = textAreaRef.current.scrollLeft;
        textAreaRef.current.scrollTop = child.scrollTop;
        textAreaRef.current.scrollLeft = child.scrollLeft;
      }
      syntaxRef.current.scrollTop = textAreaRef.current.scrollTop;
      syntaxRef.current.scrollLeft = textAreaRef.current.scrollLeft;

      if (child) {
        child.scrollTop = syntaxRef.current.scrollTop;
        child.scrollLeft = syntaxRef.current.scrollLeft;
        textAreaRef.current.scrollTop = syntaxRef.current.scrollTop;
        textAreaRef.current.scrollLeft = syntaxRef.current.scrollLeft;
      }
    } else if (syntaxHighlighterRef.current && syntaxRef.current) {
      const child = syntaxHighlighterRef.current.childNodes[0] as HTMLDivElement;
      if (child) {
        child.scrollLeft = 0;
        child.scrollTop = 0;
      }
      syntaxRef.current.scrollLeft = 0;
      syntaxRef.current.scrollTop = 0;
    } else {
    }
  };

  useEffect(() => {
    const textarea = textAreaRef.current;
    syncScroll();
    if (textarea && syntaxHighlighterRef.current) {
      textarea.addEventListener("scroll", syncScroll);
      syntaxHighlighterRef.current.addEventListener("scroll", syncScroll);
      return () => {
        textarea.removeEventListener("scroll", syncScroll);
        syntaxHighlighterRef.current?.removeEventListener("scroll", syncScroll);
      };
    }
  }, [text, lockedMode]);

  return (
    <div
      onClick={(_e: React.MouseEvent<HTMLDivElement>) => {
        handleKeyUp();
        setSelectedNodes([objectNode]);
      }}
      onMouseDown={(_e: React.MouseEvent<HTMLDivElement>) => {
        //const isSelected = selectedNodes?.includes(objectNode);
        //if (isSelected) e.stopPropagation();
      }}
      style={{ width, height }}
      className={`bg-zinc-800 relative flex ${flash ? "flash" : ""}`}
    >
      {objectNode.attributes["hide-code"] ? (
        <div className="m-auto text-white">code</div>
      ) : (
        <>
          <div
            ref={syntaxHighlighterRef}
            style={{
              padding: "0px",
              width,
              height,
              //whiteSpace: "pre-wrap",
              overflow: "hidden",
              ...fontStyles,
            }}
          >
            <SyntaxHighlighter
              language="lisp"
              style={nightOwl}
              customStyle={{
                margin: 0,
                //whiteSpace: "pre-wrap",
                padding: 0,
                pointerEvents: "none",
                overflow: "auto",
                width,
                height,
                //overflowWrap: "break-word",
                //wordWrap: "break-word",
                ...fontStyles,
              }}
            >
              {text + " "}
            </SyntaxHighlighter>
          </div>
          <textarea
            ref={textAreaRef}
            spellCheck={false}
            className={`${!lockedMode ? "no-selected" : ""} outline-none w-full h-full bg-transparent text-transparent caret-white p-2`}
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onKeyUp={handleKeyUp}
            style={{
              pointerEvents: !lockedMode ? "none" : undefined,
              position: "absolute",
              top: 0,
              padding: 0,
              left: 0,
              width,
              height,
              color: "transparent",
              background: "transparent",
              caretColor: "white",
              whiteSpace: "nowrap",
              margin: 0,
              border: "none",
              overflow: "auto",
              overflowX: "scroll",
              ...fontStyles,
            }}
          />

          <pre
            ref={syntaxRef}
            className="no-scrollbar"
            style={{
              padding: "0px",
              width,
              height,
              ...fontStyles,
              position: "absolute",
              pointerEvents: "none",
              top: 0,
              left: 0,
              margin: 0,
              overflow: "auto",
              color: "transparent",
            }}
          >
            <Syntax width={width} height={height} text={text} cursor={cursor} style={fontStyles} />
          </pre>
        </>
      )}
    </div>
  );
};

export default Lisp;
