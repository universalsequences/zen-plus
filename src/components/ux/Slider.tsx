import React, { useState, useEffect, useRef } from 'react';
import { usePosition } from '@/contexts/PositionContext';
import { useSelection } from '@/contexts/SelectionContext';
import { ObjectNode } from '@/lib/nodes/types';

const Slider: React.FC<{ objectNode: ObjectNode }> = ({ objectNode }) => {
    let ref = useRef<HTMLDivElement | null>(null);
    const { lockedMode } = useSelection();
    let [height, setHeight] = useState((objectNode.arguments[0] !== undefined ? (objectNode.arguments[0] as number) * 100 : .5));
    let [editing, setEditing] = useState(false);


    const handleMouseDown = (e: any) => {
        if (lockedMode) {
            e.stopPropagation();
            setEditing(true);
        }
    };

    const handleMouseMove = (e: any) => {
        if (editing && ref.current) {
            const sliderRect = ref.current.getBoundingClientRect();
            const newHeight = Math.min(Math.max(0, (e.clientY - sliderRect.top) / sliderRect.height * 100), 100);
            let h = 100 - newHeight;
            objectNode.text = "slider " + h / 100.0;
            objectNode.arguments[0] = h / 100.0;
            objectNode.send(objectNode.outlets[0], h / 100.0);
            setHeight(h);
        }
    };

    const handleMouseUp = () => {
        setEditing(false);
    };

    useEffect(() => {
        if (editing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [editing]);

    const { sizeIndex } = usePosition();
    let size = sizeIndex[objectNode.id] || { width: 100, height: 100 };

    return (<div ref={ref} style={{ backgroundColor: "#1b1a1a", width: size.width, height: size.height }} className="w-full relative flex" onMouseDown={handleMouseDown}>
        <div style={{ backgroundColor: "red", height: height + '%' }} className="w-full  absolute bottom-0">

        </div>
    </div>
    );
};

export default Slider;
