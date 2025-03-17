import React, { useRef, useState, useEffect, useCallback } from "react";
import UXView from "./ux/UXView";
import SlotView from "./SlotView";
import AutoCompletes from "./AutoCompletes";
import PositionedComponent from "./PositionedComponent";
import CustomSubPatchView from "./CustomSubPatchView";
import { ContextMenu } from "@radix-ui/themes";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { index, type NodeProps } from "./ux/index";
import { type OperatorContext, OperatorContextType, getOperatorContext } from "@/lib/nodes/context";
import { type SizeIndex, usePosition } from "@/contexts/PositionContext";
import { usePatches } from "@/contexts/PatchesContext";
import { useLocked } from "@/contexts/LockedContext";
import { useSubPatchLoader } from "@/hooks/useSubPatchLoader";
import { useSelection } from "@/contexts/SelectionContext";
import { useAutoComplete, type ContextDefinition } from "@/hooks/useAutoComplete";
import { usePatch } from "@/contexts/PatchContext";
import { useStorage } from "@/contexts/StorageContext";
import { useValue } from "@/contexts/ValueContext";
import { setupSkeletonPatch } from "@/lib/utils";
import { duplicateObject } from "@/lib/nodes/utils/duplicateObject";
import ObjectNodeImpl from "@/lib/nodes/ObjectNode";
import type { File } from "@/lib/files/types";
import type { TypeError, TypeSuccess } from "@/lib/nodes/typechecker";
import type { ObjectNode, Coordinate, Size, MessageNode } from "@/lib/nodes/types";
import type { Definition } from "@/lib/docs/docs";

/**
 * Component props for ObjectNodeComponent
 */
interface ObjectNodeComponentProps {
  position?: string;
  objectNode: ObjectNode;
}

/**
 * ObjectNodeComponent wraps an object node in the patch editor
 *
 * This component handles the display and interaction of object nodes,
 * including editing, selection, and context menu operations.
 */
