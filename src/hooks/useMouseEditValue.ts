import React, { useRef, useCallback, useEffect, useState } from "react";

export const useMouseEditValue = (
  ref: React.MutableRefObject<HTMLDivElement | null>,
  value: number,
  setValue: (x: number) => void,
  min: number,
  max: number,
) => {
  const mouseRef = useRef<number>(0);
  const rounding = useRef<boolean>(false);
  const initValue = useRef<number>(0);
  const [editing, setEditing] = useState(false);

  const onMouseDown = useCallback(
    (e: any) => {
      e.preventDefault();
      if (e.metaKey) {
        return;
      }
      e.stopPropagation();
      setEditing(true);
      mouseRef.current = e.pageY;
      initValue.current = value;
    },
    [setEditing, value],
  );

  useEffect(() => {
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("mousemove", onMouseMove);
    return () => {
      window.removeEventListener("mousedown", onMouseUp);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, [setEditing, editing, setValue, min, max]);

  const onMouseUp = useCallback(
    (e: MouseEvent) => {
      setEditing(false);
    },
    [setEditing],
  );

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!editing) {
        return;
      }

      let diff = mouseRef.current - e.pageY;
      let factor = rounding.current ? 10 : 100;
      let newValue = initValue.current + diff / factor;
      if (true) {
        const pageHeight = document.body.clientHeight;
        const mouseDelta = e.pageY - mouseRef.current; // Difference from initial Y position
        const valueRange = max - min; // Total range of the value

        // Calculate the value change proportional to the mouse movement
        // Assuming moving the full height of the page covers the entire range
        let factor = pageHeight - 15 - mouseRef.current;
        factor /= 4;

        let _min = min;
        let _max = max;
        if (mouseDelta < 0) {
          factor = mouseRef.current;
          factor /= 4;
          _min = initValue.current;
        } else {
          _max = initValue.current;
        }
        let valueChange = (mouseDelta / factor) * (_max - _min);
        // Calculate new value based on initial value and the proportional change
        newValue = initValue.current - valueChange; // Subtract because screen Y is inverted
        // Clamp newValue to the min and max range
        if (rounding.current) {
          newValue = Math.round(newValue);
        }
      }
      newValue = Math.max(min, Math.min(newValue, max));
      setValue(newValue);
    },
    [editing, setValue, min, max],
  );

  return { onMouseDown };
};
