import React, { useEffect, useRef, useState, useCallback } from "react";
import { TargetIcon, TriangleRightIcon } from "@radix-ui/react-icons";
import { usePatchSelector } from "@/hooks/usePatchSelector";

const NumberBox: React.FC<{
  lockedModeRef: React.MutableRefObject<boolean>;
  isParameter?: boolean;
  className?: string;
  isSelected: boolean;
  min: number;
  max: number;
  value: number;
  setValue: (x: number, e?: MouseEvent) => void;
  round: boolean;
}> = ({ isParameter, className, lockedModeRef, value, setValue, round, min, max, isSelected }) => {
  const ref = useRef<HTMLDivElement | null>(null);
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
    };
  }, [setEditing, editing, setValue, min, max]);

  const onMouseUp = useCallback(
    (e: MouseEvent) => {
      setEditing(false);
      keyMode.current = false;
    },
    [setEditing],
  );

  const keyMode = useRef(false);

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!editing) {
        return;
      }

      if (keyMode.current) {
        return;
      }

      const diff = mouseRef.current - e.pageY;
      let factor = rounding.current ? 10 : 100;
      let newValue = initValue.current + diff / factor;
      const pageHeight = document.body.clientHeight;
      const mouseDelta = e.pageY - mouseRef.current; // Difference from initial Y position
      const valueRange = max - min; // Total range of the value

      // Calculate the value change proportional to the mouse movement
      // Assuming moving the full height of the page covers the entire range
      factor = pageHeight - 15 - mouseRef.current;

      let _min = min;
      let _max = max;
      if (mouseDelta < 0) {
        factor = mouseRef.current * 1;
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

      newValue = Math.max(min, Math.min(newValue, max));
      setValue(newValue, e);
    },
    [editing, setValue, min, max],
  );

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (editing) {
        const num = Number.parseInt(e.key);
        const off = e.shiftKey ? 10 : 1;
        e.preventDefault();
        if (!Number.isNaN(num)) {
          setValue(num);
          keyMode.current = true;
        } else if (e.key === "ArrowUp") {
          setValue(value + off);
          keyMode.current = true;
        } else if (e.key === "ArrowDown") {
          setValue(value - off);
          keyMode.current = true;
        }
      }
    },
    [editing, setValue, value],
  );

  const { selectPatch } = usePatchSelector();
  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onKeyDown]);

  let integer: string | number = Math.trunc(value);
  let float = value - Math.trunc(value);
  float = Math.round(float * 1000) / 1000;
  if (value < 0 && value > -1) {
    integer = "-0";
  }
  return (
    <div ref={ref}>
      <div
        className={
          (className ? className : "m-y") +
          " bg-zinc-900 flex flex-1 active:bg-zinc-700 cursor-ns-resize"
        }
      >
        <TriangleRightIcon
          onMouseDown={(e: any) => {
            selectPatch();
            if (!lockedModeRef.current) {
              return;
            }
            e.stopPropagation();
            setEditing(true);
            mouseRef.current = e.pageY;
            initValue.current = value;
          }}
          className="w-5 h-5 mr-2 invert active:fill-red-500"
        />
        <div
          onMouseDown={(e: any) => {
            selectPatch();
            if (!lockedModeRef.current) {
              return;
            }
            e.stopPropagation();
            setEditing(true);
            mouseRef.current = e.pageY;
            initValue.current = value;
          }}
          className="flex-1 active:text-green-200 text-white mt-0.5 w-10 flex"
        >
          <div onMouseDown={() => (rounding.current = true)} className="">
            {integer}
          </div>
          <div className="">.</div>
          <div onMouseDown={() => (rounding.current = false)} className="flex-1">
            {float !== undefined
              ? value < 0
                ? float.toString().slice(3)
                : float.toString().slice(2)
              : ""}
          </div>
          {isParameter && <TargetIcon className="mr-1 w-2 h-2 my-auto" />}
        </div>
      </div>
    </div>
  );
};

export default NumberBox;
