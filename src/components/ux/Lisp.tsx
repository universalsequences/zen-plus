import React, { useRef, useCallback, useEffect, useState } from "react";
import { useLocked } from "@/contexts/LockedContext";
import { useSelection } from "@/contexts/SelectionContext";
import type { ObjectNode } from "@/lib/nodes/types";
import { usePosition } from "@/contexts/PositionContext";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { nightOwl } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { useValue } from "@/contexts/ValueContext";
import { Syntax, ErrorSyntax } from "./Syntax";

const Lisp: React.FC<{ objectNode: ObjectNode; fullscreen: boolean }> = ({
  objectNode,
  fullscreen,
}) => {
  useSelection();
  const { lockedMode: _lockedMode } = useLocked();
  const lockedMode = fullscreen ? true : _lockedMode;
  useValue();
  usePosition();
  const [text, setText] = useState(objectNode.script || "");
  const { selectedNodes, setSelectedNodes } = useSelection();
  const current = useRef(0);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const syntaxHighlighterRef = useRef<HTMLDivElement>(null);
  const syntaxRef = useRef<HTMLPreElement>(null);
  const [commandMode, setCommandMode] = useState(false);
  const [clipboard, setClipboard] = useState("");
  const [yankCount, setYankCount] = useState("");

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
      objectNode.lispError = undefined;
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

  const getCurrentLineNumber = () => {
    if (!textAreaRef.current) return 0;
    const value = textAreaRef.current.value;
    const lines = value.slice(0, cursor).split("\n");
    return lines.length - 1;
  };

  const moveCursor = (direction: "left" | "right" | "up" | "down") => {
    if (!textAreaRef.current) return;
    const value = textAreaRef.current.value;
    const lines = value.split("\n");
    const currentLine = getCurrentLineNumber();
    const currentCol = cursor - value.slice(0, cursor).lastIndexOf("\n") - 1;

    let newCursor = cursor;
    switch (direction) {
      case "left":
        newCursor = Math.max(0, cursor - 1);
        break;
      case "right":
        newCursor = Math.min(value.length, cursor + 1);
        break;
      case "up":
        if (currentLine > 0) {
          // Get position at start of current line
          const currentLineStart =
            value.split("\n").slice(0, currentLine).join("\n").length + (currentLine > 0 ? 1 : 0);
          // Get length of previous line
          const prevLineLength = lines[currentLine - 1].length;
          // Get position at start of previous line
          const prevLineStart =
            value
              .split("\n")
              .slice(0, currentLine - 1)
              .join("\n").length + (currentLine > 1 ? 1 : 0);
          // Move cursor to same column in previous line, or end of line if shorter
          newCursor = prevLineStart + Math.min(currentCol, prevLineLength);
        }
        break;
      case "down":
        if (currentLine < lines.length - 1) {
          const nextLineLength = lines[currentLine + 1].length;
          const currentLineEnd =
            value
              .split("\n")
              .slice(0, currentLine + 1)
              .join("\n").length + 1;
          newCursor = currentLineEnd + Math.min(currentCol, nextLineLength);
        }
        break;
    }

    setCursor(newCursor);
    if (textAreaRef.current) {
      textAreaRef.current.selectionStart = textAreaRef.current.selectionEnd = newCursor;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setCommandMode(true);
      setYankCount("");
      return;
    }

    if (commandMode) {
      e.preventDefault();

      if (/[0-9]/.test(e.key)) {
        setYankCount((prev) => prev + e.key);
        return;
      }

      switch (e.key) {
        case "h":
          moveCursor("left");
          break;
        case "l":
          moveCursor("right");
          break;
        case "j":
          moveCursor("down");
          break;
        case "k":
          moveCursor("up");
          break;
        case "d": {
          if (e.repeat) break;
          const value = textAreaRef.current?.value || "";
          const lines = value.split("\n");
          const currentLine = getCurrentLineNumber();
          if (currentLine >= 0 && currentLine < lines.length) {
            setClipboard(lines[currentLine]);
            const newLines = [...lines];
            newLines.splice(currentLine, 1);
            const newText = newLines.join("\n");
            setText(newText);
            objectNode.script = newText;
          }
          break;
        }
        case "y": {
          if (e.repeat) break;
          const val = textAreaRef.current?.value || "";
          const allLines = val.split("\n");
          const curLine = getCurrentLineNumber();
          const numLines = yankCount ? parseInt(yankCount) : 1;
          if (curLine >= 0 && curLine + numLines <= allLines.length) {
            const yankedLines = allLines.slice(curLine, curLine + numLines).join("\n");
            setClipboard(yankedLines);
          }
          setYankCount("");
          break;
        }
        case "p": {
          if (!clipboard) break;
          const txt = textAreaRef.current?.value || "";
          const txtLines = txt.split("\n");
          const curLineNum = getCurrentLineNumber();
          const newLines = [...txtLines];
          newLines.splice(curLineNum + 1, 0, clipboard);
          const newText = newLines.join("\n");
          setText(newText);
          objectNode.script = newText;
          break;
        }
        case "i":
          setCommandMode(false);
          break;
      }
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();

      if (e.metaKey) {
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

      while (currentPosition + lines[currentLineIndex].length < selectionStart) {
        currentPosition += lines[currentLineIndex].length + 1;
        currentLineIndex++;
      }

      const currentLine = lines[currentLineIndex];
      const currentLineIndentation = getLineIndentation(currentLine);

      let newLineIndentation = currentLineIndentation;
      if (isSpecialForm(currentLine.trim())) {
        newLineIndentation += 2;
      } else if (currentLine.trim().endsWith("(")) {
        newLineIndentation += 2;
      }

      const newLine = `\n${" ".repeat(newLineIndentation)}`;
      const newValue = `${value.slice(0, selectionStart)}${newLine}${value.slice(selectionStart)}`;
      setText(newValue);

      setTimeout(() => {
        if (textAreaRef.current) {
          const newCursorPosition = selectionStart + newLine.length;
          textAreaRef.current.selectionStart = textAreaRef.current.selectionEnd = newCursorPosition;
        }
      }, 0);
    } else if (e.key === "Tab") {
      e.preventDefault();
      const { selectionStart, selectionEnd, value } = e.currentTarget;
      const newValue = `${value.substring(0, selectionStart)}  ${value.substring(selectionEnd)}`;
      setText(newValue);
      setTimeout(() => {
        if (textAreaRef.current) {
          textAreaRef.current.selectionStart = textAreaRef.current.selectionEnd =
            selectionStart + 2;
        }
      }, 0);
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
      className={`bg-zinc-800 relative flex ${flash ? "flash" : ""} ${commandMode ? "command-mode" : ""}`}
    >
      {objectNode.lispError && (
        <div className="text-white bg-red-500 absolute bottom-0 z-30 left-0">
          {objectNode.lispError.message}
        </div>
      )}
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
              overflow: "hidden",
              ...fontStyles,
            }}
          >
            <SyntaxHighlighter
              language="lisp"
              style={nightOwl}
              customStyle={{
                margin: 0,
                padding: 0,
                pointerEvents: "none",
                overflow: "auto",
                width,
                height,
                ...fontStyles,
              }}
            >
              {`${text} `}
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
              caretColor: commandMode ? "red" : "white",
              whiteSpace: "nowrap",
              margin: 0,
              border: "none",
              overflow: "auto",
              overflowX: "scroll",
              ...fontStyles,
            }}
          />

          {!flash && (
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
              {objectNode.lispError ? (
                <ErrorSyntax
                  width={width}
                  height={height}
                  text={text}
                  cursor={cursor}
                  lispError={objectNode.lispError}
                  style={fontStyles}
                />
              ) : (
                <Syntax
                  width={width}
                  height={height}
                  text={text}
                  cursor={cursor}
                  style={fontStyles}
                />
              )}
            </pre>
          )}
        </>
      )}
    </div>
  );
};

export default Lisp;
