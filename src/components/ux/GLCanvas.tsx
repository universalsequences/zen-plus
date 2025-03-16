import Shader from "@/components/shader/Shader";
import { useSelection } from "@/contexts/SelectionContext";

import { usePosition } from "@/contexts/PositionContext";
import { RenderJob } from "@/lib/gl/zen";
import { ObjectNode, Message } from "@/lib/nodes/types";
import { useMessage } from "@/contexts/MessageContext";

const GLCanvas: React.FC<{ objectNode: ObjectNode }> = ({ objectNode }) => {
  const { messages } = useMessage();
  usePosition();
  useSelection();

  const message: Message | undefined = messages[objectNode.id];

  if (
    objectNode.renderJob ||
    (message &&
      objectNode.size &&
      (message as RenderJob).fragment &&
      (message as RenderJob).fragmentContext)
  ) {
    const graph: RenderJob = (message as RenderJob) || objectNode.renderJob;
    return (
      <Shader
        objectNode={objectNode}
        fps={objectNode.attributes["fps"] as number}
        width={objectNode.size?.width || 300}
        height={objectNode.size?.height || 300}
        zenGraph={graph}
      />
    );
  } else {
    return <div className="w-12 h-12" />;
  }
};

export default GLCanvas;
