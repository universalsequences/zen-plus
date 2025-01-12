import React, { useRef, useState, useEffect, useCallback } from "react";
import UXView from "./ux/UXView";
import SlotView from "./SlotView";
import type { File } from "@/lib/files/types";
import type { TypeError, TypeSuccess } from "@/lib/nodes/typechecker";
import { useValue } from "@/contexts/ValueContext";
import ObjectNodeImpl from "@/lib/nodes/ObjectNode";
import { type OperatorContext, OperatorContextType, getOperatorContext } from "@/lib/nodes/context";
import type { ContextDefinition } from "@/hooks/useAutoComplete";
import AutoCompletes from "./AutoCompletes";
import { index, type NodeProps } from "./ux/index";
import { ContextMenu } from "@radix-ui/themes";
import { type SizeIndex, usePosition, type DraggingNode } from "@/contexts/PositionContext";
import { usePatches } from "@/contexts/PatchesContext";
import { useLocked } from "@/contexts/LockedContext";
import { useSubPatchLoader } from "@/hooks/useSubPatchLoader";
import PositionedComponent from "./PositionedComponent";
import type { ObjectNode, Patch, Coordinate, Size, MessageNode } from "@/lib/nodes/types";
import { useSelection } from "@/contexts/SelectionContext";
import { useAutoComplete } from "@/hooks/useAutoComplete";
import { usePatch } from "@/contexts/PatchContext";
import CustomSubPatchView from "./CustomSubPatchView";
import { useStorage } from "@/contexts/StorageContext";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import type { Definition } from "@/lib/docs/docs";

const ObjectNodeComponent: React.FC<{ position?: string; objectNode: ObjectNode }> = ({
  objectNode,
  position,
}) => {
  const { setSelection, selectedNodes, setSelectedNodes } = useSelection();
  const { updatePosition, sizeIndexRef } = usePosition();
  const { value } = useValue();
  const { lockedMode } = useLocked();
  const lockedModeRef = useRef(lockedMode);
  const errorMessage =
    objectNode.operatorContextType === OperatorContextType.CORE ? undefined : value;

  useEffect(() => {
    lockedModeRef.current = lockedMode;
  }, [lockedMode]);

  const isSelected = selectedNodes.includes(objectNode);

  // Handle patch selection effects
  useEffect(() => {
    if (isSelected) {
      objectNode.subpatch?.objectNodes
        .filter((x) => x.name === "onPatchSelect")
        .forEach((n) => n.receive(n.inlets[0], "bang"));
    }
  }, [isSelected, objectNode]);

  return (
    <InnerObjectNodeComponent
      position={position}
      lockedModeRef={lockedModeRef}
      sizeIndexRef={sizeIndexRef}
      objectNode={objectNode}
      setSelection={setSelection}
      size={objectNode.size || null}
      setSelectedNodes={setSelectedNodes}
      updatePosition={updatePosition}
      isSelected={isSelected}
      typeError={errorMessage as TypeError | undefined}
    />
  );
};

