import React, { useMemo, useEffect, useState, useRef, useCallback } from "react";
import MatrixInnerCell from "./MatrixInnerCell";
import { Position } from "./Matrix";
import { ObjectNode } from "@/lib/nodes/types";
import { useValue } from "@/contexts/ValueContext";

const MatrixCell: React.FC<{
  selectedField: string;
  min: number;
  unit: string;
  isDisabled: boolean;
  showValue: boolean;
  ux: string;
  fillColor: string;
  max: number;
  cornerRadius: string;
  width: number;
  height: number;
  toggle: (row: number, col: number, value?: number) => void;
  type: string;
  lockedMode: boolean;
  objectNode: ObjectNode;
  idx: number;
  _idx: number;
  row: number;
  col: number;
  editing: React.MutableRefObject<Position | null>;
}> = ({
  idx,
  row,
  col,
  selectedField,
  editing,
  objectNode,
  isDisabled,
  unit,
  lockedMode,
  showValue,
  type,
  toggle,
  cornerRadius,
  width,
  height,
  max,
  fillColor,
  ux,
  min,
  _idx,
}) => {
  const [isSelected, setIsSelected] = useState<boolean>(false);
  useValue();

  const valueRef = useRef(0);
  const ref = useRef<HTMLDivElement>(null);
  const ref1 = useRef<HTMLDivElement>(null);

  // Memoize these calculations
  const isLine = ux === "line";
  const isFullRadius = cornerRadius === "full";

  // Handle selection state
  useEffect(() => {
    if (objectNode.saveData !== undefined) {
      setIsSelected((objectNode.saveData as number) === _idx);
    }
  }, [objectNode.saveData, _idx]);

  // Handle className updates
  useEffect(() => {
    if (ref1.current) {
      ref1.current.className = `${
        isLine ? "absolute w-full" : isFullRadius ? "m-auto" : "absolute bottom-0 w-full"
      } rounded-${cornerRadius}`;
    }
  }, [isLine, isFullRadius, cornerRadius]);

  // Memoize event handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!lockedMode) return;

      e.stopPropagation();
      if (
        !objectNode.attributes.toggle &&
        (type === "float" || type === "uint8" || type === "object")
      ) {
        const rect = ref.current?.getBoundingClientRect();
        if (!rect) return;

        const startY = e.clientY - rect.top;
        editing.current = {
          x: col,
          y: row,
          value: valueRef.current,
          startY,
        };
      } else {
        toggle(row, col);
      }
    },
    [lockedMode, objectNode.attributes.toggle, type, col, row, toggle],
  );

  const handleMouseOver = useCallback(
    (e: React.MouseEvent) => {
      if (!editing.current || (editing.current.x === col && editing.current.y === row)) return;

      if (
        !objectNode.attributes.toggle &&
        (type === "float" || type === "uint8" || type === "object")
      ) {
        const rect = ref.current?.getBoundingClientRect();
        if (!rect) return;

        const startY = e.clientY - rect.top;
        if (editing.current.y === row) {
          const val = max * ((height - startY) / height);
          toggle(row, col, val);
          valueRef.current = val;
        }
        editing.current = {
          x: col,
          y: row,
          value: valueRef.current,
          startY,
        };
      }
    },
    [editing, col, row, height, max, toggle, objectNode.attributes.toggle, type],
  );

  // Memoize style object
  const style = useMemo(
    () => ({
      backgroundColor: isSelected ? "#fafafa42" : "",
      borderColor: isSelected ? "white" : "",
      width,
      minWidth: 10,
      minHeight: 10,
      margin: "2px",
      height,
    }),
    [isSelected, width, height],
  );

  // Memoize className
  const className = useMemo(
    () =>
      `${isDisabled ? "opacity-10 pointer-events-none" : ""} relative flex rounded-${cornerRadius} overflow-hidden border bg-black-clear2 border-zinc-800 cursor-pointer active:bg-zinc-800 active:border-zinc-100`,
    [isDisabled, cornerRadius],
  );

  return (
    <div
      ref={ref}
      onMouseDown={handleMouseDown}
      onMouseOver={handleMouseOver}
      onClick={lockedMode ? (e) => e.stopPropagation() : undefined}
      style={style}
      className={className}
    >
      <MatrixInnerCell
        ref1={ref1}
        min={min}
        objectNode={objectNode}
        selectedField={selectedField}
        isLine={isLine}
        idx={idx}
        valueRef={valueRef}
        unit={unit}
        isFullRadius={isFullRadius}
        cornerRadius={cornerRadius}
        max={max}
        showValue={showValue}
        fillColor={fillColor}
      />
    </div>
  );
};

export default React.memo(MatrixCell);
