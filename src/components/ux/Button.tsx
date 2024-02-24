import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useLocked } from '@/contexts/LockedContext';
import { useMessage } from '@/contexts/MessageContext';
import { useSelection } from '@/contexts/SelectionContext';
import { useValue } from '@/contexts/ValueContext';
import { usePosition } from '@/contexts/PositionContext';
import { ObjectNode } from '@/lib/nodes/types';

const Button: React.FC<{ objectNode: ObjectNode }> = ({ objectNode }) => {
    let ref = useRef<HTMLDivElement>(null);
    let { value: message } = useValue();
    let { attributesIndex } = useSelection();
    let { lockedMode } = useLocked();
    let current = useRef(0);
    let [animate, setAnimate] = useState(false);

    useEffect(() => {
        if (message !== undefined) {
            setAnimate(false);

            setTimeout(() => {
                // Force a reflow
                const element = ref.current;
                element && (element as any).offsetWidth; // This line triggers a reflow

                setAnimate(true);
                current.current = message as number;

                setTimeout(() => {
                    if (current.current === message) {
                        setAnimate(false);
                    }
                }, 1000);
            }, 3);
        }
    }, [message, setAnimate]);

    const { sizeIndex } = usePosition();
    let { width, height } = objectNode.size || { width: 50, height: 50 };

    return <div
        onClick={() => {
            if (lockedMode) {
                objectNode.receive(objectNode.inlets[0], "bang");
            }
        }}
        style={{ width: Math.max(width, height), height: Math.max(width, height) }} className="bg-zinc-700 flex">
        <div ref={ref} className={(animate ? "animate-color " : "") + (lockedMode ? " cursor-pointer " : "") + " m-1 border border-2 rounded-full flex-1"}>
        </div>
    </div >
};

export default Button;
