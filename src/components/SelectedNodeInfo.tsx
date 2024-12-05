import { ObjectNode, Node, MessageNode } from "@/lib/nodes/types";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { useState } from "react";
import Attributes from "./Attributes";

interface Props {
  node: Node;
}

export const SelectedNodeInfo = (props: Props) => {
  const [opened, setOpened] = useState(false);
  const name = (props.node as ObjectNode).name;
  return (
    <div
      onMouseDown={(e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
      }}
      onClick={(e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        setOpened(!opened);
      }}
      className={`cursor-pointer flex text-xs my-auto pr-2 w-full ${opened ? "underline" : ""}`}
    >
      <div className="flex-1 my-auto mx-auto ">{name}</div>
      <InfoCircledIcon className="w-4 h-4 my-auto ml-auto" />
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
