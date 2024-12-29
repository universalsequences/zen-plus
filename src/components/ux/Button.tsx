import React, { useEffect, useRef } from "react";
import { useLocked } from "@/contexts/LockedContext";
import { useMessage } from "@/contexts/MessageContext";
import { useSelection } from "@/contexts/SelectionContext";
import { useValue } from "@/contexts/ValueContext";
import { usePosition } from "@/contexts/PositionContext";
import { ObjectNode } from "@/lib/nodes/types";

const Button: React.FC<{ objectNode: ObjectNode }> = ({ objectNode }) => {
  const ref = useRef<HTMLDivElement>(null);
  const { value: message } = useValue();
  const { attributesIndex } = useSelection();
  const { lockedMode } = useLocked();
  const current = useRef(0);
  const animateRef = useRef<HTMLDivElement>(null);

  const { label, fillColor, backgroundColor } = objectNode.attributes;

  useEffect(() => {
    if (message !== undefined) {
      if (ref.current) {
        ref.current.classList.remove("animate-color");
      }

      setTimeout(() => {
        // Force a reflow
        const element = ref.current;
        element?.offsetWidth; // This line triggers a reflow

        if (ref.current) {
          ref.current.classList.add("animate-color");
        }
        current.current = message as number;

        setTimeout(() => {
          if (current.current === message && ref.current) {
            ref.current.classList.remove("animate-color");
          }
        }, 1000);
      }, 3);
    }
  }, [message]);

  const { sizeIndex } = usePosition();
  const { width, height } = objectNode.size || { width: 50, height: 50 };

  return (
    <div
      onClick={() => {
        if (lockedMode) {
          objectNode.receive(objectNode.inlets[0], "bang");
        }
      }}
      style={{
        backgroundColor: backgroundColor as string,
        width: Math.max(width, height),
        height: Math.max(width, height),
      }}
      className="flex"
    >
      <div
        ref={ref}
        style={{ backgroundColor: fillColor as string }}
        className={`m-1 border border-1 rounded-full flex-1 flex${lockedMode ? " cursor-pointer" : ""}`}
      >
        <div className="m-auto text-white">{label}</div>
      </div>
    </div>
  );
};

export default Button;
