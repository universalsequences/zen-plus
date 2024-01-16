import Shader from '@/components/shader/Shader';
import { usePosition } from '@/contexts/PositionContext';
import { RenderJob } from '@/lib/gl/zen';
import { ObjectNode, Message } from '@/lib/nodes/types';
import { useMessage } from '@/contexts/MessageContext';


const GLCanvas: React.FC<{ objectNode: ObjectNode }> = ({ objectNode }) => {
    let { messages } = useMessage();
    const { sizeIndex } = usePosition();

    let message: Message | undefined = messages[objectNode.id];

    if (message && objectNode.size && (message as RenderJob).fragment && (message as RenderJob).fragmentContext) {
        let graph: RenderJob = message as RenderJob;
        return <Shader width={objectNode.size.width} height={objectNode.size.height} zenGraph={graph} />
    } else {
        return <div className="w-12 h-12" />
    }

}

export default GLCanvas;
