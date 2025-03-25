import React from "react";
import { BoxModelIcon, CubeIcon } from "@radix-ui/react-icons";
import { ObjectNode } from "@/lib/nodes/types";

interface DirectoryEntryProps {
  name: string;
  onClick: (e: boolean | React.MouseEvent<HTMLDivElement>) => void;
  isSpecial?: boolean;
  index: number;
  isSelected: boolean;
  setEntryRef: (el: HTMLDivElement | null, index: number) => void;
}

export const DirectoryEntry: React.FC<DirectoryEntryProps> = ({
  name,
  onClick,
  isSpecial = false,
  index,
  isSelected,
  setEntryRef,
}) => {
  return (
    <div
      ref={(el) => setEntryRef(el, index)}
      className={`directory-entry px-2 py-1 text-xs my-1 cursor-pointer transition-colors ${
        isSpecial ? "text-zinc-100" : ""
      } ${isSelected ? "bg-zinc-700" : ""} [&.active-click]:bg-zinc-500`}
      onClick={onClick}
      data-index={index}
    >
      <div className="flex items-center">
        <span className="directory-name font-mono">{name}</span>
        {isSelected && <span className="ml-auto text-xs">⏎</span>}
      </div>
    </div>
  );
};

interface ObjectEntryProps {
  node: ObjectNode;
  isSubpatch: boolean;
  index: number;
  isSelected: boolean;
  isEditing: boolean;
  editingName: string;
  setEditingName: (name: string) => void;
  nameInputRef: React.RefObject<HTMLInputElement>;
  setEditingPatchIndex: (index: number | null) => void;
  setEntryRef: (el: HTMLDivElement | null, index: number) => void;
  onClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  rootDivRef: React.RefObject<HTMLDivElement>;
  onSaveRename?: (node: ObjectNode, name: string) => void;
}

export const ObjectEntry: React.FC<ObjectEntryProps> = ({
  node,
  isSubpatch,
  index,
  isSelected,
  isEditing,
  editingName,
  setEditingName,
  nameInputRef,
  setEditingPatchIndex,
  setEntryRef,
  onClick,
  rootDivRef,
  onSaveRename,
}) => {
  // Determine name to display
  const displayName = isSubpatch 
    ? (node.subpatch?.name || node.text)
    : node.text;

  const handleSaveRename = () => {
    if (node.subpatch && editingName.trim() && onSaveRename) {
      onSaveRename(node, editingName.trim());
    }
    setEditingPatchIndex(null);
    setEditingName("");

    // Restore focus to main container
    setTimeout(() => {
      if (rootDivRef.current) {
        rootDivRef.current.focus();
      }
    }, 10);
  };

  const handleCancelRename = () => {
    setEditingPatchIndex(null);
    setEditingName("");

    // Restore focus to main container
    setTimeout(() => {
      if (rootDivRef.current) {
        rootDivRef.current.focus();
      }
    }, 10);
  };

  return (
    <div
      key={node.id}
      ref={(el) => setEntryRef(el, index)}
      className={`object-entry px-2 py-1 my-1 ${isSubpatch ? "text-teal-400" : ""} cursor-pointer text-xs transition-colors ${isSelected ? "bg-zinc-700" : ""} [&.active-click]:bg-zinc-500`}
      onClick={onClick}
      data-index={index}
    >
      <div className="flex items-center">
        {isSubpatch ? (
          <BoxModelIcon className="directory-icon mr-2 text-teal-400 w-3 h-3" />
        ) : (
          <CubeIcon className="directory-icon mr-2 text-gray-400 w-3 h-3" />
        )}
        
        {isEditing ? (
          <input
            onClick={(e) => e.stopPropagation()}
            ref={nameInputRef}
            className="bg-zinc-800 text-white px-1 py-0.5 w-full focus:outline-none focus:ring-1 focus:ring-zinc-500"
            value={editingName}
            onMouseDown={(e) => e.stopPropagation()}
            onChange={(e) => setEditingName(e.target.value)}
            onKeyDown={(e) => {
              // Prevent event bubbling for all keys
              e.stopPropagation();

              // Handle special keys
              if (e.key === "Enter") {
                handleSaveRename();
              } else if (e.key === "Escape") {
                handleCancelRename();
              }
            }}
            // Only cancel on blur if we need to
            onBlur={(e) => {
              // Don't cancel immediately - this was causing issues
              const target = e.relatedTarget as HTMLElement;
              // Delay to allow clicking on the input itself
              setTimeout(() => {
                // Only cancel if focus moved outside our component
                if (document.activeElement !== nameInputRef.current) {
                  setEditingPatchIndex(null);
                  setEditingName("");
                }
              }, 100);
            }}
          />
        ) : (
          <div className="object-name-container">
            <span className="object-name">{displayName}</span>
            {/* Display scripting name if available */}
            {node.attributes?.["scripting name"] && (
              <span className="scripting-name ml-2 text-zinc-400 italic">[{node.attributes["scripting name"]}]</span>
            )}
          </div>
        )}
        {isSelected && !isEditing && <span className="ml-auto text-xs">⏎</span>}
      </div>
    </div>
  );
};