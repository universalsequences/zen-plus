import Shader from '@/components/shader/Shader';
import { usePosition } from '@/contexts/PositionContext';
import { ZenGraph } from '@/lib/gl/zen';
import { ObjectNode, Message } from '@/lib/nodes/types';
import { useMessage } from '@/contexts/MessageContext';


const GLCanvas: React.FC<{ objectNode: ObjectNode }> = ({ objectNode }) => {
    let { messages } = useMessage();
    const { sizeIndex } = usePosition();

    let message: Message | undefined = messages[objectNode.id];

    if (message && objectNode.size && (message as ZenGraph).code && (message as ZenGraph).context) {
        let graph: ZenGraph = message as ZenGraph;
        return <Shader width={objectNode.size.width} height={objectNode.size.height} code={graph.code} context={graph.context} />
    } else {
        return <div className="w-12 h-12" />
    }

}

export default GLCanvas;
