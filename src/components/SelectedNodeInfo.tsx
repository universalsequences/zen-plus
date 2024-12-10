import { ObjectNode, Node, MessageNode } from "@/lib/nodes/types";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { useState } from "react";
import Attributes from "./Attributes";
import { OperatorContextType, getContextName } from "@/lib/nodes/context";
import { useSelection } from "@/contexts/SelectionContext";

interface Props {
  node: Node;
}

export const SelectedNodeInfo = (props: Props) => {
  const [opened, setOpened] = useState(false);
  const name = (props.node as ObjectNode).name;

  useSelection();
  return (
    <div
      onMouseDown={(e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
      }}
      onClick={(e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        setOpened(!opened);
      }}
      style={{ minWidth: 60 }}
      className={`cursor-pointer bg-zinc-800 border-r border-zinc-600 flex text-xs px-2 pr-2 w-full ${opened ? "underline" : ""}`}
    >
      <div
        className={`rounded-full px-3 mr-2 text-xs h-5 my-auto border border-zinc-700 context-type-${(props.node as ObjectNode).operatorContextType}`}
      >
        {getContextName((props.node as ObjectNode).operatorContextType as OperatorContextType)}
      </div>
      <div className="flex-1 my-auto mx-auto pr-3 text-xs  my-auto  ">
        {(props.node as ObjectNode).subpatch?.name || name}
      </div>
      {opened && (
        <div
          style={{
            zIndex: 10000000000,
            backgroundSize: "14px 14px",
            backgroundImage:
              "radial-gradient(circle, rgba(41, 41, 41, 0.44) 0%, rgba(28, 27, 27, 0.08) 11%, transparent 11%, transparent 100%), linear-gradient(90deg, rgb(74 74 74 / 69%), rgb(74 74 74 / 69%))",
          }}
          className="absolute bottom-6 right-0 bg-black max-h-screen"
        >
          <Attributes node={props.node as ObjectNode | MessageNode}></Attributes>
        </div>
      )}
    </div>
  );
};
