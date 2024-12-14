import React, { useRef, useEffect, useCallback, useState } from "react";
import { useInterval } from "@/hooks/useInterval";
import { ObjectNode } from "@/lib/nodes/types";

const NumberTilde: React.FC<{ objectNode: ObjectNode }> = ({ objectNode }) => {
  const [value, setValue] = useState<number>(0);

  const onMessage = useCallback((e: MessageEvent) => {
    setValue(e.data);
  }, []);

  useEffect(() => {
    if (objectNode.audioNode) {
      const worklet = objectNode.audioNode as AudioWorkletNode;
      worklet.port.onmessage = onMessage;
    } else {
      setTimeout(() => {
        if (objectNode.audioNode) {
          const worklet = objectNode.audioNode as AudioWorkletNode;
          worklet.port.onmessage = onMessage;
        }
      }, 500);
    }
    return () => {
      if (objectNode.audioNode) {
        const worklet = objectNode.audioNode as AudioWorkletNode;
        worklet.port.onmessage = null;
      }
    };
  }, [objectNode.audioNode, onMessage]);

  return (
    <div className="text-base w-full h-full px-2 py-1 text-white px-2 py-1 bg-zinc-700">
      {value}
    </div>
  );
};
export default NumberTilde;
