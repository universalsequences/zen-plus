import React, { useRef, useState, useEffect, useCallback } from "react";
import UXView from "./ux/UXView";
import SlotView from "./SlotView";
import type { File } from "@/lib/files/types";
import type { TypeError, TypeSuccess } from "@/lib/nodes/typechecker";
import { useValue } from "@/contexts/ValueContext";
import { usePublicClient } from "wagmi";
import ObjectNodeImpl from "@/lib/nodes/ObjectNode";
import {
  type OperatorContext,
  OperatorContextType,
  getAllContexts,
  getOperatorContext,
} from "@/lib/nodes/context";
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
import { lookupDoc } from "@/lib/nodes/definitions/core/doc";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { Definition } from "@/lib/docs/docs";

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

  let isSelected = selectedNodes.includes(objectNode);

  useEffect(() => {
    if (isSelected) {
      const nodes = objectNode.subpatch?.objectNodes.filter((x) => x.name === "onPatchSelect");
      if (nodes) {
        for (const n of nodes) {
          n.receive(n.inlets[0], "bang");
        }
      }
    }
  }, [isSelected, objectNode]);

  let out = React.useMemo(() => {
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
  }, [objectNode, setSelectedNodes, isSelected, setSelection, errorMessage, objectNode.size]);

  return out;
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
  const [fullscreen, setFullscreen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const lastSubPatchClick = useRef(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [selected, setSelected] = useState(0);
  const { fetchSubPatchForDoc } = useStorage();

  const [documentation, setDocumentation] = useState<Definition | null>(null);

  useEffect(() => {
    if (objectNode.name) {
      const doc =
        objectNode.operatorContextType !== undefined
          ? getOperatorContext(objectNode.operatorContextType).lookupDoc(objectNode.name || "")
          : undefined;

      setDocumentation(doc || null);
    }
  }, [objectNode.name]);

  const { isCustomView, newObjectNode, setPatch } = usePatch();
  const [editing, setEditing] = useState(objectNode.text === "");
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState(
    objectNode.subpatch
      ? objectNode.text.replace("zen", objectNode.subpatch.name || "zen")
      : objectNode.text,
  );
  const [parsedText, setParsedText] = useState("");
  const { setSelectedPatch, expandPatch, patches, setPatches } = usePatches();
  const [includeInPresentation, setIncludeInPresentation] = useState(
    objectNode.attributes["Include in Presentation"],
  );

  const { loadSubPatch } = useSubPatchLoader(objectNode);

  useEffect(() => {
    if (objectNode.text === "" && objectNode.justCreated) {
      setSelectedNodes([objectNode]);
      setTimeout(() => {
        setEditing(true);
      }, 10);
      objectNode.justCreated = false;
    }
  }, []);
  const _expandPatch = useCallback(() => {
    if (objectNode.subpatch) {
      expandPatch(objectNode);
    }
  }, [objectNode]);

  const { setAutoCompletes, autoCompletes } = useAutoComplete(text, objectNode, editing);

  const onChange = useCallback(
    (value: string) => {
      setText(value);
      setSelected(0);
    },
    [setText, setSelected, objectNode],
  );

  const enterText = useCallback(
    async (text: string, context?: OperatorContext, file?: File) => {
      if (!context) {
        context = getOperatorContext(OperatorContextType.ZEN);
      }
      let success = true;
      if (file) {
        let serializedSubPatch = await fetchSubPatchForDoc(file.id);
        if (serializedSubPatch) {
          await loadSubPatch(serializedSubPatch, file.name);
        } else {
          success = false;
        }
      } else {
        success = objectNode.parse(text, context.type);
      }
      if (success) {
        // this object existed and successfully
        setError(null);
        setEditing(false);
        setParsedText(text);
      } else {
        // no definition
        setError("function not found");
      }
    },
    [setEditing, setError, setParsedText],
  );

  useEffect(() => {
    if (!isSelected) setEditing(false);
  }, [isSelected]);

  const onKeyDown = useCallback(
    (e: any) => {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelected(Math.max(0, selected - 1));
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelected(Math.max(0, selected + 1) % autoCompletes.length);
      }
      if (e.key === "Enter") {
        e.preventDefault();
        if (autoCompletes[selected]) {
          let name = (autoCompletes[selected].definition.alias ||
            autoCompletes[selected].definition.name) as string;
          if (text.split(" ")[0] === name) {
            name = text;
          }
          setText(name);
          setAutoCompletes([]);
          if (objectNode.text.split(" ")[0] === name) {
            name = objectNode.text;
          }

          if (objectNode.text.split(" ")[0] === name) {
            name = objectNode.text;
          }
          enterText(name, autoCompletes[selected].context, autoCompletes[selected].definition.file);
        } else {
          enterText(text);
        }
        return;
      }
      if (e.key === "Tab") {
        if (autoCompletes[0]) {
          e.preventDefault();

          let name = autoCompletes[0].definition.name as string;
          if (objectNode.text.split(" ")[0] === name) {
            name = objectNode.text;
          }
          setText(name);
          setAutoCompletes([]);
        }
      }
    },
    [
      text,
      selected,
      setAutoCompletes,
      autoCompletes,
      setText,
      objectNode,
      setError,
      setEditing,
      setParsedText,
    ],
  );

  const togglePresentation = useCallback(() => {
    objectNode.setAttribute(
      "Include in Presentation",
      !objectNode.attributes["Include in Presentation"],
    );
    setIncludeInPresentation(!includeInPresentation);
    objectNode.presentationPosition = { ...objectNode.position };
  }, [setIncludeInPresentation, includeInPresentation]);

  const duplicate = useCallback(() => {
    let copied = new ObjectNodeImpl(objectNode.patch);
    if (objectNode.name === "zen") {
      let attr = "";

      if (objectNode.subpatch && objectNode.subpatch.patchType === OperatorContextType.ZEN) {
        attr = " @type zen";
      }
      if (objectNode.subpatch && objectNode.subpatch.patchType === OperatorContextType.GL) {
        attr = " @type gl";
      }
      if (objectNode.subpatch && objectNode.subpatch.patchType === OperatorContextType.CORE) {
        attr = " @type core";
      }
      if (objectNode.subpatch && objectNode.subpatch.patchType === OperatorContextType.AUDIO) {
        attr = " @type audio";
      }
      copied.parse("zen" + attr);
      let json = objectNode.getJSON();
      if (copied.subpatch && json.subpatch) {
        copied.subpatch.fromJSON(json.subpatch, true);
        // loadSubPatch(json.subpatch, "zen");
      }
      copied.attributes = {
        ...copied.attributes,
        ...json.attributes,
      };
      copied.size = json.size;
    } else {
      let size = objectNode.size;
      copied.parse(objectNode.text, objectNode.operatorContextType, false);
      if (size) {
        copied.size = { ...size };
      }
    }
    copied.position.x = objectNode.position.x + sizeIndexRef.current[objectNode.id].width + 15;
    copied.position.y = objectNode.position.y;
    newObjectNode(copied, copied.position);
    updatePosition(copied.id, copied.position);
  }, [objectNode, newObjectNode]);

  let clicked = useRef(false);
  useEffect(() => {
    // TODO: dont set timeout... this is a hack
    setTimeout(() => {
      if (inputRef.current && editing && (clicked.current || objectNode.created)) {
        inputRef.current.focus();
        inputRef.current.select();
        objectNode.created = false;
      }
    }, 10);
  }, [editing]);

  const initialPosition = useRef<Coordinate | null>(null);

  const onMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
      if (e.shiftKey) {
        return;
      }
      let last = lastSubPatchClick.current;
      lastSubPatchClick.current = new Date().getTime();
      setSelection(null);
      if (isCustomView) {
        return;
      }
      if (lockedModeRef.current) {
        return;
      }
      if (e.button === 2) {
        return;
      }
      if (editing) {
        e.stopPropagation();
      }
      if (isSelected || objectNode.text === "") {
        if (
          objectNode.text === "" ||
          (initialPosition.current &&
            initialPosition.current.x === objectNode.position.x &&
            initialPosition.current.y === objectNode.position.y)
        ) {
          if (objectNode.text === "") {
            e.stopPropagation();
          }
          if (objectNode.name === "zen" && objectNode.subpatch) {
            if (objectNode.attributes.slotview) {
              return;
            }
            let diff = new Date().getTime() - last;
            if (diff > 250) {
              return;
            }
            e.stopPropagation();
            expandPatch(objectNode);
            return;
          }
          if (!objectNode.name || !index[objectNode.name]) {
            clicked.current = true;
            setEditing(true);
            setSelectedNodes([objectNode]);
          }
          // setSelectedNodes([]);
        }
      }

      if (editing) {
        e.stopPropagation();
      }
      if (!editing) {
        initialPosition.current = { ...objectNode.position };
      }
    },
    [editing, objectNode, isSelected, setSelectedNodes, setEditing, setPatch, setPatches, patches],
  );

  const showExample = useCallback(async (examplePatch: string) => {
    // look up doc
    const serializedSubPatch = await fetchSubPatchForDoc(examplePatch);
    if (serializedSubPatch) {
      const type = serializedSubPatch.attributes?.type || "zen";
      const node = new ObjectNodeImpl(objectNode.patch);
      node.parse(`zen @type ${type}`, OperatorContextType.ZEN, true, serializedSubPatch);
      node.position = { x: 100, y: 100 };
      if (node.subpatch) {
        node.subpatch.name = `example (${objectNode.name})`;
      }
      expandPatch(node);

      setTimeout(() => {
        node.subpatch?.recompileGraph(true);
      }, 1000);
    }
  }, []);

  let CustomComponent = (objectNode.name
    ? index[objectNode.name]
    : undefined) as unknown as React.ComponentType<NodeProps>;
  let isCustomSubPatchView = objectNode.attributes["Custom Presentation"];

  let { slotview } = objectNode.attributes;
  let { ux } = objectNode.attributes;
  if (objectNode.name === "matrix") {
    //} || objectNode.name === "wasmviewer") {
    ux = undefined as any;
  }

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
        ux !== undefined ||
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
              onClick={_expandPatch}
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
            {ux ? (
              <UXView objectNode={objectNode} />
            ) : slotview ? (
              <SlotView objectNode={objectNode} />
            ) : (
              <>
                {isCustomSubPatchView ? (
                  <CustomSubPatchView objectNode={objectNode} />
                ) : CustomComponent ? (
                  <CustomComponent fullscreen={fullscreen} objectNode={objectNode} />
                ) : editing ? (
                  <input
                    autoComplete={"off"}
                    autoCorrect={"off"}
                    onClick={(e: any) => e.stopPropagation()}
                    ref={inputRef}
                    onKeyDown={onKeyDown}
                    style={{
                      width: Math.max(
                        sizeIndexRef.current[objectNode.id]
                          ? sizeIndexRef.current[objectNode.id].width
                          : 0,
                        text.length === 0 ? 36 : Math.max(8, text.length) * 8,
                      ),
                    }}
                    value={text}
                    onChange={(e: any) => onChange(e.target.value)}
                    type="text"
                    className="text-zinc-100 w-full px-1 h-4 outline-none m-auto bg-dark-transparent"
                  />
                ) : (
                  <div
                    style={{
                      fontSize: objectNode.attributes["font-size"] + "pt",
                    }}
                    className=" px-1 flex-1 inner-node-text  w-full text-zinc-100 bg-dark-transparent flex"
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
                {editing && isSelected && (
                  <AutoCompletes
                    text={text}
                    setAutoCompletes={setAutoCompletes}
                    selected={selected}
                    autoCompletes={autoCompletes}
                    selectOption={(x: ContextDefinition) => {
                      let name = (x.definition.alias || x.definition.name) as string;
                      if (text.split(" ")[0] === name) {
                        name = text;
                      }
                      setText(name);
                      enterText(name, x.context, x.definition.file);
                      setAutoCompletes([]);
                    }}
                  />
                )}
                {((typeError && !(typeError as TypeSuccess).success) || (editing && error)) && (
                  <div
                    style={{ left: "0px", bottom: "-20px" }}
                    className="absolute bg-red-500 text-white rounded-lg px-2"
                  >
                    {typeError ? (typeError as TypeError).error : error}
                  </div>
                )}
              </>
            )}
          </div>
        </ContextMenu.Trigger>
      </ContextMenu.Root>
    </PositionedComponent>
  );
};

export default ObjectNodeComponent;
