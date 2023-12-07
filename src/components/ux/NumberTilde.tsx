import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useInterval } from '@/hooks/useInterval';
import { ObjectNode } from '@/lib/nodes/types';

const NumberTilde: React.FC<{ objectNode: ObjectNode }> = ({ objectNode }) => {

    const [value, setValue] = useState<number>(0);

    useEffect(() => {
        if (objectNode.audioNode) {
            let worklet = (objectNode.audioNode) as AudioWorkletNode;
            worklet.port.onmessage = onMessage;
        }
        return () => {
            if (objectNode.audioNode) {
                let worklet = (objectNode.audioNode) as AudioWorkletNode;
                worklet.port.onmessage = null;
            }
        }
    }, [setValue, objectNode.audioNode])

    const onMessage = useCallback((e: MessageEvent) => {
        setValue(e.data);
    }, [setValue]);

    return (
        <div className="w-full h-full px-2 py-1 bg-black-blur text-white">
            {value}
        </div>
    );
}
export default NumberTilde;