const InnerObjectNodeComponent: React.FC<{
  typeError: TypeSuccess | TypeError | undefined;
  setSelection: any;
  size: Size | null;
  isSelected: boolean;
  lockedModeRef: React.MutableRefObject<boolean>;
  sizeIndexRef: React.MutableRefObject<SizeIndex>;
  updatePosition: (id: string, position: Coordinate) => void;
  setSelectedNodes: React.Dispatch<React.SetStateAction<(ObjectNode | MessageNode)[]>>;
  objectNode: ObjectNode;
  position?: string;
}> = ({
  position,
  typeError,
  updatePosition,
  size,
  setSelection,
  lockedModeRef,
  sizeIndexRef,
  isSelected,
  objectNode,
  setSelectedNodes,
}) => {
  if (isSelected) {
    //console.log("selected", objectNode);
  }
  const [fullscreen, setFullscreen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const lastSubPatchClick = useRef(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [selected, setSelected] = useState(0);
  const { fetchSubPatchForDoc } = useStorage();
  const [documentation, setDocumentation] = useState<Definition | null>(null);
  const { isCustomView, newObjectNode } = usePatch();
  const [editing, setEditing] = useState(objectNode.text === "");
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState(
    objectNode.subpatch
      ? objectNode.text.replace("zen", objectNode.subpatch.name || "zen")
      : objectNode.text,
  );
  const { setSelectedPatch, expandPatch, patchNames } = usePatches();
  const [parsedText, setParsedText] = useState("");
  const [includeInPresentation, setIncludeInPresentation] = useState(
    objectNode.attributes["Include in Presentation"],
  );
  const { loadSubPatch } = useSubPatchLoader(objectNode);
  const { setAutoCompletes, autoCompletes } = useAutoComplete(text, objectNode, editing);
  const initialPosition = useRef<Coordinate | null>(null);
  const clicked = useRef(false);

  // Load documentation
  useEffect(() => {
    if (objectNode.name && objectNode.operatorContextType !== undefined) {
      const doc = getOperatorContext(objectNode.operatorContextType).lookupDoc(objectNode.name);
      setDocumentation(doc || null);
    }
  }, [objectNode.name]);

  // Update text when patch name changes
  useEffect(() => {
    if (objectNode.subpatch?.id && patchNames[objectNode.subpatch.id]) {
      setText(patchNames[objectNode.subpatch.id]);
    }
  }, [patchNames]);

  // Handle initial editing state
  useEffect(() => {
    if (objectNode.text === "" && objectNode.justCreated) {
      setSelectedNodes([objectNode]);
      setTimeout(() => {
        setEditing(true);
        objectNode.justCreated = false;
      }, 10);
    }
  }, []);

  // Focus input on edit
  useEffect(() => {
    if (inputRef.current && editing && (clicked.current || objectNode.created)) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
        objectNode.created = false;
      }, 10);
    }
  }, [editing]);

  // Clear editing when deselected
  useEffect(() => {
    if (!isSelected && !objectNode.justCreated) setEditing(false);
  }, [isSelected]);

  const onChange = useCallback((value: string) => {
    setText(value);
    setSelected(0);
  }, []);

  const enterText = useCallback(async (text: string, context?: OperatorContext, file?: File) => {
    context = context || getOperatorContext(OperatorContextType.ZEN);
    let success = true;

    if (file) {
      const serializedSubPatch = await fetchSubPatchForDoc(file.id);
      if (serializedSubPatch) {
        await loadSubPatch(serializedSubPatch, file.name);
      }
      success = true;
    } else {
      success = objectNode.parse(text, context.type);
    }

    if (success || file) {
      setError(null);
      setEditing(false);
      setParsedText(text);
    } else {
      setError("function not found");
    }
  }, []);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        setSelected((prev) => {
          if (e.key === "ArrowUp") return Math.max(0, prev - 1);
          return Math.max(0, prev + 1) % autoCompletes.length;
        });
        return;
      }

      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        if (autoCompletes[selected]) {
          const def = autoCompletes[selected];
          let name = (def.definition.alias || def.definition.name) as string;
          if (text.split(" ")[0] === name || objectNode.text.split(" ")[0] === name) {
            name = text;
          }
          setText(name);
          setAutoCompletes([]);
          if (e.key === "Enter") {
            enterText(name, def.context, def.definition.file);
          }
        } else if (e.key === "Enter") {
          enterText(text);
        }
      }
    },
    [text, selected, autoCompletes, enterText],
  );

  const togglePresentation = useCallback(() => {
    const newValue = !objectNode.attributes["Include in Presentation"];
    objectNode.setAttribute("Include in Presentation", newValue);
    setIncludeInPresentation(newValue);
    objectNode.presentationPosition = { ...objectNode.position };
  }, [objectNode]);

  const duplicate = useCallback(() => {
    const copied = new ObjectNodeImpl(objectNode.patch);

    if (objectNode.name === "zen") {
      const typeMap: { [x: number]: string } = {
        [OperatorContextType.ZEN]: "zen",
        [OperatorContextType.GL]: "gl",
        [OperatorContextType.CORE]: "core",
        [OperatorContextType.AUDIO]: "audio",
      };
      const attr = objectNode.subpatch ? ` @type ${typeMap[objectNode.subpatch.patchType]}` : "";

      copied.parse("zen" + attr);
      const json = objectNode.getJSON();
      if (copied.subpatch && json.subpatch) {
        copied.subpatch.fromJSON(json.subpatch, true);
        copied.attributes = { ...copied.attributes, ...json.attributes };
        copied.size = json.size;
      }
    } else {
      const size = objectNode.size;
      copied.parse(objectNode.text, objectNode.operatorContextType, false);
      if (size) copied.size = { ...size };
    }

    copied.position = {
      x: objectNode.position.x + sizeIndexRef.current[objectNode.id].width + 15,
      y: objectNode.position.y,
    };
    newObjectNode(copied, copied.position);
    updatePosition(copied.id, copied.position);
  }, [objectNode, newObjectNode, updatePosition]);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.shiftKey || isCustomView || lockedModeRef.current || e.button === 2) return;

      const now = Date.now();
      const isDoubleClick = now - lastSubPatchClick.current < 250;
      lastSubPatchClick.current = now;

      setSelection(null);

      if (editing) {
        e.stopPropagation();
        return;
      }

      if (isSelected || objectNode.text === "") {
        const samePosition =
          initialPosition.current &&
          initialPosition.current.x === objectNode.position.x &&
          initialPosition.current.y === objectNode.position.y;

        if (objectNode.text === "" || samePosition) {
          if (objectNode.text === "") e.stopPropagation();

          if (
            (objectNode.name === "zen" || objectNode.name === "p") &&
            objectNode.subpatch &&
            !objectNode.attributes.slotview &&
            isDoubleClick
          ) {
            e.stopPropagation();
            expandPatch(objectNode);
            return;
          }

          if (!objectNode.name || !index[objectNode.name]) {
            clicked.current = true;
            setEditing(true);
            setSelectedNodes([objectNode]);
          }
        }
      }

      if (!editing) {
        initialPosition.current = { ...objectNode.position };
      }
    },
    [editing, objectNode, isSelected, isCustomView],
  );

  const showExample = useCallback(async (examplePatch: string) => {
    const serializedSubPatch = await fetchSubPatchForDoc(examplePatch);
    if (!serializedSubPatch) return;

    const type = serializedSubPatch.attributes?.type || "zen";
    const node = new ObjectNodeImpl(objectNode.patch);
    node.parse(`zen @type ${type}`, OperatorContextType.ZEN, true, serializedSubPatch);
    node.position = { x: 100, y: 100 };

    if (node.subpatch) {
      node.subpatch.name = `example (${objectNode.name})`;
    }

    expandPatch(node);
    setTimeout(() => node.subpatch?.recompileGraph(true), 1000);
  }, []);

  const CustomComponent = objectNode.name
    ? (index[objectNode.name] as React.ComponentType<NodeProps>)
    : undefined;
  const isCustomSubPatchView = objectNode.attributes["Custom Presentation"];
  const { slotview, ux } = objectNode.attributes;
  const showUX = ux && objectNode.name !== "matrix";
  const splitText = text.split(" ");

  return (
    <PositionedComponent
      position={position}
      fullscreen={fullscreen}
      isHydrated={objectNode.lastSentMessage !== undefined}
      isCustomView={isCustomView}
      text={parsedText}
      lockedModeRef={lockedModeRef}
      isError={
        (!CustomComponent && typeError && !(typeError as TypeSuccess).success) || error !== null
      }
      skipOverflow={
        showUX ||
        error !== null ||
        (typeError && !(typeError as TypeSuccess).success) ||
        (editing && autoCompletes.length > 0)
      }
      node={objectNode}
    >
      <ContextMenu.Root>
        <ContextMenu.Content
          onMouseDown={(e: any) => e.stopPropagation()}
          style={{ zIndex: 10000000000000 }}
          color="indigo"
          className="object-context rounded-lg p-2 text-xs"
        >
          {objectNode.name === "zen" && (
            <ContextMenu.Item
              onClick={() => expandPatch(objectNode)}
              className="text-white hover:bg-white hover:text-black px-2 py-1 outline-none cursor-pointer"
            >
              Expand Patch
            </ContextMenu.Item>
          )}
          <ContextMenu.Item
            onClick={togglePresentation}
            className="text-white hover:bg-white hover:text-black px-2 py-1 outline-none cursor-pointer"
          >
            {!objectNode.attributes["Include in Presentation"]
              ? "Include in Presentation"
              : "Remove from Presentation"}
          </ContextMenu.Item>
          <ContextMenu.Item
            onClick={duplicate}
            className="text-white hover:bg-white hover:text-black px-2 py-1 outline-none cursor-pointer"
          >
            Duplicate
          </ContextMenu.Item>
          <ContextMenu.Item
            onClick={() => setSelectedNodes([objectNode])}
            className="text-white hover:bg-white hover:text-black px-2 py-1 outline-none cursor-pointer"
          >
            Select
          </ContextMenu.Item>
          {(objectNode.name === "wasmviewer" || objectNode.name === "lisp") && (
            <ContextMenu.Item
              onClick={() => setFullscreen(!fullscreen)}
              className="text-white hover:bg-white hover:text-black px-2 py-1 outline-none cursor-pointer"
            >
              {fullscreen ? "Exit Full-Screen" : "Full-Screen"}
            </ContextMenu.Item>
          )}
          {documentation?.examplePatch && (
            <ContextMenu.Item
              onClick={() => showExample(documentation.examplePatch as string)}
              className="text-white hover:bg-white hover:text-black px-2 py-1 outline-none cursor-pointer flex"
            >
              Help <InfoCircledIcon className="w-4 h-4 ml-2" />
            </ContextMenu.Item>
          )}
        </ContextMenu.Content>
        <ContextMenu.Trigger disabled={isCustomView} className="ContextMenuTrigger relative">
          <div
            ref={ref}
            onMouseDown={onMouseDown}
            className="flex h-full w-full flex-1 whitespace-nowrap"
          >
            {showUX ? (
              <UXView objectNode={objectNode} />
            ) : slotview ? (
              <SlotView objectNode={objectNode} />
            ) : isCustomSubPatchView ? (
              <CustomSubPatchView objectNode={objectNode} />
            ) : CustomComponent ? (
              <CustomComponent fullscreen={fullscreen} objectNode={objectNode} />
            ) : editing ? (
              <>
                <input
                  autoComplete="off"
                  autoCorrect="off"
                  onClick={(e) => e.stopPropagation()}
                  ref={inputRef}
                  onKeyDown={onKeyDown}
                  style={{
                    width: Math.max(
                      sizeIndexRef.current[objectNode.id]?.width || 0,
                      text.length === 0 ? 36 : Math.max(8, text.length) * 8,
                    ),
                  }}
                  value={text}
                  onChange={(e) => onChange(e.target.value)}
                  type="text"
                  className="text-zinc-100 w-full px-1 h-4 outline-none m-auto bg-dark-transparent"
                />
                {isSelected && (
                  <AutoCompletes
                    text={text}
                    setAutoCompletes={setAutoCompletes}
                    selected={selected}
                    autoCompletes={autoCompletes}
                    selectOption={(x: ContextDefinition) => {
                      let name = (x.definition.alias || x.definition.name) as string;
                      if (text.split(" ")[0] === name) name = text;
                      setText(name);
                      enterText(name, x.context, x.definition.file);
                      setAutoCompletes([]);
                    }}
                  />
                )}
              </>
            ) : (
              <div
                style={{ fontSize: objectNode.attributes["font-size"] + "pt" }}
                className="px-1 flex-1 inner-node-text w-full text-zinc-100 bg-dark-transparent flex"
              >
                <span className="my-auto">
                  <span
                    className={`node-text node-operator-type-${objectNode.operatorContextType}`}
                  >
                    {splitText[0] === "zen" ? "p" : splitText[0]}
                  </span>
                  <span className="">{" " + splitText.slice(1).join(" ")}</span>
                </span>
              </div>
            )}
            {((typeError && !(typeError as TypeSuccess).success) || (editing && error)) && (
              <div
                style={{ left: "0px", bottom: "-20px" }}
                className="absolute bg-red-500 text-white rounded-lg px-2"
              >
                {typeError ? (typeError as TypeError).error : error}
              </div>
            )}
          </div>
        </ContextMenu.Trigger>
      </ContextMenu.Root>
    </PositionedComponent>
  );
};

export default ObjectNodeComponent;