const ObjectNodeComponent: React.FC<ObjectNodeComponentProps> = ({ objectNode, position }) => {
  // Context hooks
  const { setSelection, selectedNodes, setSelectedNodes } = useSelection();
  const { updatePosition, sizeIndexRef, updateZIndex } = usePosition();
  const { value } = useValue();
  const { lockedMode } = useLocked();

  // State management
  const lockedModeRef = useRef(lockedMode);
  const errorMessage =
    objectNode.operatorContextType === OperatorContextType.CORE ? undefined : value;
  const isSelected = selectedNodes.includes(objectNode);

  // Keep locked mode ref up to date
  useEffect(() => {
    lockedModeRef.current = lockedMode;
  }, [lockedMode]);

  // Handle patch selection effects
  useEffect(() => {
    if (isSelected) {
      // Send bang to any onPatchSelect objects in subpatch
      objectNode.subpatch?.objectNodes
        .filter((x) => x.name === "onPatchSelect")
        .forEach((node) => {
          node.receive(node.inlets[0], "bang");
        });
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
      updateZIndex={updateZIndex}
      setSelectedNodes={setSelectedNodes}
      updatePosition={updatePosition}
      isSelected={isSelected}
      typeError={errorMessage as TypeError | undefined}
    />
  );
};

/**
 * Props for InnerObjectNodeComponent
 */
interface InnerObjectNodeComponentProps {
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
  updateZIndex: (x: string, index: number) => void;
}

/**
 * Inner component that handles the detailed rendering and behavior of an object node
 */
const InnerObjectNodeComponent: React.FC<InnerObjectNodeComponentProps> = ({
  position,
  typeError,
  updateZIndex,
  updatePosition,
  setSelection,
  lockedModeRef,
  sizeIndexRef,
  isSelected,
  objectNode,
  setSelectedNodes,
}) => {
  // UI state
  const [fullscreen, setFullscreen] = useState(false);
  const [editing, setEditing] = useState(objectNode.text === "");
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState(
    objectNode.subpatch
      ? objectNode.text.replace("zen", objectNode.subpatch.name || "zen")
      : objectNode.text,
  );
  const [parsedText, setParsedText] = useState("");
  const [_includeInPresentation, setIncludeInPresentation] = useState(
    objectNode.attributes["Include in Presentation"],
  );
  const [documentation, setDocumentation] = useState<Definition | null>(null);
  const [selected, setSelected] = useState(0);

  // Context hooks
  const { fetchSubPatchForDoc } = useStorage();
  const { isCustomView, newObjectNode } = usePatch();
  const { expandPatch, patchNames } = usePatches();
  const { loadSubPatch } = useSubPatchLoader(objectNode);
  const { setAutoCompletes, autoCompletes } = useAutoComplete(text, objectNode, editing);

  // Refs
  const ref = useRef<HTMLDivElement | null>(null);
  const lastSubPatchClick = useRef(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const initialPosition = useRef<Coordinate | null>(null);
  const clicked = useRef(false);

  /**
   * Load documentation for this node's operator
   */
  useEffect(() => {
    if (objectNode.name && objectNode.operatorContextType !== undefined) {
      const doc = getOperatorContext(objectNode.operatorContextType).lookupDoc(objectNode.name);
      setDocumentation(doc || null);
    }
  }, [objectNode.name, objectNode.operatorContextType]);

  /**
   * Update text when patch name changes
   */
  useEffect(() => {
    if (objectNode.subpatch?.id && patchNames[objectNode.subpatch.id]) {
      setText(patchNames[objectNode.subpatch.id]);
    }
  }, [patchNames, objectNode.subpatch]);

  /**
   * Handle initial editing state for newly created nodes
   */
  useEffect(() => {
    if (objectNode.text === "" && objectNode.justCreated) {
      setSelectedNodes([objectNode]);
      setTimeout(() => {
        setEditing(true);
        objectNode.justCreated = false;
      }, 10);
    }
  }, [objectNode, setSelectedNodes]);

  /**
   * Focus input when entering edit mode
   */
  useEffect(() => {
    if (inputRef.current && editing && (clicked.current || objectNode.created)) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
        objectNode.created = false;
      }, 10);
    }
  }, [editing, objectNode.created]);

  /**
   * Exit editing mode when node is deselected
   */
  useEffect(() => {
    if (!isSelected && !objectNode.justCreated) {
      setEditing(false);
    }
  }, [isSelected, objectNode.justCreated]);

  /**
   * Handle user input in the text field
   */
  const onChange = useCallback((value: string) => {
    setText(value);
    setSelected(0);
  }, []);

  /**
   * Apply text input to create or modify the node
   */
  const enterText = useCallback(
    async (text: string, context?: OperatorContext, file?: File) => {
      // Default to ZEN context if not specified
      context = context || getOperatorContext(OperatorContextType.ZEN);
      let success = true;

      if (file) {
        // Load subpatch from file
        const serializedSubPatch = await fetchSubPatchForDoc(file.id);
        if (serializedSubPatch) {
          await loadSubPatch(serializedSubPatch, file.name);
        }
        success = true;
      } else {
        // Parse the node text
        success = objectNode.parse(text, context.type);

        // Initialize subpatch if one was created
        if (objectNode.subpatch) {
          setupSkeletonPatch(objectNode.subpatch);
        }
      }

      // Update UI state based on success
      if (success || file) {
        setError(null);
        setEditing(false);
        setParsedText(text);
      } else {
        setError("function not found");
      }
    },
    [fetchSubPatchForDoc, loadSubPatch, objectNode],
  );

  /**
   * Handle keyboard events in the text field
   */
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Handle up/down for autocomplete navigation
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        setSelected((prev) => {
          if (e.key === "ArrowUp") {
            return Math.max(0, prev - 1);
          }
          return Math.min(autoCompletes.length - 1, prev + 1);
        });
        return;
      }

      // Handle Enter/Tab for selecting autocomplete or confirming entry
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();

        if (autoCompletes[selected]) {
          // Select autocomplete suggestion
          const def = autoCompletes[selected];
          let name = (def.definition.alias || def.definition.name) as string;

          // Keep arguments if the operator name matches
          if (text.split(" ")[0] === name || objectNode.text.split(" ")[0] === name) {
            name = text;
          }

          setText(name);
          setAutoCompletes([]);

          // Only apply on Enter, not Tab
          if (e.key === "Enter") {
            enterText(name, def.context, def.definition.file);
          }
        } else if (e.key === "Enter") {
          // Enter with no autocomplete selection - just apply the text
          enterText(text);
        }
      }
    },
    [text, selected, autoCompletes, enterText],
  );

  /**
   * Toggle whether this node appears in presentation mode
   */
  const togglePresentation = useCallback(() => {
    const newValue = !objectNode.attributes["Include in Presentation"];
    objectNode.setAttribute("Include in Presentation", newValue);
    setIncludeInPresentation(newValue);

    // Initialize presentation position if needed
    objectNode.presentationPosition = { ...objectNode.position };
  }, [objectNode]);

  /**
   * Create a duplicate of this node
   */
  const duplicate = useCallback(() => {
    duplicateObject({ objectNode, newObjectNode, updatePosition });
  }, [objectNode, newObjectNode, updatePosition]);

  /**
   * Handle mouse down events on the node
   */
  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Skip in special cases
      if (
        e.shiftKey ||
        isCustomView ||
        lockedModeRef.current ||
        e.button === 2 ||
        objectNode.locked
      ) {
        return;
      }

      // Handle double-click detection
      const now = Date.now();
      const isDoubleClick = now - lastSubPatchClick.current < 250;
      lastSubPatchClick.current = now;

      // Clear selection
      setSelection(null);

      // Skip propagation if already editing
      if (editing) {
        e.stopPropagation();
        return;
      }

      // Handle selection and editing
      if (isSelected || objectNode.text === "") {
        const samePosition =
          initialPosition.current &&
          initialPosition.current.x === objectNode.position.x &&
          initialPosition.current.y === objectNode.position.y;

        if (objectNode.text === "" || samePosition) {
          if (objectNode.text === "") {
            e.stopPropagation();
          }

          // Handle double-click on patch nodes
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

          // Enter edit mode for empty or unknown objects
          if (!objectNode.name || (!index[objectNode.name] && !objectNode.subpatch)) {
            clicked.current = true;
            setEditing(true);
            setSelectedNodes([objectNode]);
          }
        }
      }

      // Store initial position for drag detection
      if (!editing) {
        initialPosition.current = { ...objectNode.position };
      }
    },
    [editing, objectNode, isSelected, isCustomView, expandPatch, setSelectedNodes, setSelection],
  );

  /**
   * Move this node to the back of the Z order
   */
  const moveToBack = useCallback(() => {
    objectNode.zIndex = -1;
    updateZIndex(objectNode.id, -1);
  }, [objectNode, updateZIndex]);

  /**
   * Toggle the locked state of this node
   */
  const lockObject = useCallback(
    (locked: boolean) => {
      objectNode.locked = locked;
    },
    [objectNode],
  );

  /**
   * Show an example patch for this node type
   */
  const showExample = useCallback(
    async (examplePatch: string) => {
      // Fetch example patch data
      const serializedSubPatch = await fetchSubPatchForDoc(examplePatch);
      if (!serializedSubPatch) return;

      // Create a new node with the example patch
      const type = serializedSubPatch.attributes?.type || "zen";
      const node = new ObjectNodeImpl(objectNode.patch);
      node.parse(`zen @type ${type}`, OperatorContextType.ZEN, true, serializedSubPatch);
      node.position = { x: 100, y: 100 };

      // Name the example patch based on the current node
      if (node.subpatch) {
        node.subpatch.name = `example (${objectNode.name})`;
      }

      // Open the example patch
      expandPatch(node);

      // Recompile after a delay
      setTimeout(() => node.subpatch?.recompileGraph(true), 1000);
    },
    [fetchSubPatchForDoc, objectNode, expandPatch],
  );

  // Determine the appropriate rendering component for this node
  const CustomComponent = objectNode.name
    ? (index[objectNode.name] as React.ComponentType<NodeProps>)
    : undefined;

  // Extract node attributes and settings
  const isCustomSubPatchView = objectNode.attributes["Custom Presentation"];
  const { slotview, ux } = objectNode.attributes;
  const showUX = ux && objectNode.name !== "matrix";
  const splitText = text.split(" ");

  // Determine if there's an error to show
  const hasTypeError = typeError && !(typeError as TypeSuccess).success;
  const hasError = (!CustomComponent && hasTypeError) || error !== null;

  // Skip overflow in specific cases
  const skipOverflow =
    showUX || error !== null || hasTypeError || (editing && autoCompletes.length > 0);

  return (
    <PositionedComponent
      position={position}
      fullscreen={fullscreen}
      isHydrated={objectNode.lastSentMessage !== undefined}
      isCustomView={isCustomView}
      text={parsedText}
      lockedModeRef={lockedModeRef}
      isError={hasError}
      skipOverflow={skipOverflow}
      node={objectNode}
    >
      <ContextMenu.Root>
        {/* Context Menu */}
        <ContextMenu.Content
          onMouseDown={(e: any) => e.stopPropagation()}
          style={{ zIndex: 10000000000000 }}
          color="indigo"
          className="object-context rounded-lg p-2 text-xs"
        >
          {/* Expand Patch option (for zen objects) */}
          {objectNode.name === "zen" && (
            <ContextMenu.Item
              onClick={() => expandPatch(objectNode)}
              className="text-white hover:bg-white hover:text-black px-2 py-1 outline-none cursor-pointer"
            >
              Expand Patch
            </ContextMenu.Item>
          )}

          {/* Presentation mode toggle */}
          <ContextMenu.Item
            onClick={togglePresentation}
            className="text-white hover:bg-white hover:text-black px-2 py-1 outline-none cursor-pointer"
          >
            {objectNode.attributes["Include in Presentation"]
              ? "Remove from Presentation"
              : "Include in Presentation"}
          </ContextMenu.Item>

          {/* Duplicate option */}
          <ContextMenu.Item
            onClick={duplicate}
            className="text-white hover:bg-white hover:text-black px-2 py-1 outline-none cursor-pointer"
          >
            Duplicate
          </ContextMenu.Item>

          {/* Z-order control */}
          <ContextMenu.Item
            onClick={moveToBack}
            className="text-white hover:bg-white hover:text-black px-2 py-1 outline-none cursor-pointer"
          >
            Move to back
          </ContextMenu.Item>

          {/* Lock/unlock toggle */}
          <ContextMenu.Item
            onClick={() => lockObject(!objectNode.locked)}
            className="text-white hover:bg-white hover:text-black px-2 py-1 outline-none cursor-pointer"
          >
            {objectNode.locked ? "Unlock" : "Lock"}
          </ContextMenu.Item>

          {/* Selection option */}
          <ContextMenu.Item
            onClick={() => setSelectedNodes([objectNode])}
            className="text-white hover:bg-white hover:text-black px-2 py-1 outline-none cursor-pointer"
          >
            Select
          </ContextMenu.Item>

          {/* Fullscreen toggle for supported node types */}
          {(objectNode.name === "wasmviewer" ||
            objectNode.name === "js" ||
            objectNode.name === "lisp") && (
            <ContextMenu.Item
              onClick={() => setFullscreen(!fullscreen)}
              className="text-white hover:bg-white hover:text-black px-2 py-1 outline-none cursor-pointer"
            >
              {fullscreen ? "Exit Full-Screen" : "Full-Screen"}
            </ContextMenu.Item>
          )}

          {/* Help option if documentation is available */}
          {documentation?.examplePatch && (
            <ContextMenu.Item
              onClick={() => showExample(documentation.examplePatch as string)}
              className="text-white hover:bg-white hover:text-black px-2 py-1 outline-none cursor-pointer flex"
            >
              Help <InfoCircledIcon className="w-4 h-4 ml-2" />
            </ContextMenu.Item>
          )}
        </ContextMenu.Content>

        {/* Node Content */}
        <ContextMenu.Trigger disabled={isCustomView} className="ContextMenuTrigger relative">
          <div
            ref={ref}
            onMouseDown={onMouseDown}
            className="flex h-full w-full flex-1 whitespace-nowrap"
          >
            {/* Render the appropriate view based on node type and state */}
            {showUX ? (
              <UXView objectNode={objectNode} />
            ) : slotview ? (
              <SlotView objectNode={objectNode} />
            ) : isCustomSubPatchView ? (
              <CustomSubPatchView objectNode={objectNode} />
            ) : CustomComponent ? (
              <CustomComponent
                setFullScreen={setFullscreen}
                fullscreen={fullscreen}
                objectNode={objectNode}
              />
            ) : editing ? (
              <NodeEditView
                text={text}
                objectNode={objectNode}
                sizeIndexRef={sizeIndexRef}
                inputRef={inputRef}
                isSelected={isSelected}
                selected={selected}
                autoCompletes={autoCompletes}
                setAutoCompletes={setAutoCompletes}
                onChange={onChange}
                onKeyDown={onKeyDown}
                enterText={enterText}
              />
            ) : (
              <NodeDisplayView objectNode={objectNode} splitText={splitText} />
            )}

            {/* Error display */}
            {(hasTypeError || (editing && error)) && (
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

/**
 * Props for NodeEditView component
 */
interface NodeEditViewProps {
  text: string;
  objectNode: ObjectNode;
  sizeIndexRef: React.MutableRefObject<SizeIndex>;
  inputRef: React.RefObject<HTMLInputElement>;
  isSelected: boolean;
  selected: number;
  autoCompletes: ContextDefinition[];
  setAutoCompletes: (completes: ContextDefinition[]) => void;
  onChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  enterText: (text: string, context?: OperatorContext, file?: File) => void;
}

/**
 * Component for editing an object node's text
 */
const NodeEditView: React.FC<NodeEditViewProps> = ({
  text,
  objectNode,
  sizeIndexRef,
  inputRef,
  isSelected,
  selected,
  autoCompletes,
  setAutoCompletes,
  onChange,
  onKeyDown,
  enterText,
}) => {
  // Calculate input width based on text length
  const inputWidth = Math.max(
    sizeIndexRef.current[objectNode.id]?.width || 0,
    text.length === 0 ? 36 : Math.max(8, text.length) * 8,
  );

  return (
    <>
      <input
        autoComplete="off"
        autoCorrect="off"
        onClick={(e) => e.stopPropagation()}
        ref={inputRef}
        onKeyDown={onKeyDown}
        style={{ width: inputWidth }}
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
          selectOption={(option: ContextDefinition) => {
            let name = (option.definition.alias || option.definition.name) as string;

            // Keep arguments if the operator name matches
            if (text.split(" ")[0] === name) {
              name = text;
            }

            //setText(name);
            enterText(name, option.context, option.definition.file);
            setAutoCompletes([]);
          }}
        />
      )}
    </>
  );
};

/**
 * Props for NodeDisplayView component
 */
interface NodeDisplayViewProps {
  objectNode: ObjectNode;
  splitText: string[];
}

/**
 * Component for displaying an object node's text (non-editing mode)
 */
const NodeDisplayView: React.FC<NodeDisplayViewProps> = ({ objectNode, splitText }) => {
  return (
    <div
      style={{ fontSize: objectNode.attributes["font-size"] + "pt" }}
      className="px-1 flex-1 inner-node-text w-full text-zinc-100 bg-dark-transparent flex"
    >
      <span className="my-auto">
        <span className={`node-text node-operator-type-${objectNode.operatorContextType}`}>
          {/* Display 'p' instead of 'zen' for subpatches */}
          {splitText[0] === "zen" ? "p" : splitText[0]}
        </span>

        {/* Display arguments */}
        <span className="">{" " + splitText.slice(1).join(" ")}</span>
      </span>
    </div>
  );
};

export default ObjectNodeComponent;
