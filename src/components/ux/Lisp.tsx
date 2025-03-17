import React, { useState, useEffect, useRef } from "react";
import { useLocked } from "@/contexts/LockedContext";
import { useSelection } from "@/contexts/SelectionContext";
import type { ObjectNode } from "@/lib/nodes/types";
import Editor, { useMonaco } from "@monaco-editor/react";
import type * as Monaco from "monaco-editor";

const Lisp: React.FC<{
  objectNode: ObjectNode;
  fullscreen: boolean;
  setFullScreen: (x: boolean) => void;
}> = ({ objectNode, setFullScreen, fullscreen }) => {
  const monaco = useMonaco();
  // Contexts for locked mode and selection
  const { lockedMode: _lockedMode, setLockedMode } = useLocked();
  const lockedMode = fullscreen ? true : _lockedMode;
  const { selectedNodes, setSelectedNodes } = useSelection();

  const lockedModeRef = useRef(lockedMode);
  const fullScreenRef = useRef(fullscreen);
  useEffect(() => {
    lockedModeRef.current = lockedMode;
  }, [lockedMode]);
  useEffect(() => {
    fullScreenRef.current = fullscreen;
  }, [fullscreen]);

  // State management
  const [text, setText] = useState(objectNode.script || "");
  const [commandMode, setCommandMode] = useState(false);
  const [clipboard, setClipboard] = useState("");
  const [flash, setFlash] = useState(false);
  const [prefix, setPrefix] = useState("");

  // Refs for editor instance and context key
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const commandModeKeyRef = useRef<Monaco.editor.IContextKey<boolean> | null>(null);

  // Sync command mode with context key
  useEffect(() => {
    if (commandModeKeyRef.current) {
      commandModeKeyRef.current.set(commandMode);
    }
  }, [commandMode]);

  // Sync text with objectNode.script
  useEffect(() => {
    setText(objectNode.script || "");
  }, [objectNode.script]);

  useEffect(() => {
    if (monaco && editorRef.current) handleEditorDidMount(editorRef.current);
  }, [monaco]);

  // Editor initialization
  const handleEditorDidMount = (editor: Monaco.editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;
    if (!monaco) return;
    monaco.editor.setTheme("vs-dark");
    commandModeKeyRef.current = editor.createContextKey("commandMode", false);

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyE, () => {
      setLockedMode(!lockedModeRef.current);
    });

    // Enter command mode with Escape
    editor.addCommand(monaco.KeyCode.Escape, () => {
      setCommandMode(true);
      setPrefix("");
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF, () => {
      setFullScreen(!fullScreenRef.current);
    });

    // Flash effect and message on Meta+Enter
    editor.addCommand(monaco.KeyMod.WinCtrl | monaco.KeyCode.Enter, () => {
      setFlash(true);
      setTimeout(() => setFlash(false), 500);
      objectNode.receive(objectNode.inlets[0], objectNode.inlets[0].lastMessage || "bang");
    });
  };

  // Size determination
  const { width, height } = fullscreen
    ? { width: "100%", height: "100%" }
    : objectNode.size || { width: 100, height: 100 };

  return (
    <div
      onClick={() => setSelectedNodes([objectNode])}
      style={{ width, height }}
      className={`bg-zinc-800 relative flex ${flash ? "flash" : ""} ${commandMode ? "command-mode" : ""}`}
    >
      {objectNode.attributes["hide-code"] ? (
        <div className="m-auto text-white">code</div>
      ) : (
        <>
          <Editor
            height={height}
            width={width}
            language={objectNode.name === "lisp" ? "scheme" : "javascript"} // Use 'javascript' for now; see below for Lisp customization
            value={text}
            onChange={(value) => {
              setText(value || "");
              objectNode.script = value || "";
              objectNode.updateWorkerState();
            }}
            onMount={handleEditorDidMount}
            options={{
              theme: "vs-dark", // Dark mode
              lineNumbers: "off", // This removes the line numbers
              readOnly: !lockedMode,
              fontFamily: "monospace",
              fontSize: (objectNode.attributes["font-size"] as number) || 14,
              lineHeight: 1.5 * ((objectNode.attributes["font-size"] as number) || 14),
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
            }}
          />
          {objectNode.lispError && (
            <div className="text-white bg-red-500 absolute bottom-0 left-0 z-30 p-1">
              {objectNode.lispError.message}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Lisp;
