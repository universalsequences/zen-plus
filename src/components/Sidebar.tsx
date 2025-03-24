import { usePatches } from "@/contexts/PatchesContext";
import { useSelection } from "@/contexts/SelectionContext";
import type { ObjectNode, SubPatch } from "@/lib/nodes/types";
import { BoxIcon, CubeIcon } from "@radix-ui/react-icons";
import React, { useEffect, useCallback, useState } from "react";
import Attributes from "./Attributes";

const Sidebar = () => {
  const { selectedNodes, setOpened, opened } = useSelection();
  const { selectedPatch } = usePatches();
  const isSubPatch = selectedPatch && (selectedPatch as SubPatch).parentPatch !== undefined;
  const node =
    selectedNodes[0] || (selectedPatch ? (selectedPatch as SubPatch).parentNode : undefined);

  const inner = React.useMemo(() => {
    if (!node) {
      return <></>;
    }
    const attributes = node.attributes;
    return (
      <div className="w-full h-full text-xs flex flex-col">
        <Attributes node={node} />
      </div>
    );
  }, [node]);

  const name = selectedNodes[0] ? (node as ObjectNode).name || "number" : "";

  useEffect(() => {
    if (selectedNodes.length === 0) {
      setOpened(null);
    }
  }, [selectedNodes, setOpened]);

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setOpened, selectedNodes, opened]);

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const target = (e.target as HTMLElement)?.tagName.toLowerCase();
      if (
        e.key === "Tab" &&
        selectedNodes.length > 0 &&
        target !== "input" &&
        target !== "textarea"
      ) {
        e.preventDefault();
        setOpened(opened ? null : selectedNodes[0]);
      }
    },
    [selectedNodes, setOpened, opened],
  );

  const style = {
    opacity: isSubPatch || selectedNodes.length > 0 ? 1 : 0.5,
  };

  if (selectedNodes.length === 0) {
    return <></>;
  }

  return (
    <div
      style={{ zIndex: 10000000000 }}
      onMouseDown={(e: any) => e.stopPropagation()}
      onClick={(e: any) => e.stopPropagation()}
      className={
        "transition-all duration-300 ease-in-out bg-toolbar fixed top-12 right-0 flex sidebar " +
        (opened ? "opened-sidebar" : "")
      }
    >
      <div
        onClick={() => {
          if (isSubPatch || selectedNodes.length > 0) {
            setOpened(opened ? null : node);
          }
        }}
        style={{
          top: "0px",
          left: "-40px",
        }}
        className="cursor-pointer absolute p-2 w-10 h-10 bg-toolbar sidebar-btn "
      >
        {!selectedNodes[0] ? (
          <BoxIcon style={style} className="w-6 h-6" />
        ) : (
          <CubeIcon style={style} className="w-6 h-6 " />
        )}
      </div>
      {opened ? inner : ""}
    </div>
  );
};
export default Sidebar;
