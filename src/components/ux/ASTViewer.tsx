import React from "react";
import { determineBlocks } from "@/lib/zen/blocks/analyze";
import { ObjectNode } from "@/lib/nodes/types";
import AST from "./AST";

export const ASTViewer: React.FC<{ objectNode: ObjectNode }> = ({
  objectNode,
}) => {
  console.log("AST VIEWER");
  if (objectNode.patch.zenGraph) {
    let blocks = determineBlocks(...objectNode.patch.zenGraph.codeFragments);
    return (
      <div
        style={{
          backgroundColor: "#000000a8",
        }}
        className="overflow-scroll text-white p-2 relative"
      >
        {objectNode.patch.zenGraph.codeFragments.map((ast) => (
          <AST key={ast.id} blocks={blocks} fragment={ast} stack={[]} />
        ))}
      </div>
    );
  }
  return <></>;
};
