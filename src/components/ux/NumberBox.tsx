import React, { useEffect, useRef, useState, useCallback } from 'react';
import { TriangleRightIcon } from '@radix-ui/react-icons'


const NumberBox: React.FC<{
    lockedModeRef: React.MutableRefObject<boolean>,
    className?: string,
    isSelected: boolean,
    min: number, max: number, value: number, setValue: (x: number) => void, round: boolean
}> = ({
    className,
    lockedModeRef,
    value,
    setValue,
    round,
    min,
    max,
    isSelected
}) => {
        let ref = useRef<HTMLDivElement | null>(null);
        const [editing, setEditing] = useState(false);
        const mouseRef = useRef<number>(0);
        const rounding = useRef<boolean>(true);
        const initValue = useRef<number>(0);

        useEffect(() => {
            window.addEventListener("mouseup", onMouseUp);
            window.addEventListener("mousemove", onMouseMove);
            return () => {
                window.removeEventListener("mousedown", onMouseUp);
                window.removeEventListener("mousemove", onMouseMove);
            }
        }, [setEditing, editing, setValue, min, max]);

        const onMouseUp = useCallback((e: MouseEvent) => {
            setEditing(false);
        }, [setEditing]);

        const onMouseMove = useCallback((e: MouseEvent) => {
            if (!editing) {
                return;
            }

            let diff = mouseRef.current - e.pageY;
            let factor = rounding.current ? 10 : 100;
            let newValue = initValue.current + (diff / factor);
            if (true) {
                const pageHeight = document.body.clientHeight;
                const mouseDelta = e.pageY - mouseRef.current; // Difference from initial Y position
                const valueRange = max - min; // Total range of the value

                // Calculate the value change proportional to the mouse movement
                // Assuming moving the full height of the page covers the entire range
                let factor = (pageHeight - 15) - mouseRef.current;

                let _min = min;
                let _max = max;
                if (mouseDelta < 0) {
                    factor = mouseRef.current;
                    _min = initValue.current;
                } else {
                    _max = initValue.current;
                }
                let valueChange = (mouseDelta / (factor)) * ((_max - _min));
                // Calculate new value based on initial value and the proportional change
                newValue = initValue.current - valueChange; // Subtract because screen Y is inverted
                // Clamp newValue to the min and max range
                if (rounding.current) {
                    newValue = Math.round(newValue);
                }
            }
            newValue = Math.max(min, Math.min(newValue, max));
            setValue(newValue);
        }, [editing, setValue, min, max]);

        let integer = Math.floor(value);
        let float = value - Math.floor(value);
        float = Math.round(float * 1000) / 1000;
        return (
            <div ref={ref}>
                <div
                    className={(className ? className : "m-1") + " bg-black flex flex-1"}>
                    <TriangleRightIcon
                        onMouseDown={(e: any) => {
                            if (!lockedModeRef.current) {
                                return;
                            }
                            if (e.metaKey) {
                                return;
                            }
                            e.stopPropagation();
                            setEditing(true);
                            mouseRef.current = e.pageY;
                            initValue.current = value;
                        }}

                        className="w-5 h-5 mr-2 invert" />
                    <div
                        onMouseDown={(e: any) => {
                            if (!lockedModeRef.current) {
                                return;
                            }
                            if (e.metaKey) {
                                return;
                            }
                            e.stopPropagation();
                            setEditing(true);
                            mouseRef.current = e.pageY;
                            initValue.current = value;
                        }}

                        className="flex-1 text-white mt-0.5 w-10 flex">
                        <div
                            onMouseDown={() => rounding.current = true}
                            className="">
                            {integer}
                        </div>
                        <div className="">
                            .
                        </div>
                        <div
                            onMouseDown={() => rounding.current = false}
                            className="flex-1">
                            {float !== undefined ? float.toString().slice(2) : ""}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

export default NumberBox;
