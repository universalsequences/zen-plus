import React, { useEffect, useCallback, useState } from 'react';
import { useLocked } from '@/contexts/LockedContext';
import { useValue } from '@/contexts/ValueContext';
import { ObjectNode } from '@/lib/nodes/types';
import { SketchPicker } from 'react-color'

const Color: React.FC<{ objectNode: ObjectNode }> = ({ objectNode }) => {
    let [opened, setOpened] = useState(false);
    let { lockedMode } = useLocked();

    const onChange = useCallback((hex: string) => {
        objectNode.receive(objectNode.inlets[0], hex);
    }, []);

    let { value } = useValue();

    useEffect(() => {
        if (!lockedMode) {
            setOpened(false);
        }
    }, [lockedMode, setOpened]);

    if (!value && objectNode.custom) {
        value = (objectNode.custom as any).value as string;
    }

    return <div onMouseDown={(e: any) => {
        if (lockedMode) {
            e.stopPropagation();
        }
    }}
        onClick={(e: any) => {
            if (lockedMode) {
                e.stopPropagation();
            }
        }}>
        <div
            onClick={() => {
                if (lockedMode) {
                    setOpened(!opened);
                }
            }}

            style={{ backgroundColor: (value as string) || "#000000" }} className="w-8 h-8 cursor-pointer" />
        {opened && <div className="absolute top-6 -left-40"><SketchPicker color={(value as string) || "#000000"} onChange={(c: any) => onChange(c.hex)} /> </div>}

    </div >;
};

export default Color;
